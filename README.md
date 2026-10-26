# R2 Gallery

基于 Cloudflare 边缘计算与存储生态（Workers + D1 + R2）构建的高性能现代化数字画廊与展示系统。

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%7C%20D1%20%7C%20R2-f38020.svg)](https://workers.cloudflare.com/)

---

## 项目简介

**R2 Gallery** 是一款专为高效分发与轻量浏览而设计的现代化 Web 画廊应用。项目全面采用 Serverless 全栈架构，依托 Cloudflare Workers 边缘计算、D1 关系型数据库以及 R2 对象存储，实现超低延迟的资源流式响应、零冷启动体验与极低的运维成本。

## 核心特性

- **⚡ 全边缘化架构**：服务端基于 [Hono](https://hono.dev/) 构建并运行于 Cloudflare Workers，资产存储与直链分发由 Cloudflare R2 强力驱动。
- **📜 高性能虚拟列表**：集成 [@tanstack/react-virtual](https://tanstack.com/virtual)，海量内容亦能平滑实现无限滚动加载，杜绝前端内存膨胀与卡顿。
- **📱 响应式双端交互**：
  - **桌面端**：极简网格视图，提供支持键盘快捷键与点击背景退出的 Lightbox 预览模式。
  - **移动端**：专为触控优化的竖屏全屏滑动流，内置针对常见内置浏览器的自适应引导体验。
- **🔑 轻量凭据与会话管理**：基于安全 HttpOnly Cookie 与 D1 数据库，提供无感验证体验与多设备并发限制保护。
- **🔖 收藏与状态同步**：前端支持乐观更新（Optimistic UI），标记状态毫秒级反馈，并在服务端可靠持久化。

## 技术栈

- **前端技术**：[React 19](https://react.dev/)、[Vite](https://vitejs.dev/)、[Tailwind CSS v4](https://tailwindcss.com/)、[Lucide React](https://lucide.dev/)
- **后端 / 边缘端**：[Cloudflare Workers](https://workers.cloudflare.com/)、[Hono](https://hono.dev/)
- **存储与数据库**：[Cloudflare R2](https://developers.cloudflare.com/r2/)（对象存储）、[Cloudflare D1](https://developers.cloudflare.com/d1/)（Serverless SQLite）
- **测试框架**：[Vitest](https://vitest.dev/)、React Testing Library

## 快速开始

### 前置环境

- [Node.js](https://nodejs.org/)（推荐 v20 或更高版本）
- [pnpm](https://pnpm.io/)（`>= 10`）
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### 本地安装

```bash
git clone https://github.com/yyscj8/r2-gallery.git
cd r2-gallery
pnpm install
```

### 本地开发

1. 初始化并填充本地 D1 数据库：
   ```bash
   pnpm db:seed
   ```

2. 启动前端开发调试服务器：
   ```bash
   pnpm dev
   ```

3. （可选）启动本地 Cloudflare Worker 模拟环境：
   ```bash
   pnpm worker:dev
   ```

### 运行测试

```bash
# 运行单元测试与交互组件测试
pnpm test

# 执行 TypeScript 静态类型检查
pnpm typecheck
```

### 构建与部署

```bash
# 构建前端生产包至 dist/
pnpm build

# 部署至 Cloudflare 生产环境
pnpm wrangler deploy
```

## 开源协议

本项目基于 [CC BY-NC 4.0 (知识共享署名-非商业性使用 4.0 国际许可协议)](LICENSE) 发布。
- **允许**：个人学习、技术研究、非商业环境下的自由使用与二次修改。
- **禁止**：任何形式的商业盈利使用、闭源转售或商业化运营。
