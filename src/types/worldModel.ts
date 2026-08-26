import type { DetectedObject } from './vision'
import type { Vec3 } from './robot'

export interface StackSlot {
  id: string
  occupied: boolean
  objectId?: string
  position: Vec3
}

export interface WorldModel {
  objects: DetectedObject[]
  slots: StackSlot[]
  selectedObjectId?: string
  nextSlotId?: string
  updatedAt: number
}
