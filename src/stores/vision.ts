import { defineStore } from 'pinia'
import type { DetectedObject, VideoMetadata } from '@/types/vision'

export const useVisionStore = defineStore('vision', {
  state: (): { detections: DetectedObject[]; video: VideoMetadata; activeView: string } => ({
    detections: [],
    video: { width: 1280, height: 720, connected: true, lastUpdate: Date.now() },
    activeView: 'AI 识别',
  }),
  actions: {
    setDetections(detections: DetectedObject[]) { this.detections = detections; this.video.lastUpdate = Date.now() },
  },
})
