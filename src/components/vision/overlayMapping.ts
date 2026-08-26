import type { BoundingBox } from '@/types/vision'

export interface MediaRect { x: number; y: number; width: number; height: number }

export function calculateContainRect(containerWidth: number, containerHeight: number, mediaWidth: number, mediaHeight: number): MediaRect {
  const scale = Math.min(containerWidth / mediaWidth, containerHeight / mediaHeight)
  const width = mediaWidth * scale, height = mediaHeight * scale
  return { x: (containerWidth - width) / 2, y: (containerHeight - height) / 2, width, height }
}

export function mapBoundingBox(box: BoundingBox, media: MediaRect, sourceWidth: number, sourceHeight: number): BoundingBox {
  return {
    x: media.x + box.x * media.width / sourceWidth,
    y: media.y + box.y * media.height / sourceHeight,
    width: box.width * media.width / sourceWidth,
    height: box.height * media.height / sourceHeight,
  }
}
