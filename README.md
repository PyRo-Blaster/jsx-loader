# JSX Loader

`JSX Loader` 是一个面向可视化 JSX 组件的轻量运行平台。它允许你在浏览器中上传、持久化、加载、卸载 `.jsx` 文件，并以全屏舞台的形式渲染组件内容。

当前版本：`0.2.0`

## 核心能力

- 上传并持久化 `.jsx` 资产，数据保存在浏览器 IndexedDB
- 一键加载 / 卸载 JSX 组件
- 全屏 Stage + 浅色悬浮 HUD 管理面板
- 浏览器端 Babel 编译 JSX
- 基于运行时白名单的模块加载
- 预检层 `preflight`，在编译前识别常见 import/export 风险
- Docker Compose 一键部署到 Linux 或本机 Docker 环境

## 版本更新

本次 `0.2.0` 版本重点增强了 JSX 加载的鲁棒性：

- 新增加载前预检，在编译与执行之前检查 `import` 模块、`default export` 和常见 React 导入模式
- 新增 warning-first 机制，确定会失败的文件直接阻断，高风险但可兼容的文件给出 warning 后继续加载
- 修复 React 组合导入兼容性，支持 `import React, { useState, useMemo } from 'react'`
- HUD 增加预检提示面板，加载前后都能看到清晰的风险提示
- 增加回归测试，覆盖 preflight、compiler、runner 三层行为

详细变更见 `CHANGELOG.md`。

## 支持范围

当前内置支持的运行时模块：

- `react`
- `recharts`

如果 JSX 文件导入了未注册模块，预检会直接阻断加载，并显示明确错误信息。运行时仍会再次校验，避免绕过预检后执行失败。

## 项目结构

```text
src/
  components/        HUD、Stage、ErrorBoundary
  context/           AppContext，负责资产管理与加载流程
  services/          compiler、runner、preflight、store、moduleRegistry
  utils/             通用工具，如资产 ID 生成
public/
  purification_design.jsx
docs/
  deployment-linux-docker-compose.md
  superpowers/specs/
  superpowers/plans/
```

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

默认开发地址通常为：

```text
http://localhost:5173/
```

### 3. 运行测试

```bash
npm test
```

### 4. 构建生产包

```bash
npm run build
```

## Docker Compose 启动

### 构建并启动

```bash
docker compose up -d --build
```

默认访问地址：

```text
http://localhost:8008/
```

### 查看状态

```bash
docker compose ps
```

### 查看日志

```bash
docker compose logs -f
```

### 停止服务

```bash
docker compose down
```

更完整的部署说明见 `docs/deployment-linux-docker-compose.md`。

## JSX 文件要求

建议上传的 JSX 文件满足以下约束：

- 使用 `export default` 导出 React 组件
- 优先使用当前已支持的模块
- 避免依赖未注册的第三方库
- 若使用 `import React, { ... } from 'react'`，当前版本已支持

示例文件：

- `purification_design.jsx`
- `gensc133_copd_vs_cld_comparison.jsx`
- `ProteinACaptureCalculator.jsx`

## 技术实现概览

- `compiler.ts`：将常见 ESM `import` 语法预处理为沙箱可执行的 `require(...)`
- `preflight.ts`：在编译前检查模块支持情况与导出模式
- `runner.ts`：通过 `new Function(...)` 在受控环境中执行已编译代码
- `moduleRegistry.ts`：维护运行时可用模块白名单
- `store.ts`：使用 `localforage` 持久化 JSX 资产

## 当前限制

- 仍然是白名单运行时模型，不会自动安装第三方依赖
- 对复杂动态 `import()` 与更高级模块系统语法尚未做完整支持
- `preflight` 是轻量静态分析，目标是提前发现常见错误，而不是完整编译器

## 后续建议

- 将运行时白名单改成可配置文件
- 为浏览器 smoke test 增加自动化用例
- 增加更多预检规则，例如动态导入和复杂 re-export 检测
