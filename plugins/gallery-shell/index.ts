/** The gallery shell: the still-frame top bar, the album rail with storage, and the page column. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import type { Gallery } from '../gallery/index.ts'
import { createShell, escapeHtml, type NavItem, type Shell } from './core.ts'
import { STYLES } from './styles.ts'
export * from './core.ts'
export const APP_TITLE = 'Photo Gallery'
export interface ShellConfig { readonly prefix?: string }
export const name = 'gallery-shell'
export const inject = ['gallery', 'router']
declare module '@deepseek-ai/cordis' { interface Context { shell: Shell } }
function topbar(nav: readonly NavItem[], _crumbs: readonly string[], href: (path: string) => string, _meta: string, active: string | undefined): string {
  const links = nav.map((item) => `<a href="${href(item.path)}"${item.id === active ? ' class="on"' : ''}>${escapeHtml(item.label)}</a>`).join('')
  return `<header class="bar"><a class="wordmark" href="${href('/')}" style="text-decoration:none;color:inherit">STILL<span style="color:#c2a77c">FRAME</span></a><nav>${links}</nav><div class="right">STUDIO ARCHIVE &nbsp; · &nbsp; ${String(4_281 + 12)} ITEMS</div></header>`
}
function rail(gallery: Gallery, _nav: readonly NavItem[], active: string | undefined, href: (path: string) => string): string {
  const counts = gallery.counts()
  const albums = gallery.albums().map((album) => {
    const cover = album.coverPhotoId === undefined ? undefined : gallery.photo(album.coverPhotoId)
    return `<a class="album${active === `album:${album.id}` ? ' active' : ''}" href="${href(`/albums/${encodeURIComponent(album.id)}`)}" style="text-decoration:none"><div class="thumb" style="background:${cover?.gradient ?? '#34322c'}"></div>${escapeHtml(album.name)} <span class="count">${String(counts.get(album.id) ?? 0)}</span></a>`
  }).join('')
  const gy = (gallery.storageBytes() / 1_000_000_000).toFixed(1)
  return `<aside><div class="aside-label">LIBRARY</div>${albums}<div class="aside-block"><div class="aside-label">SMART COLLECTIONS</div><a class="album" href="${href('/?favourites=1')}" style="text-decoration:none">♡ Favourites <span class="count">${String(gallery.favourites())}</span></a><a class="album" href="${href('/upload')}" style="text-decoration:none">⇧ Uploads</a></div><div class="aside-block"><div class="aside-label">STORAGE</div><div style="height:4px;background:#34322c;border-radius:4px"><i style="display:block;width:${String(Math.min(100, Math.round((Number(gy) / 50) * 100)))}%;height:4px;background:#c2a77c;border-radius:4px"></i></div><p style="font-size:9px;color:#817e75">${gy} GB of 50 GB used</p></div></aside>`
}
export function apply(ctx: Context, config: ShellConfig = {}): void {
  const gallery: Gallery = ctx.gallery
  const prefix = config.prefix ?? ''
  const shell = createShell(prefix, { appTitle: APP_TITLE, css: STYLES, bodyClass: 'gallery', topbar: (nav, crumbs, href, meta, active) => topbar(nav, crumbs, href, meta, active), rail: (nav, active, href) => rail(gallery, nav, active, href) })
  ctx.provide('shell', shell)
  ctx.router.route(prefix === '' ? '/' : prefix, new Acryl().get('/health', (c) => c.json({ ok: true })))
}
