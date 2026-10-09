# 求职 AI

一个围绕 **Career Profile（职业画像）** 构建的多端 AI 求职工作台。

## V1 已实现主链路

```text
上传简历 / 项目资料
        ↓
Career Profile
        ↓
目标岗位 + JD
        ↓
岗位匹配与能力缺口
        ↓
针对性笔试
        ↓
薄弱项
        ↓
AI 模拟面试 / 动态追问
        ↓
面试复盘
        ↓
下一轮训练建议
```

### 功能

- PDF / DOCX / TXT / MD / CSV 资料解析。
- Career Profile：技能、项目证据、优势、风险。
- JD 技能抽取、岗位匹配、缺口建议。
- 针对性笔试生成与自动评分。
- 基于画像、JD 和笔试结果的动态 AI 面试。
- 面试复盘：专业能力、项目理解、表达结构、岗位匹配。
- Web / PWA / Tauri 桌面与移动壳共用一套 React 业务代码。
- 后端不可用时自动回退本地规则引擎，可零配置演示。
- OpenAI-compatible AI Provider，可切换 DeepSeek、Qwen、豆包等兼容接口。

## Web 本地运行

```bash
npm install
npm run dev
```

默认页面：`http://localhost:5173`

## API 本地运行

```bash
cd server
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

默认 API：`http://localhost:8000`

不配置 Key 时 API 使用 `mock`，产品仍可完整演示。

## 接入真实 LLM

复制 `server/.env.example` 并配置环境变量：

```bash
QIUZHI_AI_PROVIDER=compatible
QIUZHI_AI_BASE_URL=https://api.deepseek.com
QIUZHI_AI_API_KEY=your-key
QIUZHI_AI_MODEL=deepseek-chat
```

任何 OpenAI Chat Completions 兼容服务都可以通过这一层接入。

## Docker

```bash
docker compose up --build
```

生产基础设施（PostgreSQL + pgvector / Redis）已在 compose 中用 `production` profile 预留。

## Desktop / Mobile

项目包含 Tauri 2 壳：

```bash
npm run desktop:dev
```

移动端可继续使用 Tauri CLI 初始化 Android / iOS 工程，业务 UI 与 Web 共用。

## 文档

- `ARCHITECTURE.md`：系统架构与演进路径。
- `FEATURES.md`：功能与模块清单。

> V1 目标是先形成完整训练闭环。账户体系、云对象存储、Judge0、LiveKit、云 ASR/TTS、Docling 和 pgvector 已按独立适配层预留，进入线上运营时接入。
