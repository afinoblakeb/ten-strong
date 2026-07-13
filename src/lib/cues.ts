// D5 timer cues: a short generated WebAudio two-tone chime (no asset files — offline-safe) plus
// navigator.vibrate where supported. iOS only allows audio after a user gesture, so unlockAudio()
// must be called from the first tap; after that programmatic chimes fired from timers are allowed.
// The visual pulse companion is a CSS class the workout page toggles on itself (see workout.css).

export type CueKind = 'rest-end' | 'hold-end' | 'switch-sides' | 'finisher-done'

let context: AudioContext | null = null
let unlocked = false

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try { if (!context) context = new Ctor() } catch { return null }
  return context
}

/** Call from any user gesture (first tap on the workout page): creates and resumes the
 * AudioContext and plays one silent sample so iOS treats it as user-activated. Idempotent. */
export function unlockAudio() {
  const ctx = ensureContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume().catch(() => { /* stays locked until the next gesture */ })
  if (unlocked) return
  unlocked = true
  try {
    const source = ctx.createBufferSource()
    source.buffer = ctx.createBuffer(1, 1, 22050)
    source.connect(ctx.destination)
    source.start(0)
  } catch { unlocked = false }
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, peak = 0.25) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

// Two-tone chimes (~0.3s total). Rising = go/next, level double-tap = switch, higher rise = done.
const chimes: Record<CueKind, [number, number]> = {
  'rest-end': [784, 1175],       // G5 → D6
  'hold-end': [880, 1319],       // A5 → E6
  'switch-sides': [988, 988],    // B5 · B5
  'finisher-done': [880, 1568],  // A5 → G6
}

/** Fire the audio + haptic cue for a timer event. `enabled` gates BOTH sound and vibration
 * (profile.soundCues — the Settings toggle is labelled "Timer sound & vibration"). */
export function fireCue(kind: CueKind, enabled: boolean) {
  if (!enabled) return
  const ctx = ensureContext()
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume().catch(() => { /* no gesture yet */ })
    try {
      const now = ctx.currentTime
      const [first, second] = chimes[kind]
      tone(ctx, first, now, 0.16)
      tone(ctx, second, now + 0.14, 0.18)
    } catch { /* audio node creation failed — vibration below still runs */ }
  }
  try { if ('vibrate' in navigator) navigator.vibrate(kind === 'switch-sides' ? [150] : [200, 100, 200]) } catch { /* unsupported */ }
}
