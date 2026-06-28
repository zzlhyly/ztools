# M3U8 视频下载器 — 设计方案

**日期**: 2026-06-28  
**主题**: 为 ztools 新增 M3U8 视频下载工具，支持网页 URL 自动提取 → 解密 → 转 MP4

## 架构概览

```
Vue 前端 (配置 + 任务队列 UI)
    ↕ Tauri invoke / Event 双向通信
Rust 后端 (fetch → 解析 → 下载 → 解密 → ffmpeg 转码)
```

- 前端负责 UI、配置持久化、任务状态展示
- Rust 负责所有 IO 密集型操作：HTTP 请求、M3U8 解析、TS 分片下载、AES 解密、ffmpeg 调用
- 长任务通过 Tauri Event 推送实时进度

## 功能需求

| 维度 | 决定 |
|---|---|
| 输入 | 粘贴网页 URL，自动提取 m3u8 |
| 架构 | 混合：前端 fetch/解析，Rust 解密/合并/转码 |
| ffmpeg | 用户自行安装 |
| 输出目录 | 界面配置、持久化保存 |
| 文件名 | 自动从 URL/页面标题提取 |
| 清晰度 | 默认最高，用户可切换 |
| 鉴权 | 支持自定义 Headers（Referer / Cookie / 自定义） |
| 并发 | 任务队列，FIFO |

## 下载管线

### Step 1: 抓取网页
```
Rust: fetch_page(url, headers) → {html, final_url}
```
- 使用 reqwest GET 请求，携带自定义 headers（Referer, Cookie 等）
- 跟随重定向，记录最终 URL

### Step 2: 提取 m3u8 链接
```
Rust: parse_m3u8_urls(html, base_url) → Vec<{url, label}>
```
- 正则全局搜索 m3u8 URL 模式（覆盖 JS 变量中的链接）
- scraper DOM 解析 `<video src>` 和 `<source src>` 标签
- 返回所有匹配，label 从 DOM 属性或 JS 变量名推测

### Step 3: 解析 M3U8 播放列表
```
Rust: parse_m3u8(m3u8_url, headers) → PlaylistInfo
```
- **Master Playlist** (`#EXT-X-STREAM-INF`): 返回多清晰度选项 `[{bandwidth, resolution, url}]`
- **Media Playlist** (`#EXTINF`): 返回 `{segments[], key_info?, duration}`
- `key_info`: 解析 `#EXT-X-KEY:METHOD=AES-128,URI="key.bin",IV=0x...`
- 支持加密: AES-128-CBC
- 显式不支持: SAMPLE-AES（提示用户用专业工具）

### Step 4: 下载 + 解密 + 合并 + 转码
- 并发下载 TS 分片（默认 5 个并发，可配置）
- 单分片失败自动重试 3 次（间隔 1s）
- AES-128-CBC 解密（如有 KEY）
- 解密后写入临时文件 `segments/NNNNN.ts`
- 全部下载完成 → 生成 ffmpeg concat 文件列表 → `ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4`
- 通过 Tauri Event 实时推送进度（百分比 + 速度 + 大小）
- 清理临时文件

## 组件树

### 前端文件
- `src/tools/M3u8Downloader.vue` — 工具页面（配置区 + 任务队列）
- `src/stores/m3u8.ts` — Pinia store（配置持久化 + 任务状态）
- `src/components/DownloadProgress.vue` — 进度条组件
- `src/utils/m3u8.ts` — Tauri invoke/event 封装

### Rust 文件
- `src-tauri/src/m3u8/mod.rs` — 模块入口 + 公开接口
- `src-tauri/src/m3u8/playlist.rs` — M3U8 解析
- `src-tauri/src/m3u8/downloader.rs` — 分片下载 + 任务调度
- `src-tauri/src/m3u8/decrypt.rs` — AES-128 解密
- `src-tauri/src/m3u8/converter.rs` — ffmpeg 调用 + TS 合并

### 修改文件
- `src/router/index.ts` — + 路由 `/m3u8`
- `src/components/Sidebar.vue` — + 工具条目 + 图标
- `src/i18n/zh-CN.ts` / `src/i18n/en-US.ts` — + 翻译
- `src-tauri/Cargo.toml` — + 依赖
- `src-tauri/src/lib.rs` — + 注册命令
- `src-tauri/capabilities/default.json` — + ffmpeg 调用权限

## 状态管理

### Pinia Store: `useM3u8Store`

持久化配置（localStorage）:
- `downloadDir`: 下载目录路径
- `headers`: 自定义请求头 `{ Referer, Cookie, custom[] }`
- `maxConcurrent`: 并发分片数（默认 5）

运行时状态:
- `tasks: M3u8Task[]` — 任务列表
- `activeTasks: number` — 当前活动任务数

任务结构:
```ts
M3u8Task {
  id: string           // UUID
  url: string          // 原始网页 URL
  m3u8Url: string      // 解析出的 m3u8 URL
  filename: string     // 自动提取的文件名
  quality: string      // "1080p" / "720p"
  status: 'parsing' | 'selecting_quality' | 'downloading' | 'converting' | 'done' | 'error' | 'cancelled'
  progress: number     // 0-100
  speed: string
  size: string
  error?: string
  createdAt: Date
}
```

## 错误处理

| 阶段 | 错误 | 处理 |
|---|---|---|
| 抓取网页 | 网络超时/DNS 失败 | 任务 error |
| | 无 m3u8 链接 | 提示"未检测到视频资源" |
| | 页面需要 JS 渲染 | 提示尝试直接 m3u8 链接 |
| 解析 m3u8 | 格式异常 | 任务 error，显示原始内容 |
| | KEY 获取失败 (403/404) | 提示检查 Headers |
| | 加密方式非 AES-128 | 提示"加密方式不受支持" |
| 下载分片 | 单个分片 4xx/5xx | 自动重试 ×3，全失败则任务 error |
| | 重定向 302 | reqwest 自动跟随 |
| 解密 | 密钥长度异常 | 任务 error |
| | IV 缺失 | 默认 IV = 分片序号 |
| ffmpeg | ffmpeg 未安装 | 下载前检测 + 提示 |
| | 转码失败 | 保留 TS 合并文件 |
| 清理 | 用户取消 | 停止下载，清理临时文件 |
| | 目标磁盘满 | 任务 error |

## 边界情况
- 直播流 m3u8（无 `#EXT-X-ENDLIST`）: 不支持，提示用户
- Master playlist 嵌套 >3 层: 报错
- Gzip/Brotli 响应: reqwest 自动解压
- 超大分片: 流式写入磁盘
- Key 本身是 m3u8 链接: 递归解一层
- HTTPS 证书问题: 允许跳过校验（默认关闭，需手动开启）

## 测试策略

### 前端
- store CRUD + localStorage 持久化
- DownloadProgress 组件渲染

### Rust 单元测试
- `playlist`: Master/Media playlist 解析，带/不带加密，IV 处理，HTML 提取
- `decrypt`: AES-128-CBC 正确性（已知向量验证），错误 key 处理

### 手动验证
- 公开 m3u8 测试流
- 已知加密向量验证
- ffmpeg PATH 检测
- Headers 鉴权站点
