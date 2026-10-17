"use client";
import {
  textDirection,
  type BoardDocument,
  type BoardElement,
  type BoardPage,
} from "./model";
import type { BoardAssets } from "./repository";
export type ExportFormat = "pdf" | "pptx" | "docx";
const family = () =>
  `${getComputedStyle(document.documentElement).getPropertyValue("--font-open-sans") || "Arial"}, ${getComputedStyle(document.documentElement).getPropertyValue("--font-arabic") || "Arial"}, sans-serif`;
function paint(ctx: CanvasRenderingContext2D, e: BoardElement) {
  const [a, b = a] = e.points;
  ctx.save();
  ctx.strokeStyle = e.color;
  ctx.fillStyle = e.color;
  ctx.lineWidth = e.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (e.kind === "highlight") ctx.globalAlpha = 0.28;
  ctx.beginPath();
  if (e.kind === "text") {
    const size = e.fontSize ?? 28;
    ctx.font = `${size}px ${family()}`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    for (const [i, line] of (e.text ?? "").split("\n").entries()) {
      ctx.direction = textDirection(line);
      ctx.fillText(line, a[0], a[1] + size * (i * 1.5 + 0.9));
    }
  } else if (e.kind === "rectangle")
    ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  else if (e.kind === "ellipse") {
    ctx.ellipse(
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
      Math.max(0.1, Math.abs(b[0] - a[0]) / 2),
      Math.max(0.1, Math.abs(b[1] - a[1]) / 2),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  } else {
    ctx.moveTo(...a);
    for (const p of e.points.slice(1)) ctx.lineTo(...p);
    if (e.points.length === 1) ctx.lineTo(a[0] + 0.1, a[1] + 0.1);
    if (e.kind === "arrow") {
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const length = Math.max(14, e.width * 4);
      ctx.moveTo(
        b[0] - length * Math.cos(angle - 0.5),
        b[1] - length * Math.sin(angle - 0.5),
      );
      ctx.lineTo(...b);
      ctx.lineTo(
        b[0] - length * Math.cos(angle + 0.5),
        b[1] - length * Math.sin(angle + 0.5),
      );
    }
    ctx.stroke();
  }
  ctx.restore();
}
export async function renderPage(page: BoardPage, assets: BoardAssets) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  const scale = Math.min(2, 2400 / Math.max(page.width, page.height));
  canvas.width = Math.round(page.width * scale);
  canvas.height = Math.round(page.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, page.width, page.height);
  if (page.background) {
    const image = await createImageBitmap(await assets.get(page.background));
    ctx.drawImage(image, 0, 0, page.width, page.height);
    image.close();
  }
  page.elements.forEach((e) => paint(ctx, e));
  return canvas;
}
export async function exportBoard(
  board: BoardDocument,
  assets: BoardAssets,
  format: ExportFormat,
  progress: (done: number, total: number) => void,
): Promise<File> {
  const filename =
    (board.title
      .trim()
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, "-")
      .slice(0, 90) || "Karrini") + `.${format}`;
  progress(0, board.pages.length);
  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const first = board.pages[0];
    const pdf = new jsPDF({
      orientation: first.width >= first.height ? "landscape" : "portrait",
      unit: "pt",
      format: [first.width, first.height],
      compress: true,
    });
    pdf.setProperties({ title: board.title, creator: "Karrini" });
    for (const [i, p] of board.pages.entries()) {
      if (i)
        pdf.addPage(
          [p.width, p.height],
          p.width >= p.height ? "landscape" : "portrait",
        );
      const canvas = await renderPage(p, assets);
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.92),
        "JPEG",
        0,
        0,
        p.width,
        p.height,
      );
      canvas.width = 0;
      progress(i + 1, board.pages.length);
    }
    return new File([pdf.output("blob")], filename, {
      type: "application/pdf",
    });
  }
  if (format === "pptx") {
    const { default: PptxGenJS } = await import("pptxgenjs");
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.title = board.title;
    pptx.author = "Karrini";
    for (const [i, p] of board.pages.entries()) {
      const canvas = await renderPage(p, assets);
      const ratio = Math.min(13.333333 / p.width, 7.5 / p.height);
      const w = p.width * ratio;
      const h = p.height * ratio;
      pptx
        .addSlide()
        .addImage({
          data: canvas.toDataURL("image/png"),
          x: (13.333333 - w) / 2,
          y: (7.5 - h) / 2,
          w,
          h,
        });
      canvas.width = 0;
      progress(i + 1, board.pages.length);
    }
    const blob = (await pptx.write({ outputType: "blob" })) as Blob;
    return new File([blob], filename, {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
  }
  const { Document, Packer, Paragraph, ImageRun, AlignmentType } =
    await import("docx");
  const sections = [];
  for (const [i, p] of board.pages.entries()) {
    const canvas = await renderPage(p, assets);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png"),
    );
    const scale = Math.min(720 / p.width, 930 / p.height);
    sections.push({
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: "png",
              data: new Uint8Array(await blob.arrayBuffer()),
              transformation: {
                width: p.width * scale,
                height: p.height * scale,
              },
              altText: {
                title: board.title,
                description: `Page ${i + 1}`,
                name: `Page ${i + 1}`,
              },
            }),
          ],
        }),
      ],
    });
    canvas.width = 0;
    progress(i + 1, board.pages.length);
  }
  return new File(
    [
      await Packer.toBlob(
        new Document({ title: board.title, creator: "Karrini", sections }),
      ),
    ],
    filename,
    {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  );
}
export function downloadBoard(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
