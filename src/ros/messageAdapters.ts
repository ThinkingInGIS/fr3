import { z } from 'zod'
import type { DetectedObject } from '@/types/vision'
import type { ServoError, TaskEvent, TaskState } from '@/types/task'
import { createUuid } from '@/utils/uuid'

const objectState = z.enum(['graspable', 'selected', 'occluded', 'unreachable', 'grasped', 'placed'])
const detectedObjectSchema = z.object({
  id: z.string(), className: z.string(), confidence: z.number().min(0).max(1), state: objectState,
  bbox2d: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).optional(),
  graspScore: z.number().optional(),
})

const taskStage = z.enum(['IDLE', 'PERCEPTION', 'TARGET_SELECTION', 'MOTION_PLANNING', 'APPROACH', 'VISUAL_SERVO', 'GRASP', 'LIFT', 'TRANSPORT', 'PLACE', 'VERIFY', 'FINISH', 'PAUSED', 'ERROR'])
const taskSchema = z.object({
  taskId: z.string(), taskName: z.string(), stage: taskStage, targetId: z.string().optional(),
  targetSlotId: z.string().optional(), progress: z.number(), total: z.number(), reasons: z.array(z.string()),
  message: z.string(), updatedAt: z.number().default(() => Date.now()), planningMs: z.number().optional(),
  trajectoryLengthM: z.number().optional(), graspScore: z.number().optional(),
})
const servoSchema = z.object({
  timestamp: z.number(),
  translationMm: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  rotationDeg: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  translationNormMm: z.number(), thresholdMm: z.number(),
  status: z.enum(['INACTIVE', 'ALIGNING', 'CONVERGED', 'FAILED']),
})
const taskEventSchema = z.object({
  id: z.string().default(createUuid), timestamp: z.number().default(() => Date.now()),
  level: z.enum(['info', 'success', 'warning', 'error']), stage: taskStage, message: z.string(),
})

const parseJson = (value: unknown): unknown => {
  if (typeof value === 'string') return JSON.parse(value)
  if (value && typeof value === 'object' && 'data' in value) return JSON.parse(String((value as { data: unknown }).data))
  return value
}

export const adaptDetections = (message: unknown): DetectedObject[] => z.array(detectedObjectSchema).parse(parseJson(message))
export const adaptTaskState = (message: unknown): TaskState => taskSchema.parse(parseJson(message))
export const adaptServoError = (message: unknown): ServoError => servoSchema.parse(parseJson(message))
export const adaptTaskEvent = (message: unknown): TaskEvent => taskEventSchema.parse(parseJson(message))

export const safeAdapt = <T>(adapter: (value: unknown) => T, value: unknown, label: string): T | undefined => {
  try { return adapter(value) } catch (error) { console.warn(`[ROS] 已忽略非法 ${label} 消息`, error); return undefined }
}
