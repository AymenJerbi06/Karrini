"""Inspect only the three Board QA test downloads; save their page images locally for visual QA."""
import sys
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
from io import BytesIO
from PIL import Image
from pypdf import PdfReader

source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads"
out = Path(".board-qa")
out.mkdir(exist_ok=True)
pdf = PdfReader(source / "Board QA.pdf")
assert len(pdf.pages) == 2
for i, page in enumerate(pdf.pages):
    image = page.images[0].image.convert("RGB")
    assert image.width >= 1280 and image.getextrema()[0][0] < 100
    image.save(out / f"pdf-{i + 1}.png")

with ZipFile(source / "Board QA.pptx") as z:
    assert z.testzip() is None
    slides = [n for n in z.namelist() if __import__("re").fullmatch(r"ppt/slides/slide\d+\.xml", n)]
    assert len(slides) == 2
    media = [n for n in z.namelist() if n.startswith("ppt/media/") and n.endswith(".png")]
    assert len(media) == 2
    for i, name in enumerate(media):
        image = Image.open(BytesIO(z.read(name))).convert("RGB")
        assert image.getextrema()[0][0] < 100
        image.save(out / f"pptx-{i + 1}.png")

with ZipFile(source / "Board QA.docx") as z:
    assert z.testzip() is None
    root = ET.fromstring(z.read("word/document.xml"))
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "a": "http://schemas.openxmlformats.org/drawingml/2006/main"}
    assert len(root.findall(".//w:sectPr", ns)) == 2
    assert len(root.findall(".//a:blip", ns)) == 2
    media = [n for n in z.namelist() if n.startswith("word/media/") and n.endswith(".png")]
    assert len(media) == 2
    for i, name in enumerate(media):
        image = Image.open(BytesIO(z.read(name))).convert("RGB")
        assert image.getextrema()[0][0] < 100
        image.save(out / f"docx-{i + 1}.png")
print("Passed PDF/PPTX/DOCX downloads: two pages/slides/sections, valid Office archives and rendered annotation images.")
