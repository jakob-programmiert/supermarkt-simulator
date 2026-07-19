import { gameStore } from './store'

type SoundName = 'click' | 'scan' | 'coin' | 'bell' | 'success'

class GameAudio {
  private context: AudioContext | null = null

  private getContext() {
    if (typeof window === 'undefined') return null
    this.context ??= new AudioContext()
    if (this.context.state === 'suspended') void this.context.resume()
    return this.context
  }

  play(name: SoundName) {
    if (!gameStore.getSnapshot().soundEnabled) return
    const context = this.getContext()
    if (!context) return

    const patterns: Record<SoundName, Array<[number, number, number]>> = {
      click: [[420, 0, 0.045]],
      scan: [[740, 0, 0.07], [1040, 0.08, 0.09]],
      coin: [[680, 0, 0.08], [920, 0.09, 0.14]],
      bell: [[880, 0, 0.15], [1320, 0.06, 0.2]],
      success: [[520, 0, 0.1], [660, 0.1, 0.1], [820, 0.2, 0.18]],
    }

    patterns[name].forEach(([frequency, delay, duration]) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = name === 'bell' ? 'sine' : 'triangle'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, context.currentTime + delay)
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + delay + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + duration)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(context.currentTime + delay)
      oscillator.stop(context.currentTime + delay + duration + 0.02)
    })
  }
}

export const gameAudio = new GameAudio()

