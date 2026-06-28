# M3U8 视频下载器 — 设计方案

**日期**: 2026-06-28（经 `/grill-with-docs` 审查修订）  
**主题**: 为 ztools 新增 M3U8 视频下载工具，支持网页 URL 自动提取 / 直接 m3u8 URL → 解密 → 转 MP4

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
| 输入模式 | 网页 URL（仅静态 HTML）+ 直接粘贴 m3u8 URL 降级 |
| 架构 | 混合：前端 fetch/解析，Rust 解密/合并/转码 |
| ffmpeg | 用户自行安装，路径可界面配置，每次下载前检测 |
| 输出目录 | 界面配置、持久化保存 |
| 文件名 | `{title}_{quality}_{date}.mp4`，避免重复 |
| 清晰度 | 默认最高，用户可切换 |
| 鉴权 | 支持自定义 Headers（Referer / Cookie / 自定义）+ 从 cURL 命令粘贴 |
| 并发 | 任务队列 FIFO，每个任务独立 socket 池（task_concurrent × segment_concurrent 个连接） |
| 加密 | AES-128-CBC，支持旋转密钥（per-segment KEY/IV） |
| 广告 | 不区分广告与正片，全量下载 |
| 代理 | 依赖系统代理（不内置配置） |
| 输出格式 | 仅 MP4 |

## 输入流程

### 模式 A: 网页 URL
```
用户粘贴网页 URL → Rust fetch_page(url, headers) → {html, final_url}
  → 正则 + scraper DOM 提取 m3u8 URL 列表
  → 对每个 m3u8 预解析 Master Playlist，展示清晰度/时长/URL 辅助选择
  → 用户选一个流 → 进入下载
```
- **限制**: 仅覆盖 HTML 源码中可见的 m3u8 URL，不支持 JS 动态生成的站点
- **失败降级**: 提示用户从 DevTools 获取直接 m3u8 链接，切换到模式 B

### 模式 B: 直接 m3u8 URL
```
用户粘贴 m3u8 URL → Rust 直接解析 → 进入下载
```
- 跳过网页抓取步骤

## 下载管线

### Step 1: 预解析 M3U8 播放列表
```
Rust: parse_m3u8(m3u8_url, headers) → PlaylistInfo
```
- **Master Playlist** (`#EXT-X-STREAM-INF`): 返回多清晰度选项 `[{bandwidth, resolution, url}]`
- **Media Playlist** (`#EXTINF`): 返回 `{segments[], keys[], duration}`
  - `keys[]`: 每条 `#EXT-X-KEY` 的作用范围（起始分片序号、KEY URI、IV、METHOD）
  - 支持 AES-128-CBC 单 KEY 和旋转 KEY
  - 显式不支持: SAMPLE-AES
- 存储 m3u8 内容快照 → `{task_dir}/playlist.m3u8`（供续传使用）

### Step 2: 获取解密密钥
- 对每条 KEY URI，使用相同 headers 发送 GET 请求
- KEY 本身是 m3u8 链接：递归解析一层

### Step 3: 下载 + 解密 + 写入临时文件
```
并发下载 TS 分片（每个 task 独立 N 个并发，默认 5）
  → 已有本地分片跳过（续传检测）
  → AES-128-CBC 解密（根据分片序号匹配合适的 KEY/IV）
  → 写入 {task_dir}/segments/{seq:05}.ts
  → 每个分片完成推送 Event: download-progress {task_id, percent, speed, downloaded/total}
```

- 单个分片失败：自动重试 3 次（间隔 1s），全失败 → 任务 error
- 网络中断：任务 error，已下载分片保留
- 旋转密钥：根据 `keys[n].start_segment` 匹配当前分片的 KEY/IV

### Step 4: 合并 + 转码
```
生成 ffmpeg concat 文件列表（按文件名排序 segments/00001.ts → 00002.ts ...）
  → ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4
  → 成功: 清理临时文件
  → 失败: 保留临时文件（用户可手动处理）
```

## 配置管理

### 持久化配置（localStorage）
- `downloadDir`: 下载目录路径（默认系统下载目录）
- `ffmpegPath`: ffmpeg 可执行文件路径（默认 "ffmpeg"，从 PATH 查找）
- `headers`: 自定义请求头 `{ Referer, Cookie, custom[] }`
- `maxTaskConcurrent`: 同时进行的任务数（默认 1）
- `maxSegmentConcurrent`: 单任务内分片并发数（默认 5）
- 支持从 cURL 字符串解析 URL + Headers

### 任务持久化
- 全部任务持久化到 localStorage（包括已完成的历史记录）
- 关闭窗口时：如有 `downloading` 状态的任务 → 弹出确认对话框 → 确认后中止下载，保留临时文件，任务标记为 `cancelled`

### 续传
- 重试失败任务时：检查 `{task_dir}/playlist.m3u8` 快照（本地优先，避免 URL 过期）
- 检查 `{task_dir}/segments/` 已有分片，只下载缺失分片
- 缺失 KEY 则重新获取

