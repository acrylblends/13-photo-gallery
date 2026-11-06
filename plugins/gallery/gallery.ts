/** The archive: albums, photographs, favourites and the upload operation. */
import { albumCounts, cleanDescription, cleanFilename, dayOf, filterPhotos, type Album, type GalleryState, GalleryError, type Photo, type PhotoFilter, stampOf } from './domain.ts'
import { seed } from './seed.ts'
import type { Store } from './store.ts'
export interface GalleryAdapters { readonly store: Store<GalleryState>; readonly clock: () => Date; readonly newId: (kind: string) => string }
export interface UploadInput { readonly filename: string; readonly albumId: string; readonly description: string; readonly gradient: string }
export class Gallery {
  private state: GalleryState
  private readonly adapters: GalleryAdapters
  private constructor(state: GalleryState, adapters: GalleryAdapters) { this.state = state; this.adapters = adapters }
  static async open(adapters: GalleryAdapters): Promise<Gallery> { const saved = await adapters.store.load(); return new Gallery(saved ?? seed(adapters.clock(), adapters.newId), adapters) }
  get now(): Date { return this.adapters.clock() }
  albums(): readonly Album[] { return this.state.albums }
  album(id: string): Album | undefined { return this.state.albums.find((album) => album.id === id) }
  photos(filter: PhotoFilter = {}): readonly Photo[] { return filterPhotos(this.state.photos, filter) }
  photo(id: string): Photo | undefined { return this.state.photos.find((photo) => photo.id === id) }
  counts(): Map<string, number> { return albumCounts(this.state.photos) }
  favourites(): number { return this.state.photos.filter((photo) => photo.favourite).length }
  storageBytes(): number { return this.state.photos.reduce((sum, photo) => sum + photo.sizeBytes, 0) }
  async toggleFavourite(id: string): Promise<Photo> {
    const photo = this.photo(id)
    if (photo === undefined) throw new GalleryError('not-found', 'That photograph no longer exists.')
    const next = { ...photo, favourite: !photo.favourite }
    this.state.photos = this.state.photos.map((item) => (item.id === id ? next : item))
    await this.save()
    return next
  }
  async upload(input: UploadInput): Promise<Photo> {
    const filename = cleanFilename(input.filename)
    const description = cleanDescription(input.description)
    const album = this.album(input.albumId)
    if (album === undefined) throw new GalleryError('not-found', 'That album no longer exists.')
    const photo: Photo = { id: this.adapters.newId('photo'), filename, albumId: album.id, width: 6000, height: 4000, sizeBytes: 6_000_000, capturedAt: stampOf(this.adapters.clock()), tags: [], favourite: false, description, gradient: input.gradient === '' ? 'linear-gradient(135deg,#57504a,#bdb2a5)' : input.gradient }
    this.state.photos.push(photo)
    await this.save()
    return photo
  }
  private async save(): Promise<void> { this.state = { ...this.state, albums: [...this.state.albums], photos: [...this.state.photos] }; await this.adapters.store.save(this.state) }
  today(): string { return dayOf(this.now) }
}
