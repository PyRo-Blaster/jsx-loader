# JSX Loader 开发执行 Checklist

## 0. 文档基线确认
- [x] 已阅读设计规范：`docs/superpowers/specs/2026-04-24-jsx-loader-design.md`
- [x] 已阅读实施计划：`docs/superpowers/plans/2026-04-24-jsx-loader-implementation-plan.md`
- [x] 已输出本次执行 checklist 并建立逐步验收机制

## 1. 工程初始化与工具链
- [x] 初始化 React + Vite + TypeScript 项目骨架
- [x] 安装核心依赖：`@babel/standalone`、`localforage`、`framer-motion`、`lucide-react`
- [x] 配置 Tailwind（含全屏基础样式）
- [x] 配置测试工具（Vitest + jsdom + Testing Library）
- [x] 验收：`npm run build` 成功、`npm run test` 可执行

## 2. 核心能力开发（TDD）
- [x] 为 `compiler` 编写失败测试（RED）
- [x] 实现 `compiler` 让测试通过（GREEN）
- [x] 为 `runner` 编写失败测试（RED）
- [x] 实现 `runner` 让测试通过（GREEN）
- [x] 为 `store` 编写失败测试（RED）
- [x] 实现 `store` 让测试通过（GREEN）
- [x] 验收：核心服务测试全部通过

## 3. 前端 UI 与交互
- [x] 实现 `Stage` 全屏展示容器
- [x] 实现浅色主题悬浮 `HUD` 管理面板
- [x] 实现 `Dock` 折叠态与展开切换
- [x] 实现上传、加载、卸载、删除等交互
- [x] 实现错误可视化（编译错误 / 运行错误）
- [x] 验收：页面交互符合设计文档

## 4. Smoke Test（使用项目 JSX）
- [x] 使用 `purification_design.jsx` 上传测试
- [x] 成功加载并全屏渲染
- [x] 卸载后回到空舞台
- [x] 重新加载与切换流程正常
- [x] 验收：关键路径（上传->加载->卸载）完整可用

## 5. Docker Compose 部署
- [x] 编写 `nginx.conf`（支持 SPA fallback）
- [x] 编写 `Dockerfile`（multi-stage build）
- [x] 编写 `.dockerignore`
- [x] 编写 `docker-compose.yml`
- [x] 本机执行 `docker compose up -d --build` 验证启动
- [x] 验收：容器可访问、页面功能正常

## 6. 最终交付
- [x] 运行并记录：`npm run test`
- [x] 运行并记录：`npm run build`
- [x] 运行并记录：`docker compose ps`、`docker compose logs`
- [x] 提供交付总结（每一步完成状态 + 风险与后续建议）
