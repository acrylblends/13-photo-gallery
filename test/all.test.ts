import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import { createApp, readManifest } from '../src/app.ts'
import { pinnedInstance } from '../plugins/instance/index.ts'
import { albumCounts, cleanFilename, filterPhotos, Gallery, GalleryError, neighbours } from '../plugins/gallery/index.ts'
import type { GalleryState } from '../plugins/gallery/domain.ts'
import { memoryStore } from '../plugins/gallery/store.ts'
import { seed } from '../plugins/gallery/seed.ts'
import { NOW, noticeOf, projectRoot, withApp } from './support.ts'
const scratch = join(projectRoot, '.acrylblends', 'test')
mkdirSync(scratch, { recursive: true })
const newId = (kind: string): string => `${kind}-${Math.random().toString(36).slice(2, 8)}`

test('photos filter by album, favourite, tag and text, and neighbours are the album order', () => {
  const state = seed(NOW, newId)
  const album = state.albums[0]
  assert.ok(album !== undefined)
  assert.ok(filterPhotos(state.photos, { albumId: album.id }).every((photo) => photo.albumId === album.id))
  assert.ok(filterPhotos(state.photos, { favourites: true }).every((photo) => photo.favourite))
  assert.ok(filterPhotos(state.photos, { q: 'harbour' }).some((photo) => photo.filename === 'harbour-01.jpg'))
  assert.equal(filterPhotos(state.photos, { q: 'nothing-matches' }).length, 0)
  const photo = state.photos[1]
  assert.ok(photo !== undefined)
  const pair = neighbours(state.photos, photo)
  assert.ok(pair.prev !== undefined || pair.next !== undefined)
  assert.equal(cleanFilename(' x.jpg '), 'x.jpg')
  assert.throws(() => cleanFilename(''), /file name/)
  assert.equal(albumCounts(state.photos).get(album.id), 3)
})

test('the seed has four albums, twelve photographs and three favourites', () => {
  const state = seed(NOW, newId)
  assert.equal(state.albums.length, 4)
  assert.equal(state.photos.length, 12)
  assert.equal(state.photos.filter((photo) => photo.favourite).length, 3)
})

async function open(): Promise<Gallery> {
  let ids = 0
  return Gallery.open({ store: memoryStore(), clock: () => NOW, newId: (kind) => `${kind}-${++ids}` })
}

test('favouriting and uploading persist and validate', async () => {
  const store = memoryStore<GalleryState>()
  let ids = 0
  const gallery = await Gallery.open({ store, clock: () => NOW, newId: (kind) => `${kind}-${++ids}` })
  const photo = gallery.photos()[0]
  assert.ok(photo !== undefined)
  assert.equal((await gallery.toggleFavourite(photo.id)).favourite, !photo.favourite)
  const album = gallery.albums()[0]
  assert.ok(album !== undefined)
  const uploaded = await gallery.upload({ filename: 'new-frame.jpg', albumId: album.id, description: 'A new frame', gradient: '' })
  assert.equal(uploaded.filename, 'new-frame.jpg')
  await assert.rejects(gallery.upload({ filename: '', albumId: album.id, description: 'x', gradient: '' }), (error: unknown) => error instanceof GalleryError && /file name/.test(error.message))
  await assert.rejects(gallery.upload({ filename: 'x.jpg', albumId: 'missing', description: 'x', gradient: '' }), /album/)
  assert.equal(store.saved, 2)
})

test('the library shows the grid and the albums', () =>
  withApp(async (app) => {
    const page = await app.page('/')
    assert.equal(page.status, 200)
    assert.match(page.html, /Visual archive/)
    assert.match(page.html, /coastline-01\.jpg/)
    assert.match(page.html, /Landscapes/)
    assert.match(page.html, /STORAGE/)
    const album = app.root.gallery.albums()[1]
    assert.ok(album !== undefined)
    const albumPage = await app.page(`/albums/${album.id}`)
    assert.match(albumPage.html, new RegExp(album.name))
  }))

test('the lightbox shows one photo, its neighbours and the favourite action', () =>
  withApp(async (app) => {
    const photo = app.root.gallery.photos().find((item) => item.filename === 'harbour-01.jpg')
    assert.ok(photo !== undefined)
    const page = await app.page(`/photos/${photo.id}`)
    assert.match(page.html, /harbour-01\.jpg/)
    assert.match(page.html, /Add to favourites|Remove from favourites/)
    const toggled = await app.post(`/photos/${photo.id}/favourite`, { back: `/photos/${photo.id}` })
    assert.equal(noticeOf(toggled).kind, 'ok')
    assert.equal(app.root.gallery.photo(photo.id)?.favourite, !photo.favourite)
  }))

test('the upload form adds a photograph and an invalid form keeps the page', () =>
  withApp(async (app) => {
    const form = await app.page('/upload')
    assert.equal(form.status, 200)
    assert.match(form.html, /Add photographs/)
    const album = app.root.gallery.albums()[0]
    assert.ok(album !== undefined)
    const invalid = await app.post('/upload', { filename: '', albumId: album.id, description: 'x', gradient: '' })
    assert.equal(invalid.status, 200)
    assert.match(await invalid.text(), /file name/)
    const created = await app.post('/upload', { filename: 'new-frame.jpg', albumId: album.id, description: 'A new frame', gradient: '' })
    assert.equal(created.status, 303)
    assert.equal(noticeOf(created).kind, 'ok')
    assert.ok(app.root.gallery.photos().some((item) => item.filename === 'new-frame.jpg'))
  }))

test('favourites filter, health, 404, manifest, prefix and switch-off', async () => {
  await withApp(async (app) => {
    const favourites = await app.page('/?favourites=1')
    assert.match(favourites.html, /Favourites/)
    assert.equal((await app.page('/health')).status, 200)
    assert.equal((await app.page('/nope')).status, 404)
    assert.deepEqual(readManifest().plugins.map((row) => row.id), ['router', 'home', 'gallery', 'gallery-shell', 'library', 'extensions', 'server', 'acryl-door'])
  })
  await withApp(async (app) => {
    const page = await app.page('/albums/x')
    assert.equal(page.status, 303)
  })
  await withApp(async (app) => {
    const response = await app.root.router.request('/app', { headers: { accept: 'text/html' } })
    assert.equal(response.status, 200)
    assert.match(await response.text(), /href="\/app\/upload"/)
  }, { prefix: '/app' })
  const manifest = readManifest()
  const without = { ...manifest, plugins: manifest.plugins.map((row) => (row.id === 'library' ? { ...row, disabled: true } : row)) }
  const home = await mkdtemp(join(scratch, 'app-test-off-'))
  let ids = 0
  const app = await createApp(pinnedInstance(home, { root: projectRoot }), { listen: false, manifest: without, overrides: { gallery: { clock: () => NOW, newId: (kind: string) => `${kind}-${++ids}` } } })
  try {
    assert.equal((await app.root.router.request('/health')).status, 200)
    assert.equal((await app.root.router.request('/')).status, 404)
  } finally { await app.stop(); await rm(home, { recursive: true, force: true }) }
})
