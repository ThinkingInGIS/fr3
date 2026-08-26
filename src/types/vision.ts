import type { Pose } from './robot'

export type ObjectState = 'graspable' | 'selected' | 'occluded' | 'unreachable' | 'grasped' | 'placed'

export interface BoundingBox { x: number; y: number; width: number; height: number }

export interface DetectedObject {
  id: string
  className: string
  confidence: number
  bbox2d?: BoundingBox
  pose?: Pose
  state: ObjectState
  graspScore?: number
}

export interface VideoMetadata {
  width: number
  height: number
  connected: boolean
  lastUpdate: number
}
