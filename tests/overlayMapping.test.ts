import { describe, expect, it } from 'vitest'
import { calculateContainRect, mapBoundingBox } from '@/components/vision/overlayMapping'

describe('detection overlay mapping', () => {
  it('accounts for letterboxing when the container is taller than the video', () => {
    const media = calculateContainRect(800, 600, 1280, 720)
    expect(media).toEqual({ x: 0, y: 75, width: 800, height: 450 })
    expect(mapBoundingBox({ x: 128, y: 72, width: 256, height: 144 }, media, 1280, 720)).toEqual({ x: 80, y: 120, width: 160, height: 90 })
  })
})
