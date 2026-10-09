# 求职 AI V1 架构

## 产品主链路

```text
资料上传 → Career Profile → 目标岗位/JD → 岗位匹配
      → 针对性笔试 → 薄弱项 → AI 面试 → 面试复盘 → 下一轮训练
```

## 分层

```text
Web / Desktop / Mobile / Tablet
            │
      React + TypeScript
            │
        API Client
            │
         FastAPI
   ┌────────┼──────────┐
Career   Assessment  Interview
Engine     Engine       Engine
   └────────┼──────────┘
        AI Provider
   Mock / OpenAI-compatible
            │
  DeepSeek / Qwen / Doubao
```

### 客户端

根目录是统一 React 客户端。当前浏览器即可运行；`src-tauri` 用于 Windows、macOS、Linux、iOS 和 Android 壳。响应式布局覆盖桌面、平板和手机。

### 服务端

`server/app/main.py` 暴露稳定 API：

- `/api/v1/profile`：资料 → Career Profile
- `/api/v1/jobs/match`：画像 + JD → 匹配报告
- `/api/v1/assessments`：生成针对性笔试
- `/api/v1/assessments/grade`：评分、薄弱项与训练建议
- `/api/v1/interviews`：创建针对性面试
- `/api/v1/interviews/turn`：根据上一轮回答动态追问
- `/api/v1/interviews/report`：生成面试复盘
- `/api/v1/dashboard`：训练数据摘要

### AI Provider

默认 `mock`，无 API Key 也能完整演示。生产环境通过 OpenAI-compatible Provider 接入任意兼容模型。业务层不感知模型厂商。

### 数据

V1 默认 SQLite JSON Repository，便于零配置运行。Repository 接口与领域逻辑解耦；生产阶段替换 PostgreSQL + pgvector，不需要改页面和业务 API。

### 语音

V1 面试核心对象已经是独立 `InterviewSession`。ASR/TTS/LiveKit 后续只负责将“语音 ↔ 文本”接到 `/interviews/turn`，不进入面试业务层，因此可独立切换供应商。

## 生产演进

1. Auth：手机号/邮箱/OAuth + JWT/Session。
2. PostgreSQL + pgvector：用户画像、资料、题库、向量检索。
3. Redis：实时会话、限流、队列。
4. 对象存储：OSS/COS/S3 保存原始资料。
5. Docling 文档服务：复杂 PDF/Word/PPT/表格解析。
6. LiveKit + 云 ASR/TTS：实时语音面试。
7. Langfuse：模型日志、Prompt 版本、成本和质量评测。
8. Judge0：代码笔试沙箱。
