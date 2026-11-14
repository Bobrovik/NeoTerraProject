/** Tracks played on the planet view. Add or remove public audio paths here. */
export const planetPlaylist = [
  '/audio/track-01.mp3',
  '/audio/track-02.mp3',
  '/audio/track-03.mp3',
]

export const planetMusicVolume = 0.28
export const planetMusicFadeMs = 700

export function nextPlanetTrack(index: number, count: number): number {
  if (count <= 0) {
    return 0
  }
  return (index + 1) % count
}

export function fadeVolume(from: number, to: number, progress: number): number {
  const span = Math.min(1, Math.max(0, progress))
  return from + (to - from) * span
}
