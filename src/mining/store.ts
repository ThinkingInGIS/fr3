import { defineStore } from 'pinia'
import { miningConfig } from './config'
import type { Detection, DeviceStatus, ExecutionEvent, JointPositionSample, MiningPoint, RobotTelemetry, TaskNode, TaskRuntimeState, WorkflowState, WrenchSample } from './types'

const jointNames = Array.from({ length: 7 }, (_, index) => `fr3_joint${index + 1}`)
const robotInitial = (): RobotTelemetry => ({
  timestamp: Date.now(), jointNames, jointPosition: [-.28,-.52,.18,-1.62,.12,1.28,.54], jointVelocity: Array(7).fill(0), jointEffort: Array(7).fill(0),
  tcpPosition: { x: .38, y: .02, z: .45 }, tcpOrientation: { x: 0, y: .707, z: 0, w: .707 },
  tcpLinearSpeed: 0, tcpAngularSpeed: 0, gripperWidth: .08, gripperForce: 0, gripperState: 'OPEN',
  controllerState: 'IDLE', plannedProgress: 0, executedProgress: 0,
})

const workflowInitial = (): WorkflowState => ({ taskId: '', command: '', stage: 'IDLE', progress: 0, message: '等待下达作业指令', decisionReasons: [], updatedAt: Date.now() })
const runtimeInitial = (): TaskRuntimeState => ({
  taskId: '', elapsedMs: 0, totalTaskCount: 0, completedTaskCount: 0, remainingTaskCount: 0,
  overallProgress: 0, lastActionResult: '—', decisionReasons: [], running: false, updatedAt: Date.now(),
})

export const useMiningStore = defineStore('miningBrain', {
  state: () => ({
    workflow: workflowInitial(),
    runtime: runtimeInitial(),
    tasks: [] as TaskNode[],
    robot: robotInitial(),
    detections: [] as Detection[],
    devices: [] as DeviceStatus[],
    events: [] as ExecutionEvent[],
    plannedPath: [] as MiningPoint[],
    executedPath: [] as MiningPoint[],
    wrenchHistory: [] as WrenchSample[],
    jointPositionHistory: [] as JointPositionSample[],
    speed: 1,
    connected: false,
    running: false,
    mode: miningConfig.mode,
    lastActionResult: '—',
    taskPlanExpandRequest: 0,
    safetyViolation: false,
  }),
  getters: {
    currentTask(state): TaskNode | undefined {
      return state.tasks.flatMap((task) => task.children ?? []).find((task) => task.id === state.workflow.currentTaskId)
    },
    remainingTasks(state): number {
      if (state.mode === 'ros' && state.runtime.taskId) return state.runtime.remainingTaskCount
      return state.tasks.flatMap((task) => task.children ?? []).filter((task) => !['COMPLETED', 'SKIPPED'].includes(task.status)).length
    },
  },
  actions: {
    addEvent(event: Omit<ExecutionEvent, 'id' | 'timestamp'>) {
      this.events.push({ ...event, id: `${Date.now()}-${this.events.length}`, timestamp: Date.now() })
      if (this.events.length > miningConfig.maxLogCount) this.events.splice(0, this.events.length - miningConfig.maxLogCount)
    },
    addReceivedEvent(event: ExecutionEvent) {
      if (this.events.some((item) => item.id === event.id)) return
      this.events.push(event)
      if (this.events.length > miningConfig.maxLogCount) this.events.splice(0, this.events.length - miningConfig.maxLogCount)
    },
    setPlannedPath(points: MiningPoint[]) {
      this.plannedPath = points; this.executedPath = []
    },
    appendExecutedPoint(point: MiningPoint) {
      const previous=this.executedPath.at(-1)
      if(previous&&Math.hypot(previous.x-point.x,previous.y-point.y,previous.z-point.z)<.003)return
      this.executedPath.push(point)
      if(this.executedPath.length>800)this.executedPath.splice(0,this.executedPath.length-800)
    },
    appendWrenchSample(sample: WrenchSample) {
      this.wrenchHistory.push(sample)
      if(this.wrenchHistory.length>240)this.wrenchHistory.splice(0,this.wrenchHistory.length-240)
    },
    appendJointPositionSample(sample: JointPositionSample) {
      this.jointPositionHistory.push(sample)
      if(this.jointPositionHistory.length>480)this.jointPositionHistory.splice(0,this.jointPositionHistory.length-480)
    },
    setSafetyViolation(active: boolean) { this.safetyViolation = active },
    resetState() {
      this.workflow = workflowInitial(); this.runtime = runtimeInitial(); this.tasks = []; this.robot = robotInitial(); this.detections = []
      this.events = []; this.plannedPath = []; this.executedPath = []; this.wrenchHistory = []; this.jointPositionHistory = []; this.running = false; this.lastActionResult = '—'; this.safetyViolation = false
    },
  },
})
