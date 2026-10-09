from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .code_runner import run_code
from .documents import extract_upload_text, infer_material_kind
from .schemas import Material

router = APIRouter(prefix="/api/v1", tags=["extensions"])


class CodeRunRequest(BaseModel):
    language: str = Field(default="cpp", max_length=32)
    source_code: str = Field(min_length=1, max_length=100_000)
    stdin: str = Field(default="", max_length=50_000)


@router.post("/materials/parse", response_model=Material)
async def parse_material(file: UploadFile = File(...)):
    try:
        text = await extract_upload_text(file)
    except ValueError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    if not text.strip():
        raise HTTPException(status_code=422, detail="文档未提取到可用文字；扫描件请使用 OCR/Docling。")
    return Material(name=file.filename or "未命名资料", kind=infer_material_kind(file.filename or ""), text=text)


@router.post("/code/run")
async def code_run(request: CodeRunRequest):
    try:
        return await run_code(request.language, request.source_code, request.stdin)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"代码沙箱调用失败：{exc}") from exc
