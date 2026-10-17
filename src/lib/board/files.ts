"use client";
import { supabase } from "@/lib/supabase/client";
import { MAX_PAGES, uuid, type BoardPage } from "./model";
import type { BoardAssets } from "./repository";

export const BOARD_ACCEPT = ".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.webp";
export async function importPages(
  file: File,
  assets: BoardAssets,
  remaining: number,
  progress: (done: number, total: number) => void,
): Promise<BoardPage[]> {
  if (!file.size || file.size > 20 * 1024 * 1024)
    throw new Error("Choose a file smaller than 20 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const store = async (canvas: HTMLCanvasElement): Promise<BoardPage> => {
    const id = uuid();
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(new Error("The page image could not be created.")),
        "image/png",
      ),
    );
    await assets.put(id, blob);
    return {
      id: uuid(),
      width: canvas.width,
      height: canvas.height,
      background: id,
      elements: [],
    };
  };
  if (["png", "jpg", "jpeg", "webp"].includes(extension ?? "")) {
    if (remaining < 1)
      throw new Error("The board is full. Export it before adding more pages.");
    const image = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(100, Math.round(image.width * scale));
      canvas.height = Math.max(100, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      progress(0, 1);
      const page = await store(canvas);
      progress(1, 1);
      return [page];
    } finally {
      image.close();
    }
  }
  let pdf: ArrayBuffer;
  if (extension === "pdf") pdf = await file.arrayBuffer();
  else if (["ppt", "pptx", "doc", "docx"].includes(extension ?? "")) {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sign in again to import an Office document.");
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/board/convert", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      signal: AbortSignal.timeout(95000),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (body.error === "converter-unavailable")
        throw new Error(
          "Office import is not configured yet. Save your document as PDF and import it here.",
        );
      throw new Error(
        "This document could not be converted. Try saving it as PDF first.",
      );
    }
    pdf = await response.arrayBuffer();
  } else throw new Error("Choose a PDF, PowerPoint, Word document or image.");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/board/pdfjs/pdf.worker.min.mjs";
  const loading = pdfjs.getDocument({
    data: pdf,
    cMapUrl: "/board/pdfjs/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/board/pdfjs/standard_fonts/",
    wasmUrl: "/board/pdfjs/wasm/",
    maxImageSize: 16000000,
  });
  let doc;
  try {
    doc = await loading.promise;
    if (doc.numPages > Math.min(MAX_PAGES, remaining))
      throw new Error(
        "This document has too many pages for the board. Import a smaller document.",
      );
    const result: BoardPage[] = [];
    progress(0, doc.numPages);
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const original = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({
        scale: Math.min(2, 1600 / Math.max(original.width, original.height)),
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(100, Math.round(viewport.width));
      canvas.height = Math.max(100, Math.round(viewport.height));
      await page.render({ canvas, viewport }).promise;
      result.push(await store(canvas));
      page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
      progress(n, doc.numPages);
    }
    return result;
  } finally {
    await loading.destroy();
  }
}
