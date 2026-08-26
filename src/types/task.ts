export type TaskStage =
  | 'IDLE' | 'PERCEPTION' | 'TARGET_SELECTION' | 'MOTION_PLANNING'
  | 'APPROACH' | 'VISUAL_SERVO' | 'GRASP' | 'LIFT' | 'TRANSPORT'
  | 'PLACE' | 'VERIFY' | 'FINISH' | 'PAUSED' | 'ERROR'

export interface TaskState {
  taskId: string
  taskName: string
  stage: TaskStage
  targetId?: string
  targetSlotId?: string
  progress: number
  total: number
  reasons: string[]
  message: string
  updatedAt: number
  planningMs?: number
  trajectoryLengthM?: number
  graspScore?: number
}

export interface ServoError {
  timestamp: number
  translationMm: { x: number; y: number; z: number }
  rotationDeg: { x: number; y: number; z: number }
  translationNormMm: number
  thresholdMm: number
  status: 'INACTIVE' | 'ALIGNING' | 'CONVERGED' | 'FAILED'
}

export interface TaskEvent {
  id: string
  timestamp: number
  level: 'info' | 'success' | 'warning' | 'error'
  stage: TaskStage
  message: string
}

export type SystemCommand = 'start' | 'pause' | 'resume' | 'stop' | 'reset'
