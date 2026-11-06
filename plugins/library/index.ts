/**
 * The library, the album view, the lightbox and the upload form.
 * Routes: GET /, GET /albums/:id, GET /photos/:id, POST /photos/:id/favourite, GET/POST /upload.
 */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import { GalleryError, neighbours, whenText, type Photo } from '../gallery/index.ts'
const escape = (text: string): string => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
export const name = 'library'
export const inject = ['gallery', 'shell', 'router']
export function apply(ctx: Context): void {
  const { gallery, shell } = ctx
  const e = shell.e
  const prefix = shell.prefix
  const tile = (photo: Photo): string => `<a class="photo" style="background:${photo.gradient}" href="${shell.href(`/photos/${encodeURIComponent(photo.id)}`)}"><small>${String(photo.width)}×${String(photo.height)}</small><span>${escape(photo.filename)}${photo.favourite ? ' ♥' : ''}</span></a>`
  const page = (read: (name: string) => string | undefined, url: string, albumId?: string): string => {
    const q = (read('q') ?? '').slice(0, 100)
    const favourites = read('favourites') === '1'
    const album = albumId === undefined ? undefined : gallery.album(albumId)
    const photos = gallery.photos({ q, ...(albumId === undefined ? {} : { albumId }), ...(favourites ? { favourites: true } : {}) })
    const tabs = `<div class="tabs">${[{ id: undefined, name: 'All' }, ...gallery.albums()].map((item) => `<a href="${item.id === undefined ? shell.href('/') : shell.href(`/albums/${encodeURIComponent(item.id)}`)}" class="tab${item.id === albumId ? ' active' : ''}" style="text-decoration:none">${escape(item.name.toUpperCase())}</a>`).join('')}<form method="get" action="${shell.href('/')}" style="margin-left:auto"><input name="q" value="${e(q)}" placeholder="Search archive" aria-label="Search archive" style="border:1px solid #3a3832;background:#141310;color:#e9e5dc;border-radius:5px;padding:7px;font-size:8px"></form></div>`
    const head = `<div class="head"><div><small>COLLECTION / ${favourites ? 'FAVOURITES' : album === undefined ? 'ALL PHOTOGRAPHS' : escape(album.name).toUpperCase()}</small><h1>${favourites ? 'Favourites' : album === undefined ? 'Visual archive' : escape(album.name)}</h1><p>${favourites ? 'The frames you keep coming back to.' : album === undefined ? 'A considered home for every frame, location and moment.' : escape(album.description)}</p></div><a href="${shell.href('/upload')}" style="border:1px solid #3a3832;background:#1c1b18;color:#d6d1c5;border-radius:5px;padding:9px 12px;font-size:9px;text-decoration:none">＋ Add photographs</a></div>`
    const main = `${shell.notice(url)}${head}${tabs}<div class="photos">${photos.length === 0 ? '<p class="empty">No photographs match. <a href="/">Show all</a>.</p>' : photos.map(tile).join('')}</div>`
    return shell.page({ active: favourites ? 'favourites' : 'library', title: favourites ? 'Favourites' : album?.name ?? 'Visual archive', main })
  }
  const lightbox = (photo: Photo, url: string): string => {
    const pair = neighbours(gallery.photos(), photo)
    const album = gallery.album(photo.albumId)
    const main = `${shell.notice(url)}<div class="head"><div><small>PHOTOGRAPH / ${escape(album?.name ?? '').toUpperCase()}</small><h1>${escape(photo.filename)}</h1><p>${escape(photo.description)}</p></div><div><a href="${shell.href(`/albums/${encodeURIComponent(photo.albumId)}`)}" style="font-size:9px;color:#aaa79e">Back to album ↗</a></div></div><div class="lightbox-page"><div class="frame" style="background:${photo.gradient}"></div><aside><div><b>${String(photo.width)} × ${String(photo.height)}</b><br>${(photo.sizeBytes / 1_000_000).toFixed(1)} MB · ${whenText(photo.capturedAt, gallery.now)}</div><div style="margin-top:12px">${photo.tags.map((tag) => `<span class="tag">${escape(tag)}</span>`).join('')}</div><div style="margin-top:12px">${pair.prev === undefined ? '' : `<a href="${shell.href(`/photos/${encodeURIComponent(pair.prev.id)}`)}">‹ ${escape(pair.prev.filename)}</a><br>`}${pair.next === undefined ? '' : `<a href="${shell.href(`/photos/${encodeURIComponent(pair.next.id)}`)}">${escape(pair.next.filename)} ›</a>`}</div><form method="post" action="${shell.href(`/photos/${encodeURIComponent(photo.id)}/favourite`)}"><input type="hidden" name="back" value="${e(url)}"><button style="margin-top:14px;background:#2b2924;color:#d6d1c5;border:1px solid #3a3832;border-radius:5px;padding:8px 10px;font-size:8px">${photo.favourite ? '♥ Remove from favourites' : '♡ Add to favourites'}</button></form><p style="font-size:8px;color:#77756e;margin-top:14px">Preview is an offline gradient; the real app stores the original and a generated thumbnail.</p></aside></div>`
    return shell.page({ active: 'library', title: photo.filename, main })
  }
  const upload = (url: string, error?: string): string => {
    const options = gallery.albums().map((album) => `<option value="${e(album.id)}">${escape(album.name)}</option>`).join('')
    const main = `<div class="head"><div><small>LIBRARY / UPLOAD</small><h1>Add photographs</h1><p>Record a new frame. The preview is an offline gradient; no file leaves this machine.</p></div></div>${error === undefined ? '' : `<p class="notice error" role="alert">${e(error)}</p>`}<form class="form" method="post" action="${shell.href('/upload')}"><label>FILE NAME<input name="filename" required placeholder="harbour-02.jpg"></label><label>ALBUM<select name="albumId">${options}</select></label><label>DESCRIPTION<input name="description" required placeholder="What the frame holds"></label><label>PREVIEW<select name="gradient"><option value="linear-gradient(135deg,#3f5d68,#a8c7cf)">Blue</option><option value="linear-gradient(135deg,#7b5537,#d8ad7d)">Warm</option><option value="linear-gradient(135deg,#4f5148,#b0b2a4)">Grey</option></select></label><div class="actions"><button class="primary">Add photograph</button><a href="${shell.href('/')}">Cancel</a></div></form>`
    return shell.page({ active: 'uploads', title: 'Add photographs', main })
  }
  const app = new Acryl()
    .get('/', (c) => c.html(page((name) => c.req.query(name), c.req.url)))
    .get('/albums/:id', (c) => {
      if (gallery.album(c.req.param('id')) === undefined) return c.redirect(shell.url('/', { kind: 'error', text: 'That album no longer exists.' }), 303)
      return c.html(page((name) => c.req.query(name), c.req.url, c.req.param('id')))
    })
    .get('/photos/:id', (c) => {
      const photo = gallery.photo(c.req.param('id'))
      if (photo === undefined) return c.redirect(shell.url('/', { kind: 'error', text: 'That photograph no longer exists.' }), 303)
      return c.html(lightbox(photo, c.req.url))
    })
    .post('/photos/:id/favourite', async (c) => {
      const form = await c.req.parseBody()
      const back = shell.back(form.back, `/photos/${encodeURIComponent(c.req.param('id'))}`)
      try {
        const photo = await gallery.toggleFavourite(c.req.param('id'))
        return c.redirect(shell.url(back, { kind: 'ok', text: photo.favourite ? 'Added to favourites.' : 'Removed from favourites.' }), 303)
      } catch (error) {
        return c.redirect(shell.url(back, { kind: 'error', text: (error as Error).message }), 303)
      }
    })
    .get('/upload', (c) => c.html(upload(c.req.url)))
    .post('/upload', async (c) => {
      const form = await c.req.parseBody()
      try {
        const photo = await gallery.upload({ filename: String(form.filename ?? ''), albumId: String(form.albumId ?? ''), description: String(form.description ?? ''), gradient: String(form.gradient ?? '') })
        return c.redirect(shell.url(`/photos/${encodeURIComponent(photo.id)}`, { kind: 'ok', text: `${photo.filename} was added.` }), 303)
      } catch (error) {
        if (!(error instanceof GalleryError)) throw error
        return c.html(upload(c.req.url, error.message))
      }
    })
  ctx.router.route(prefix === '' ? '/' : prefix, app)
  ctx.effect(() => shell.nav({ id: 'library', label: 'Library', icon: '', path: '/', order: 10 }))
  ctx.effect(() => shell.nav({ id: 'favourites', label: 'Favourites', icon: '', path: '/?favourites=1', order: 20, count: () => gallery.favourites() }))
  ctx.effect(() => shell.nav({ id: 'uploads', label: 'Uploads', icon: '', path: '/upload', order: 30 }))
}