## 组件树

### 前端文件
- `src/tools/M3u8Downloader.vue` — 工具页面（URL输入/Headers配置/ffmpeg路径/输出目录/任务队列）
- `src/stores/m3u8.ts` — Pinia store（配置持久化 + 任务 CRUD + localStorage 同步）
- `src/components/DownloadProgress.vue` — 进度条组件（百分比 + 速度 + 大小）
- `src/utils/m3u8.ts` — Tauri invoke/event 封装 + cURL 解析

### Rust 文件
- `src-tauri/src/m3u8/mod.rs` — 模块入口 + 任务管理状态
- `src-tauri/src/m3u8/playlist.rs` — M3U8 解析（Master/Media + 旋转 KEY）
- `src-tauri/src/m3u8/downloader.rs` — 分片下载 + 进度推送 + 续传检测
- `src-tauri/src/m3u8/decrypt.rs` — AES-128-CBC 解密
- `src-tauri/src/m3u8/converter.rs` — ffmpeg 调用 + TS 合并 + 临时文件管理

### 修改文件
- `src/router/index.ts` — + 路由 `/m3u8`
- `src/components/Sidebar.vue` — + 工具条目 + 图标
- `src/i18n/zh-CN.ts` / `src/i18n/en-US.ts` — + 翻译
- `src-tauri/Cargo.toml` — + 依赖（reqwest, tokio, aes, cbc, scraper, uuid, base64）
- `src-tauri/src/lib.rs` — + 注册命令
- `src-tauri/capabilities/default.json` — + ffmpeg/shell 权限

## 状态定义

```ts
M3u8Task {
  id: string           // UUID
  url: string          // 原始 URL（网页或 m3u8）
  inputMode: 'webpage' | 'direct'
  m3u8Url: string      // 最终用于下载的 m3u8 URL
  title: string        // 从网页 <title> 或 m3u8 URL 提取
  quality: string      // "1080p" / "720p" / "auto"
  filename: string     // 最终输出文件名
  status: 'parsing' | 'selecting_quality' | 'downloading' | 'converting' | 'done' | 'error' | 'cancelled' | 'paused'
  progress: number     // 0-100
  speed: string        // "2.3 MB/s"
  downloaded: number   // 已下载分片数
  total: number        // 总分片数
  error?: string
  createdAt: number    // timestamp
  completedAt?: number
}
```

## 错误处理

| 阶段 | 错误 | 处理 |
|---|---|---|
| 抓取网页 | 网络超时/DNS 失败 | 任务 error |
| | 无 m3u8 链接 | 提示"未检测到视频资源"，建议直接 m3u8 URL |
| | 页面需 JS 渲染 | 提示降级到直接 m3u8 链接 |
| 解析 m3u8 | 格式异常 | 任务 error，显示原始内容 |
| | KEY 获取失败 (403/404) | 提示检查 Headers |
| | 加密方式非 AES-128 | 提示"加密方式不受支持：{method}" |
| 下载分片 | 单个分片 4xx/5xx | 自动重试 ×3，全失败则任务 error（保留已下载） |
| | 重定向 302 | reqwest 自动跟随 |
| 解密 | 密钥长度异常 | 任务 error |
| | IV 缺失 | 默认 IV = 分片序号（HLS 规范默认） |
| ffmpeg | ffmpeg 未安装/路径错误 | 每次下载前检测 + toast 阻止 |
| | 转码失败 | 保留临时文件 |
| 退出 | 窗口关闭时有进行中任务 | 确认对话框，中止并保留临时文件 |
| 磁盘 | 目标磁盘满 | 任务 error |

## 边界情况
- 直播流 m3u8（无 `#EXT-X-ENDLIST`）: 不支持，提示用户
- Master playlist 嵌套 >3 层: 报错
- Gzip/Brotli 压缩响应: reqwest 自动解压
- 超大分片（>500MB）: 流式写入磁盘
- HTTPS 证书问题: 允许跳过校验（默认关闭）
- 旋转密钥: 支持多条 `#EXT-X-KEY`，按分片序号匹配
- Key URI 是相对路径: 基于 m3u8 URL 解析为绝对 URL
- 分片 URI 是相对路径: 同上

## 测试策略

### 前端
- store CRUD + localStorage 持久化 + 续传状态恢复
- DownloadProgress 组件各状态渲染
- cURL 字符串解析

### Rust 单元测试
- `playlist`: Master/Media playlist 解析，单/多 KEY，IV 处理，HTML m3u8 提取
- `decrypt`: AES-128-CBC 正确性（已知向量），错误 key，旋转 KEY

### 手动验证
- 公开 m3u8 测试流
- 已知加密向量端到端验证
- ffmpeg 检测逻辑
- Headers + 鉴权站点
- 窗口关闭确认 + 续传恢复
