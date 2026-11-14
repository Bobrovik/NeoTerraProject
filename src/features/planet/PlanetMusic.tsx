import { useEffect, useRef, useState } from 'react'
import { fadeVolume, nextPlanetTrack, planetMusicFadeMs, planetMusicVolume, planetPlaylist } from './planet-playlist'
import styles from './PlanetMusic.module.css'

export function PlanetMusic() {
  const toggleRef = useRef<() => void>(() => {})
  const [playing, setPlaying] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audio.volume = 0
    let frame = 0
    let index = 0
    let playingNow = false
    let failures = 0
    let fadingOut = false

    const fadeTo = (target: number, after?: () => void) => {
      const from = audio.volume
      const start = performance.now()
      window.cancelAnimationFrame(frame)
      const step = (now: number) => {
        const progress = (now - start) / planetMusicFadeMs
        audio.volume = fadeVolume(from, target, progress)
        if (progress < 1) {
          frame = window.requestAnimationFrame(step)
          return
        }
        audio.volume = target
        after?.()
      }
      frame = window.requestAnimationFrame(step)
    }

    const playCurrent = (fromStart: boolean) => {
      const src = planetPlaylist[index]
      if (!src) {
        return
      }
      const absolute = new URL(src, window.location.href).href
      if (audio.src !== absolute) {
        audio.src = src
        if (fromStart) {
          audio.currentTime = 0
        }
      }
      fadingOut = false
      void audio.play().then(() => {
        failures = 0
        if (playingNow) {
          fadeTo(planetMusicVolume)
        }
      }).catch(() => {
        if (!playingNow) {
          return
        }
        failures += 1
        playingNow = false
        setPlaying(false)
        setUnavailable(true)
      })
    }

    const onEnded = () => {
      if (!playingNow || planetPlaylist.length === 0) {
        return
      }
      index = nextPlanetTrack(index, planetPlaylist.length)
      playCurrent(true)
    }

    const onError = () => {
      if (!playingNow || planetPlaylist.length === 0) {
        return
      }
      failures += 1
      if (failures >= planetPlaylist.length) {
        playingNow = false
        setPlaying(false)
        setUnavailable(true)
        return
      }
      index = nextPlanetTrack(index, planetPlaylist.length)
      playCurrent(true)
    }

    const onTime = () => {
      if (!playingNow || fadingOut || !Number.isFinite(audio.duration)) {
        return
      }
      const remaining = audio.duration - audio.currentTime
      if (remaining > 0 && remaining < planetMusicFadeMs / 1000) {
        fadingOut = true
        fadeTo(0)
      }
    }

    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    audio.addEventListener('timeupdate', onTime)

    toggleRef.current = () => {
      if (planetPlaylist.length === 0) {
        return
      }
      if (playingNow) {
        playingNow = false
        setPlaying(false)
        fadeTo(0, () => {
          if (!playingNow) {
            audio.pause()
          }
        })
        return
      }
      playingNow = true
      setPlaying(true)
      setUnavailable(false)
      playCurrent(false)
    }

    return () => {
      window.cancelAnimationFrame(frame)
      playingNow = false
      toggleRef.current = () => {}
      audio.pause()
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('timeupdate', onTime)
      audio.src = ''
      audio.load()
    }
  }, [])

  if (planetPlaylist.length === 0) {
    return null
  }

  return (
    <div className={styles.music} data-playing={playing ? 'true' : 'false'}>
      <button
        type="button"
        aria-pressed={playing}
        aria-label={playing ? 'Pause background music' : 'Play background music'}
        disabled={unavailable}
        onClick={() => toggleRef.current()}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3.2 1.8v8.4L10 6 3.2 1.8z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.4 1.8h2.4v8.4H2.4zm4.8 0h2.4v8.4H7.2z" />
    </svg>
  )
}
