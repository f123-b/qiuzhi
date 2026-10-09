# 求职 AI（qiuzhi）

面向 Web / Desktop / Mobile / Tablet 的 AI 求职辅助产品。

## 第一阶段闭环

当前 MVP 聚焦一条完整链路：

1. 上传或粘贴简历/资料
2. 本地抽取 Career Profile（技能、经历、项目关键词）
3. 输入目标岗位与 JD
4. 生成岗位匹配度、覆盖技能与薄弱项
5. 根据画像与 JD 自动生成针对性笔试题
6. 完成答题后给出评分、错题和下一步训练建议

第一阶段默认不依赖任何云端 API Key，便于直接演示和验证产品闭环；后续会在保持 UI/数据结构不变的前提下接入 LLM、云 ASR、RAG 和持久化后端。

## 技术栈

- React + TypeScript
- Vite
- 浏览器本地状态（MVP）
- 可插拔 `CareerEngine` / AI Provider 接口（为后续 DeepSeek / Qwen / Doubao 接入预留）

## 开发

```bash
npm install
npm run dev
```

构建检查：

```bash
npm run build
```

## Roadmap

- Phase 1：简历 → JD 匹配 → 针对性笔试 → 评分建议
- Phase 2：AI 模拟面试与动态追问
- Phase 3：账号、云同步、长期 Career Profile、RAG
- Phase 4：Tauri 2 多端客户端与实时语音面试
