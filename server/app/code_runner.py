from __future__ import annotations

import os

import httpx

LANGUAGE_IDS = {
    "c": 50,
    "cpp": 54,
    "c++": 54,
    "java": 62,
    "python": 71,
    "python3": 71,
    "javascript": 63,
    "typescript": 74,
    "go": 60,
    "rust": 73,
}


async def run_code(language: str, source_code: str, stdin: str = "") -> dict:
    base_url = os.getenv("QIUZHI_JUDGE0_URL", "").rstrip("/")
    token = os.getenv("QIUZHI_JUDGE0_TOKEN", "")
    language_id = LANGUAGE_IDS.get(language.lower())
    if not language_id:
        return {"configured": bool(base_url), "status": "unsupported", "error": f"暂不支持语言：{language}"}
    if not base_url:
        return {
            "configured": False,
            "status": "not_configured",
            "error": "未配置 QIUZHI_JUDGE0_URL。为安全起见，服务端不会直接执行用户代码。",
        }

    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Auth-Token"] = token
    payload = {"language_id": language_id, "source_code": source_code, "stdin": stdin}
    url = f"{base_url}/submissions?base64_encoded=false&wait=true"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
    return {
        "configured": True,
        "status": (data.get("status") or {}).get("description", "Unknown"),
        "stdout": data.get("stdout") or "",
        "stderr": data.get("stderr") or "",
        "compile_output": data.get("compile_output") or "",
        "time": data.get("time"),
        "memory": data.get("memory"),
    }
