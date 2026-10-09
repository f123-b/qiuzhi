# V1 功能实现清单

## 1. 总览 Dashboard

- 综合求职准备度。
- 当前岗位匹配分。
- 笔试成绩。
- 面试成绩。
- 已识别技能数量。
- 当前技能缺口。
- 下一轮训练任务。

## 2. 我的资料

- 上传 PDF / DOCX / TXT / MD / CSV。
- 文本粘贴。
- 简历、项目、证书、作品集类型标记。
- Career Profile 生成。
- 技能抽取。
- 项目证据提取。
- 优势与风险提示。

## 3. 目标岗位

- 岗位名称、公司、JD。
- JD 技能抽取。
- 匹配分。
- 已覆盖技能。
- 缺失技能。
- 岗位准备建议。

## 4. 笔试训练

- 根据缺失技能优先出题。
- 根据 JD 技能验证掌握深度。
- 简答 / 场景题模型。
- 关键词与回答完整度评分兜底。
- AI Provider 在线时可动态出题。
- 自动生成 strong / weak skills。

## 5. AI 面试

- Career Profile + JD + Match + Assessment 共同决定重点。
- 多轮 InterviewSession。
- 根据上一轮回答动态追问。
- 浏览器语音输入演示。
- 浏览器 TTS 朗读问题。
- 后续云 ASR/TTS 只需替换 IO，不改面试业务层。

## 6. 复盘成长

- 综合面试评分。
- 专业能力。
- 项目理解。
- 表达结构。
- 岗位匹配。
- 聚合 JD 缺口 + 笔试薄弱项 + 面试弱项。
- 自动生成下一轮训练计划。

## 7. 多端

- Web 响应式布局。
- PWA manifest / service worker。
- Tauri 2 desktop shell。
- Tauri 2 mobile-ready shell。
- 同一套 React / TypeScript 业务代码。

## 8. 后端

- FastAPI。
- AI Provider 抽象。
- OpenAI-compatible Provider。
- SQLite V1 持久化。
- Docker 镜像。
- PostgreSQL + pgvector / Redis production profile。

## 9. 后续生产适配器（接口已隔离）

- Auth：手机号 / 邮箱 / OAuth。
- Docling：复杂文档解析。
- S3 / OSS / COS：原始文件。
- Judge0：编程题沙箱。
- LiveKit：实时音频会话。
- 豆包 / 阿里 / 腾讯：ASR 和 TTS Provider。
- PostgreSQL + pgvector：长期画像与 RAG。
- Langfuse：Prompt、成本、延迟、质量监控。
