import { invoke } from '@tauri-apps/api/core'

export interface SiteConfig {
  api_url?: string
  site_id?: number
  channel_id?: number
  video_play_url_list?: PlayLine[]
  video_download_url?: string[]
}

export interface PlayLine {
  name?: string
  url?: string[]
  sort?: number
  is_vip?: boolean
}

export interface VideoListItem {
  id: number
  name?: string
  pubdate?: string
  duration?: number
  hits?: number
  pic?: string
  product_type?: number
}

export interface CrawlResult {
  video_id: number
  title: string
  m3u8_url: string
  duration?: number
}

export async function invokeDecryptConfig(token: string, siteKey: string): Promise<string> {
  return invoke<string>('decrypt_fernet_config', { token, siteKey })
}

export async function invokeExtractConfig(html: string, siteKey: string): Promise<SiteConfig> {
  return invoke<SiteConfig>('extract_config_from_page', { html, siteKey })
}

export async function invokeCrawlVideoDetail(
  html: string,
  videoId: number,
  siteKey: string,
): Promise<CrawlResult> {
  return invoke<CrawlResult>('crawl_video_detail', { html, videoId, siteKey })
}

export async function invokeCrawlListPage(
  html: string,
  tagId: number,
  siteKey: string,
): Promise<VideoListItem[]> {
  return invoke<VideoListItem[]>('crawl_list_page', { html, tagId, siteKey })
}

export async function invokeCrawlListFromUrl(
  url: string,
  tagId: number,
  siteKey: string,
): Promise<VideoListItem[]> {
  return invoke<VideoListItem[]>('crawl_list_from_url', { url, tagId, siteKey })
}

export async function invokeCrawlVideoFromUrl(
  pageUrl: string,
  videoId: number,
  siteKey: string,
): Promise<CrawlResult> {
  return invoke<CrawlResult>('crawl_video_from_url', { pageUrl, videoId, siteKey })
}
