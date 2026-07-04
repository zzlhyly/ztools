# ztools

一个面向开发者的桌面工具集应用，基于 [Tauri v2](https://tauri.app/)、[Vue 3](https://vuejs.org/) 和 [Element Plus](https://element-plus.org/) 构建。

[English](./README.md)

## 功能特性

- **JSON 格式化** - 格式化、压缩和验证 JSON 数据
- **XML 格式化** - 格式化和验证 XML 数据
- **Base64 编解码** - 支持 UTF-8 的 Base64 编码和解码
- **URL 编解码** - URL 编码和解码
- **时间戳转换** - 时间戳与日期时间互转
- **正则表达式测试** - 支持 g/i/m 标志的正则表达式测试
- **颜色转换** - HEX、RGB、HSL 颜色格式互转
- **哈希计算** - MD5、SHA-1、SHA-256、SHA-384、SHA-512、SHA3 哈希计算（文件哈希通过 Rust 后端流式处理）
- **AES 加解密** - AES 对称加密，支持 CBC/CTR/GCM 模式和多种填充方式
- **RSA 密钥生成** - 生成 RSA 公私钥对（1024/2048/4096 位）
- **RSA 加解密** - RSA 公钥加密、私钥解密、签名与验签
- **HMAC 计算** - HMAC 消息认证码计算（SHA-1/256/384/512）
- **UUID 生成** - 批量生成 UUID v4 标识符
- **M3U8 下载器** - 下载 M3U8 视频并转换为 MP4，支持 AES-128 解密

## 技术栈

- **前端**：Vue 3 + TypeScript + Element Plus
- **后端**：Rust (Tauri v2)
- **构建工具**：Vite 6
- **状态管理**：Pinia
- **国际化**：vue-i18n（中文/English）
- **测试**：Vitest + Rust 单元测试
- **代码检查/格式化**：vue-tsc（类型检查）+ Prettier（格式化）
- **CI**：GitHub Actions（格式检查 → 类型检查 → 测试 → 构建 + Rust 编译检查/测试）

## 环境要求

- [Node.js](https://nodejs.org/) v16+
- [npm](https://www.npmjs.com/) v7+
- [Rust](https://www.rust-lang.org/tools/install)（最新稳定版）
- [FFmpeg](https://ffmpeg.org/)（M3U8 下载器需要，需在 PATH 中或在应用内配置路径）

## 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/ztools.git
cd ztools

# 安装依赖
npm install
```

## 开发

```bash
# 启动开发服务器
npm run tauri dev

# 运行测试（监听模式）
npm run test

# 运行测试（单次）
npm run test:run

# 运行测试并生成覆盖率报告
npm run test:coverage

# 格式化代码
npm run format

# 检查格式
npm run format:check
```

## 构建

```bash
# 构建生产版本
npm run tauri build
```

构建后的应用程序位于 `src-tauri/target/release/bundle/` 目录。

## 项目结构

```
ztools/
├── src/
│   ├── components/          # 公共组件
│   │   ├── TitleBar.vue     # 自定义标题栏
│   │   ├── Sidebar.vue      # 侧边栏导航
│   │   └── ToolLayout.vue   # 工具页面布局
│   ├── composables/         # 共享 composable
│   │   └── useClipboard.ts  # 剪贴板复制（含成功提示）
│   ├── tools/               # 工具页面
│   │   ├── JsonFormatter.vue
│   │   ├── XmlFormatter.vue
│   │   ├── Base64Tool.vue
│   │   ├── UrlEncoder.vue
│   │   ├── TimestampConverter.vue
│   │   ├── RegexTester.vue
│   │   ├── ColorConverter.vue
│   │   ├── HashCalculator.vue
│   │   ├── AesTool.vue
│   │   ├── HmacTool.vue
│   │   ├── RsaKeyGen.vue
│   │   ├── RsaCrypto.vue
│   │   ├── UuidTool.vue
│   │   └── M3u8Downloader.vue
│   ├── stores/              # Pinia 状态管理
│   ├── router/              # Vue Router 路由
│   ├── i18n/                # 国际化翻译
│   ├── utils/               # 工具函数（clipboard, hash, crypto, errors 等）
│   ├── styles/              # CSS 变量和全局样式
│   └── test-setup.ts        # 全局测试 Mock
├── .github/workflows/       # CI 流水线
│   └── ci.yml               # 格式检查 → 类型检查 → 测试 → 构建 + Rust 编译/测试
├── src-tauri/               # Tauri 后端（Rust）
│   └── src/m3u8/            # M3U8 模块（解析、解密、下载、转码）
├── .prettierrc.json         # 代码格式化规则
├── .git-blame-ignore-revs   # git blame 忽略格式化提交
└── package.json
```

## 测试

```bash
# 运行所有测试
npm run test

# 单次运行
npm run test:run

# 运行测试并生成覆盖率报告
npm run test:coverage

# Rust 测试
cargo test --lib --manifest-path src-tauri/Cargo.toml
```

## CI/CD

每次推送到 `main` 或提交 PR 时自动运行：

- **前端**：格式检查 → 类型检查 (`vue-tsc`) → 测试 (`vitest`) → 构建 (`vite`)
- **后端**：编译检查 (`cargo check`) → 测试 (`cargo test --lib`)

## 国际化

应用支持中文和英文，可在侧边栏切换语言。

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。
