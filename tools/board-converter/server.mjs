import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { validateOffice } from "./office.mjs";

const secret = process.env.BOARD_CONVERTER_SECRET;
if (!secret || secret.length < 32)
  throw new Error(
    "Set BOARD_CONVERTER_SECRET to a random value of at least 32 characters.",
  );
let active = false;
const respond = (res, status, message) => {
  res.writeHead(status, {
    "Content-Type": "text/plain",
    "Cache-Control": "no-store",
  });
  res.end(message);
};
http
  .createServer(
    { requestTimeout: 20000, headersTimeout: 10000 },
    async (req, res) => {
      if (req.method === "GET" && req.url === "/health")
        return respond(res, 200, "ok");
      const received = Buffer.from(req.headers.authorization ?? "");
      const expected = Buffer.from(`Bearer ${secret}`);
      if (
        received.length !== expected.length ||
        !timingSafeEqual(received, expected)
      )
        return respond(res, 401, "unauthorized");
      if (req.method !== "POST" || req.url !== "/convert")
        return respond(res, 404, "not-found");
      if (active) return respond(res, 429, "converter-busy");
      active = true;
      let directory;
      try {
        const chunks = [];
        let length = 0;
        for await (const chunk of req) {
          length += chunk.length;
          if (length > 20 * 1024 * 1024) {
            respond(res, 413, "file-too-large");
            return;
          }
          chunks.push(chunk);
        }
        const bytes = Buffer.concat(chunks);
        const ext = String(req.headers["x-document-extension"] ?? "");
        validateOffice(bytes, ext);
        directory = await mkdtemp(path.join(tmpdir(), "karrini-board-"));
        const profile = path.join(directory, "profile");
        await mkdir(path.join(profile, "user"), { recursive: true });
        await writeFile(
          path.join(profile, "user", "registrymodifications.xcu"),
          `<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item><item oor:path="/org.openoffice.Office.Writer/Content/Update"><prop oor:name="Link" oor:op="fuse"><value>0</value></prop></item></oor:items>`,
        );
        const input = path.join(directory, `lesson.${ext}`);
        await writeFile(input, bytes);
        await new Promise((resolve, reject) => {
          const process = spawn(
            "/usr/lib/libreoffice/program/soffice.bin",
            [
              `-env:UserInstallation=${pathToFileURL(profile).href}`,
              "--headless",
              "--nologo",
              "--nodefault",
              "--norestore",
              "--convert-to",
              "pdf",
              "--outdir",
              directory,
              input,
            ],
            {
              stdio: "ignore",
              detached: true,
              env: {
                PATH: "/usr/bin:/bin",
                LANG: "C.UTF-8",
                HOME: directory,
                TMPDIR: directory,
              },
            },
          );
          const kill = () => {
            try {
              globalThis.process.kill(-process.pid, "SIGKILL");
            } catch {
              /* Already exited. */
            }
          };
          const timeout = setTimeout(() => {
            kill();
            reject(new Error("conversion-timeout"));
          }, 60000);
          process.once("error", (e) => {
            clearTimeout(timeout);
            reject(e);
          });
          process.once("exit", (code) => {
            clearTimeout(timeout);
            kill();
            if (code === 0) resolve();
            else reject(new Error("conversion-failed"));
          });
        });
        const output = path.join(directory, "lesson.pdf");
        if ((await stat(output)).size > 64 * 1024 * 1024)
          throw new Error("output-too-large");
        const pdf = await readFile(output);
        if (!pdf.subarray(0, 5).equals(Buffer.from("%PDF-")))
          throw new Error("conversion-failed");
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Cache-Control": "no-store",
          "Content-Length": pdf.length,
        });
        res.end(pdf);
      } catch {
        if (!res.headersSent) respond(res, 422, "conversion-failed");
      } finally {
        if (directory) await rm(directory, { recursive: true, force: true });
        active = false;
      }
    },
  )
  .listen(Number(process.env.PORT ?? 8080), "0.0.0.0");
