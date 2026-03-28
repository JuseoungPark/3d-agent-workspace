import homerSfx from '../assets/sounds/homer.mp3'
import margeSfx from '../assets/sounds/marge.mp3'
import bartSfx from '../assets/sounds/bart.mp3'
import lisaSfx from '../assets/sounds/lisa.mp3'

const VOICE_SOUNDS: Record<string, string> = {
  homer: homerSfx,
  marge: margeSfx,
  bart: bartSfx,
  lisa: lisaSfx,
}

let ttsVolume = 0.27

export function setTTSVolume(v: number): void {
  ttsVolume = Math.max(0, Math.min(1, v))
}

export function getTTSVolume(): number {
  return ttsVolume
}

export function playTTS(_text: string, voiceId: string): void {
  const src = VOICE_SOUNDS[voiceId]
  if (!src) return
  try {
    const audio = new Audio(src)
    audio.volume = ttsVolume
    audio.play().catch(e => console.error('[TTS]', e))
  } catch (e) { console.error('[TTS]', e) }
}
