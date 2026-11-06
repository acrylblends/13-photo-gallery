/** Photo Gallery's types and pure rules: albums, photographs, favourites and the lightbox order. */
export interface Photo {
  readonly id: string
  readonly filename: string
  readonly albumId: string
  readonly width: number
  readonly height: number
  readonly sizeBytes: number
  readonly capturedAt: string
  readonly tags: readonly string[]
  readonly favourite: boolean
  readonly description: string
  /** A CSS background used as the offline stand-in for the image. */
  readonly gradient: string
}
export interface Album {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly coverPhotoId?: string
}
export interface GalleryState {
  readonly version: 1
  albums: Album[]
  photos: Photo[]
}
export type GalleryErrorCode = 'invalid' | 'not-found' | 'conflict'
export class GalleryError extends Error {
  readonly code: GalleryErrorCode
  constructor(code: GalleryErrorCode, message: string) { super(message); this.code = code; this.name = 'GalleryError' }
}
const pad = (n: number): string => String(n).padStart(2, '0')
export const dayOf = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
export const stampOf = (date: Date): string => `${dayOf(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`

export function whenText(stamp: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(stamp).getTime()) / 60_000)
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  if (hours < 48) return 'Yesterday'
  return new Date(stamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export interface PhotoFilter {
  readonly albumId?: string
  readonly q?: string
  readonly favourites?: boolean
  readonly tag?: string
}
export function filterPhotos(photos: readonly Photo[], filter: PhotoFilter = {}): Photo[] {
  const q = (filter.q ?? '').trim().toLowerCase()
  return photos
    .filter((photo) => filter.albumId === undefined || photo.albumId === filter.albumId)
    .filter((photo) => filter.favourites !== true || photo.favourite)
    .filter((photo) => filter.tag === undefined || photo.tags.includes(filter.tag))
    .filter((photo) => q === '' || [photo.filename, photo.description, ...photo.tags].join(' ').toLowerCase().includes(q))
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
}
export function albumCounts(photos: readonly Photo[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const photo of photos) counts.set(photo.albumId, (counts.get(photo.albumId) ?? 0) + 1)
  return counts
}
/** The previous and next photograph in the same album, by capture date. */
export function neighbours(photos: readonly Photo[], photo: Photo): { prev?: Photo; next?: Photo } {
  const album = [...photos].filter((item) => item.albumId === photo.albumId).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
  const index = album.findIndex((item) => item.id === photo.id)
  return { prev: album[index - 1], next: album[index + 1] }
}
export function cleanFilename(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') throw new GalleryError('invalid', 'The file name is required.')
  const text = value.trim()
  if (text.length > 120) throw new GalleryError('invalid', 'The file name is longer than 120 characters.')
  return text
}
export function cleanDescription(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') throw new GalleryError('invalid', 'A short description is required.')
  return value.trim().slice(0, 300)
}
