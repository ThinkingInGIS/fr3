export type WorkflowStage = 'IDLE' | 'COMMAND' | 'INTENT_UNDERSTANDING' | 'TASK_PLANNING' | 'TASK_EXECUTION' | 'COMPLETED' | 'PAUSED' | 'ERROR'
export type TaskNodeStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'SKIPPED' | 'PAUSED' | 'FAILED'
export type EventLevel = 'INFO' | 'THINK' | 'PLAN' | 'VISION' | 'ACTION' | 'WARNING' | 'ERROR' | 'SUCCESS'
export type DeviceState = 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'STALE' | 'ERROR' | 'DISABLED'

export interface TaskNode {
  id: string
  parentId?: string
  order: number
  title: string
  description?: string
  status: TaskNodeStatus
  progress: number
  startTime?: number
  endTime?: number
  durationMs?: number
  children?: TaskNode[]
}

export interface WorkflowState {
  taskId: string
  command: string
  recognizedIntent?: string
  stage: WorkflowStage
  previousStage?: WorkflowStage
  currentTaskId?: string
  currentObjectId?: string
  progress: number
  message: string
  decisionReasons: string[]
  startedAt?: number
  updatedAt: number
  planningDurationMs?: number
}

export interface TaskRuntimeState {
  taskId: string
  currentTaskId?: string
  currentTaskTitle?: string
  currentObjectId?: string
  startedAt?: number
  elapsedMs: number
  planningDurationMs?: number
  totalTaskCount: number
  completedTaskCount: number
  remainingTaskCount: number
  overallProgress: number
  lastActionResult: string
  decisionReasons: string[]
  running: boolean
  updatedAt: number
}

export interface RobotTelemetry {
  timestamp: number
  jointNames: string[]
  jointPosition: number[]
  jointVelocity: number[]
  jointEffort: number[]
  tcpPosition: { x: number; y: number; z: number }
  tcpOrientation: { x: number; y: number; z: number; w: number }
  tcpLinearSpeed: number
  tcpAngularSpeed: number
  gripperWidth: number
  gripperForce: number
  gripperState: 'OPEN' | 'CLOSED' | 'GRASPING' | 'ERROR'
  controllerState: 'IDLE' | 'PLANNING' | 'EXECUTING' | 'PAUSED' | 'ERROR'
  plannedProgress: number
  executedProgress: number
}

export interface WrenchSample {
  timestamp: number
  force: { x: number; y: number; z: number }
  torque: { x: number; y: number; z: number }
}

export interface Detection {
  id: string
  className: string
  confidence: number
  source: 'WRIST' | 'GLOBAL'
  imageWidth: number
  imageHeight: number
  bbox: { x: number; y: number; width: number; height: number }
  selected: boolean
  state: 'VISIBLE' | 'OCCLUDED' | 'GRASPABLE' | 'UNREACHABLE' | 'HANDLED'
}

export interface DeviceStatus {
  id: string
  name: string
  status: DeviceState
  latencyMs?: number
  lastHeartbeat?: number
  message?: string
}

export interface ExecutionEvent {
  id: string
  timestamp: number
  level: EventLevel
  stage?: WorkflowStage
  taskId?: string
  message: string
  details?: Record<string, unknown>
}

export interface MiningPoint { x: number; y: number; z: number }
export type MiningCommand = 'pause' | 'resume' | 'cancel' | 'reset' | 'fault'
