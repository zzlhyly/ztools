# ztools

一个基于 [Tauri](https://tauri.app/)、[Vue 3](https://vuejs.org/) 和 [TypeScript](https://www.typescriptlang.org/) 构建的桌面应用程序。

## 技术栈

- **前端**：Vue 3 + TypeScript + Vite
- **后端**：Rust (Tauri)
- **构建工具**：Vite
- **包管理器**：npm

## 环境要求

在开始之前，请确保已安装以下软件：

- [Node.js](https://nodejs.org/)（v16 或更高版本）
- [npm](https://www.npmjs.com/)（v7 或更高版本）
- [Rust](https://www.rust-lang.org/tools/install)（最新稳定版）
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)（可选，但推荐）

## 安装

1. 克隆仓库：
   ```bash
   git clone https://github.com/your-username/ztools.git
   cd ztools
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

## 开发

启动开发服务器：

```bash
npm run tauri dev
```

这将：
- 启动 Vite 前端开发服务器
- 编译并运行 Tauri 后端
- 打开应用程序窗口

## 构建

构建生产版本：

```bash
npm run tauri build
```

构建后的应用程序位于 `src-tauri/target/release/bundle/` 目录中。

## 项目结构

```
ztools/
├── src/                  # 前端源代码
│   ├── App.vue           # 主 Vue 组件
│   ├── main.ts           # 入口文件
│   └── assets/           # 静态资源
├── src-tauri/            # Rust 后端代码
│   ├── src/              # Rust 源文件
│   │   ├── lib.rs        # 库代码
│   │   └── main.rs       # 主入口文件
│   ├── Cargo.toml        # Rust 依赖配置
│   └── tauri.conf.json   # Tauri 配置文件
├── public/               # 公共静态资源
├── package.json          # Node.js 依赖和脚本
├── vite.config.ts        # Vite 配置文件
├── tsconfig.json         # TypeScript 配置文件
└── LICENSE               # MIT 许可证
```

## 许可证

本项目基于 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。