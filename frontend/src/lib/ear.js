// Mirrors backend/app/services/liveness.py so the browser can show an
// immediate blink/liveness indicator; the server still runs its own check
// on the submitted ear_sequence before an attendance mark is accepted.

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function eyeAspectRatio(eyePoints) {
  if (eyePoints.length !== 6) {
    throw new Error('eyePoints must contain exactly 6 points')
  }
  const [p1, p2, p3, p4, p5, p6] = eyePoints
  const vertical1 = distance(p2, p6)
  const vertical2 = distance(p3, p5)
  const horizontal = distance(p1, p4)
  if (horizontal === 0) return 0
  return (vertical1 + vertical2) / (2 * horizontal)
}

export class BlinkDetector {
  constructor({ earThreshold = 0.21, consecFrames = 2, windowSize = 30 } = {}) {
    this.earThreshold = earThreshold
    this.consecFrames = consecFrames
    this.windowSize = windowSize
    this.history = []
    this.belowStreak = 0
    this.blinkCount = 0
  }

  update(leftEar, rightEar) {
    const avgEar = (leftEar + rightEar) / 2
    this.history.push({ ear: avgEar, at: Date.now() })
    if (this.history.length > this.windowSize) this.history.shift()

    let blinked = false
    if (avgEar < this.earThreshold) {
      this.belowStreak += 1
    } else {
      if (this.belowStreak >= this.consecFrames) {
        this.blinkCount += 1
        blinked = true
      }
      this.belowStreak = 0
    }
    return blinked
  }

  isLive(minBlinks = 1) {
    return this.blinkCount >= minBlinks
  }

  recentSequence() {
    return this.history.map((entry) => ({ left: entry.ear, right: entry.ear }))
  }

  reset() {
    this.history = []
    this.belowStreak = 0
    this.blinkCount = 0
  }
}
