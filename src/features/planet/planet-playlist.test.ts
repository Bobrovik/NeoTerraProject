import { describe, expect, it } from 'vitest'
import { fadeVolume, nextPlanetTrack, planetPlaylist } from './planet-playlist'

describe('planet playlist', () => {
  it('keeps the configured tracks in order and wraps after the last one', () => {
    expect(planetPlaylist).toEqual(['/audio/track-01.mp3', '/audio/track-02.mp3', '/audio/track-03.mp3'])
    expect(nextPlanetTrack(0, planetPlaylist.length)).toBe(1)
    expect(nextPlanetTrack(2, planetPlaylist.length)).toBe(0)
    expect(nextPlanetTrack(0, 0)).toBe(0)
  })

  it('fades between two volumes without leaving that span', () => {
    expect(fadeVolume(0, 0.28, 0)).toBe(0)
    expect(fadeVolume(0, 0.28, 0.5)).toBeCloseTo(0.14)
    expect(fadeVolume(0.28, 0, 1)).toBe(0)
    expect(fadeVolume(0.28, 0, -1)).toBe(0.28)
    expect(fadeVolume(0, 0.28, 2)).toBe(0.28)
  })
})
