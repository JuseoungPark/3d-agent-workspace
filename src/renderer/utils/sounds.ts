let _actx: AudioContext | null = null

function getACtx(): AudioContext {
  if (!_actx) _actx = new AudioContext()
  return _actx
}

// SFX volume: 0–1, default 0.2
// Base gain values are normalized to 1.0; multiply by sfxVolume
let sfxVolume = 0.2

export function setSFXVolume(v: number): void {
  sfxVolume = Math.max(0, Math.min(1, v))
}

export function getSFXVolume(): number {
  return sfxVolume
}

export function playHit() {
  try {
    const ctx = getACtx(), now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(700, now)
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.32)
    gain.gain.setValueAtTime(0.9 * sfxVolume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc.start(now); osc.stop(now + 0.35)
  } catch (e) {}
}

export function playHeld() {
  try {
    const ctx = getACtx(), now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'square'
    osc.frequency.setValueAtTime(500, now)
    osc.frequency.setValueAtTime(750, now + 0.07)
    osc.frequency.setValueAtTime(420, now + 0.14)
    osc.frequency.setValueAtTime(680, now + 0.21)
    gain.gain.setValueAtTime(0.5 * sfxVolume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
    osc.start(now); osc.stop(now + 0.28)
  } catch (e) {}
}

export function playDrop() {
  try {
    const ctx = getACtx(), now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2)
    gain.gain.setValueAtTime(0.8 * sfxVolume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    osc.start(now); osc.stop(now + 0.25)
  } catch (e) {}
}
