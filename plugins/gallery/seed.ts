/** The archive a new install starts with: four albums and twelve photographs with offline gradient previews. */
import type { Album, GalleryState, Photo } from './domain.ts'
import { stampOf } from './domain.ts'
interface Seed { filename: string; album: string; width: number; height: number; size: number; daysAgo: number; tags: string[]; description: string; gradient: string; favourite?: boolean }
const ALBUMS: readonly { name: string; description: string }[] = [
  { name: 'Landscapes', description: 'Hills, coast and weather.' },
  { name: 'Architecture', description: 'Concrete, glass and lines.' },
  { name: 'Portraits', description: 'People in available light.' },
  { name: 'Travel', description: 'Places worth the walk.' },
]
const PHOTOS: readonly Seed[] = [
  { filename: 'coastline-01.jpg', album: 'Landscapes', width: 6000, height: 4000, size: 8_400_000, daysAgo: 1, tags: ['coast', 'dusk'], description: 'Last light on the north coast.', gradient: 'linear-gradient(135deg,#7c6a55,#d9c3a5)', favourite: true },
  { filename: 'ridge-02.jpg', album: 'Landscapes', width: 6000, height: 3375, size: 7_100_000, daysAgo: 4, tags: ['mountains'], description: 'The ridge before the weather turned.', gradient: 'linear-gradient(135deg,#4f5c52,#a9b8a2)' },
  { filename: 'field-03.jpg', album: 'Landscapes', width: 5000, height: 3333, size: 6_200_000, daysAgo: 9, tags: ['field', 'summer'], description: 'A field left uncut.', gradient: 'linear-gradient(135deg,#7b7a4f,#d7d39e)' },
  { filename: 'stair-01.jpg', album: 'Architecture', width: 4000, height: 6000, size: 5_400_000, daysAgo: 2, tags: ['stairs', 'concrete'], description: 'A stairwell in the old print works.', gradient: 'linear-gradient(135deg,#6b6f73,#c9ced2)', favourite: true },
  { filename: 'facade-02.jpg', album: 'Architecture', width: 6000, height: 4000, size: 7_600_000, daysAgo: 6, tags: ['glass', 'lines'], description: 'Glass and repetition on the east side.', gradient: 'linear-gradient(135deg,#43525f,#a9c0cf)' },
  { filename: 'atrium-03.jpg', album: 'Architecture', width: 5000, height: 5000, size: 6_900_000, daysAgo: 12, tags: ['atrium'], description: 'The atrium, looking up.', gradient: 'linear-gradient(135deg,#57504a,#bdb2a5)' },
  { filename: 'portrait-01.jpg', album: 'Portraits', width: 4000, height: 5000, size: 5_100_000, daysAgo: 3, tags: ['studio'], description: 'A quiet portrait in window light.', gradient: 'linear-gradient(135deg,#6c5148,#d4b6a6)' },
  { filename: 'portrait-02.jpg', album: 'Portraits', width: 4000, height: 6000, size: 5_800_000, daysAgo: 8, tags: ['studio'], description: 'A second frame from the same sitting.', gradient: 'linear-gradient(135deg,#51483f,#c5b8a8)', favourite: true },
  { filename: 'harbour-01.jpg', album: 'Travel', width: 6000, height: 4000, size: 8_100_000, daysAgo: 5, tags: ['harbour', 'boats'], description: 'Boats waiting for the tide.', gradient: 'linear-gradient(135deg,#3f5d68,#a8c7cf)' },
  { filename: 'market-02.jpg', album: 'Travel', width: 5000, height: 3333, size: 6_400_000, daysAgo: 10, tags: ['market'], description: 'Morning market, before the crowd.', gradient: 'linear-gradient(135deg,#7b5537,#d8ad7d)' },
  { filename: 'station-03.jpg', album: 'Travel', width: 6000, height: 3375, size: 7_800_000, daysAgo: 14, tags: ['station', 'night'], description: 'The last train under the clock.', gradient: 'linear-gradient(135deg,#3f4654,#9fa9ba)' },
  { filename: 'alley-04.jpg', album: 'Travel', width: 4000, height: 6000, size: 5_600_000, daysAgo: 20, tags: ['alley'], description: 'A narrow street after rain.', gradient: 'linear-gradient(135deg,#4f5148,#b0b2a4)' },
]
export function seed(now: Date, newId: (kind: string) => string): GalleryState {
  const albums: Album[] = ALBUMS.map((album) => ({ id: newId('album'), ...album }))
  const photos: Photo[] = PHOTOS.map((item) => {
    const album = albums.find((candidate) => candidate.name === item.album) as Album
    return { id: newId('photo'), filename: item.filename, albumId: album.id, width: item.width, height: item.height, sizeBytes: item.size, capturedAt: stampOf(new Date(now.getTime() - item.daysAgo * 86_400_000)), tags: item.tags, favourite: item.favourite === true, description: item.description, gradient: item.gradient }
  })
  for (const album of albums) {
    const cover = photos.find((photo) => photo.albumId === album.id)
    if (cover !== undefined) (album as { coverPhotoId?: string }).coverPhotoId = cover.id
  }
  return { version: 1, albums, photos }
}
