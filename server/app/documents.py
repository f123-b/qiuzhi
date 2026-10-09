from __future__ import annotations

from io import BytesIO
from pathlib import Path

from docx import Document
from fastapi import UploadFile
from pypdf import PdfReader


async def extract_upload_text(file: UploadFile) -> str:
    data = await file.read()
    suffix = Path(file.filename or "").suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(BytesIO(data))
        return "\n\n".join((page.extract_text() or "").strip() for page in reader.pages).strip()
    if suffix == ".docx":
        document = Document(BytesIO(data))
        return "\n".join(p.text.strip() for p in document.paragraphs if p.text.strip())
    if suffix in {".txt", ".md", ".csv"}:
        for encoding in ("utf-8", "utf-8-sig", "gb18030"):
            try:
                return data.decode(encoding).strip()
            except UnicodeDecodeError:
                continue
    raise ValueError("支持 PDF、DOCX、TXT、MD、CSV；复杂扫描件建议接入 Docling/OCR 服务。")


def infer_material_kind(filename: str) -> str:
    lower = filename.lower()
    if any(x in lower for x in ["resume", "cv", "简历"]):
        return "resume"
    if any(x in lower for x in ["project", "项目"]):
        return "project"
    if any(x in lower for x in ["certificate", "证书"]):
        return "certificate"
    if any(x in lower for x in ["portfolio", "作品"]):
        return "portfolio"
    return "other"
