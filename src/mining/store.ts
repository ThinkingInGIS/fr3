import { defineStore } from 'pinia'
import { miningConfig } from './config'
import type { Detection, DeviceStatus, ExecutionEvent, MiningPoint, RobotTelemetry, TaskNode, WorkflowState } from './types'

const jointNames = Array.from({ length: 7 }, (_, index) => `fr3_joint${index + 1}`)
const robotInitial = (): RobotTelemetry => ({
  timestamp: Date.now(), jointNames, jointPosition: [-.28,-.52,.18,-1.62,.12,1.28,.54], jointVelocity: Array(7).fill(0), jointEffort: Array(7).fill(0),
  tcpPosition: { x: .38, y: .02, z: .45 }, tcpOrientation: { x: 0, y: .707, z: 0, w: .707 },
  tcpLinearSpeed: 0, tcpAngularSpeed: 0, gripperWidth: .08, gripperForce: 0, gripperState: 'OPEN',
  controllerState: 'IDLE', plannedProgress: 0, executedProgress: 0,
})

const workflowInitial = (): WorkflowState => ({ taskId: '', command: '', stage: 'IDLE', progress: 0, message: '等待下达作业指令', decisionReasons: [], updatedAt: Date.now() })

export const useMiningStore = defineStore('miningBrain', {
  state: () => ({
    workflow: workflowInitial(),
    tasks: [] as TaskNode[],
    robot: robotInitial(),
    detections: [] as Detection[],
    devices: [] as DeviceStatus[],
    events: [] as ExecutionEvent[],
    plannedPath: [] as MiningPoint[],
    executedPath: [] as MiningPoint[],
    speed: 1,
    connected: false,
    running: false,
    mode: miningConfig.mode,
    lastActionResult: '—',
  }),
  getters: {
    currentTask(state): TaskNode | undefined {
      return state.tasks.flatMap((task) => task.children ?? []).find((task) => task.id === state.workflow.currentTaskId)
    },
    remainingTasks(state): number {
      return state.tasks.flatMap((task) => task.children ?? []).filter((task) => !['COMPLETED', 'SKIPPED'].includes(task.status)).length
    },
  },
  actions: {
    addEvent(event: Omit<ExecutionEvent, 'id' | 'timestamp'>) {
      this.events.push({ ...event, id: `${Date.now()}-${this.events.length}`, timestamp: Date.now() })
      if (this.events.length > miningConfig.maxLogCount) this.events.splice(0, this.events.length - miningConfig.maxLogCount)
    },
    resetState() {
      this.workflow = workflowInitial(); this.tasks = []; this.robot = robotInitial(); this.detections = []
      this.events = []; this.plannedPath = []; this.executedPath = []; this.running = false; this.lastActionResult = '—'
    },
  },
})
