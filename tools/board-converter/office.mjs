// Validate before passing a document to LibreOffice. No archive entries are extracted here.
export function validateOffice(bytes, ext) {
  if (
    !Buffer.isBuffer(bytes) ||
    !bytes.length ||
    bytes.length > 20 * 1024 * 1024 ||
    !["doc", "docx", "ppt", "pptx"].includes(ext)
  )
    throw new Error("invalid-file");
  if (!ext.endsWith("x")) {
    if (
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
    )
      throw new Error("invalid-file");
    return;
  }
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (bytes.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (
    eocd < 0 ||
    bytes.readUInt16LE(eocd + 4) !== 0 ||
    bytes.readUInt16LE(eocd + 6) !== 0
  )
    throw new Error("invalid-archive");
  const count = bytes.readUInt16LE(eocd + 10);
  let offset = bytes.readUInt32LE(eocd + 16);
  let expanded = 0;
  const names = [];
  if (count > 4000 || count < 1) throw new Error("archive-too-large");
  for (let n = 0; n < count; n++) {
    if (offset + 46 > eocd || bytes.readUInt32LE(offset) !== 0x02014b50)
      throw new Error("invalid-archive");
    const size = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extra = bytes.readUInt16LE(offset + 30);
    const comment = bytes.readUInt16LE(offset + 32);
    if (
      offset + 46 + nameLength + extra + comment > eocd ||
      bytes.readUInt16LE(offset + 8) & 1
    )
      throw new Error("invalid-archive");
    const name = bytes.toString("utf8", offset + 46, offset + 46 + nameLength);
    if (
      name.startsWith("/") ||
      /(^|[\\/])\.\.([\\/]|$)/.test(name) ||
      /vbaProject|activeX\/|embeddings\//i.test(name)
    )
      throw new Error("embedded-content-not-supported");
    expanded += size;
    if (expanded > 100 * 1024 * 1024 || size > 40 * 1024 * 1024)
      throw new Error("archive-too-large");
    names.push(name);
    offset += 46 + nameLength + extra + comment;
  }
  if (
    !names.includes("[Content_Types].xml") ||
    !names.includes(
      ext === "docx" ? "word/document.xml" : "ppt/presentation.xml",
    )
  )
    throw new Error("invalid-file");
}
