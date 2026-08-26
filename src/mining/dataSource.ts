import ROSLIB from 'roslib'
import { z } from 'zod'
import { RosClient } from '@/ros/rosClient'
import { miningConfig, miningMessageTypes, miningTopics } from './config'
import { useMiningStore } from './store'
import type { Detection, DeviceStatus, MiningCommand, MiningPoint, TaskNode, WorkflowState } from './types'

export interface MiningDataSource {
  readonly mode: 'mock' | 'ros'
  connect(): void
  disconnect(): void
  sendCommand(command: string): Promise<void>
  control(command: MiningCommand): Promise<void>
  setSpeed(speed: number): void
}

const parents = [
  { id: 'rod', title: '钻杆备料', objectId: 'DrillRod-01' },
  { id: 'resin', title: '锚固剂备料', objectId: 'Resin-01' },
  { id: 'bolt', title: '锚杆备料', objectId: 'AnchorBolt-01' },
]
const actions = ['检测', '抓取', '上料']
const plan = (): TaskNode[] => parents.map((parent, parentIndex) => ({
  id: parent.id, order: parentIndex + 1, title: parent.title, status: 'PENDING', progress: 0,
  children: actions.map((action, childIndex) => ({
    id: `${parent.id}-${childIndex + 1}`, parentId: parent.id, order: childIndex + 1,
    title: `${parent.title.slice(0, -2)}${action}`, description: `${action}${parent.title.slice(0, -2)}目标`, status: 'PENDING', progress: 0,
  })),
}))

const devices = (): DeviceStatus[] => [
  ['ros', 'ROS Bridge', 12], ['fr3', 'Franka FR3', 8], ['moveit', 'MoveIt 2', 16], ['wrist', 'D435i 手腕相机', 24],
  ['global', '全局相机', 31], ['detector', '目标检测节点', 28], ['planner', '任务规划节点', 18], ['servo', '视觉伺服节点', 21], ['video', '视频服务', 34],
].map(([id, name, latency]) => ({ id: String(id), name: String(name), status: 'ONLINE', latencyMs: Number(latency), lastHeartbeat: Date.now(), message: 'Mock 数据链路' }))

const detections: Detection[] = [
  { id: 'DrillRod-01', className: '钻杆', confidence: .96, source: 'GLOBAL', imageWidth: 1280, imageHeight: 720, bbox: { x: 150, y: 235, width: 310, height: 92 }, selected: false, state: 'GRASPABLE' },
  { id: 'Resin-01', className: '锚固剂', confidence: .94, source: 'GLOBAL', imageWidth: 1280, imageHeight: 720, bbox: { x: 700, y: 184, width: 118, height: 215 }, selected: false, state: 'VISIBLE' },
  { id: 'AnchorBolt-01', className: '锚杆', confidence: .93, source: 'GLOBAL', imageWidth: 1280, imageHeight: 720, bbox: { x: 520, y: 455, width: 430, height: 73 }, selected: false, state: 'VISIBLE' },
  { id: 'DrillRod-01-W', className: '钻杆抓取段', confidence: .98, source: 'WRIST', imageWidth: 1280, imageHeight: 720, bbox: { x: 410, y: 240, width: 360, height: 168 }, selected: true, state: 'GRASPABLE' },
]

export class MiningMockDataSource implements MiningDataSource {
  readonly mode = 'mock' as const
  private frame?: number
  private previousTime = 0
  private elapsed = 0
  private stepIndex = -1
  private phase: 'idle' | 'intent' | 'planning' | 'execution' = 'idle'
  private speed = 1

  connect() {
    const store = useMiningStore()
    store.connected = true; store.devices = devices(); store.detections = detections.map((item) => ({ ...item, selected: false }))
    this.previousTime = performance.now(); this.frame = requestAnimationFrame(this.tick)
  }

  disconnect() { if (this.frame) cancelAnimationFrame(this.frame); this.frame = undefined }

  async sendCommand(command: string) {
    const store = useMiningStore(), trimmed = command.trim()
    if (!trimmed) throw new Error('请输入作业指令')
    if (store.running) throw new Error('已有任务正在执行')
    store.resetState(); store.connected = true; store.devices = devices(); store.detections = detections.map((item) => ({ ...item, selected: false }))
    store.running = true; this.elapsed = 0; this.stepIndex = -1; this.phase = 'intent'
    store.workflow = { taskId: `coal-${Date.now()}`, command: trimmed, stage: 'COMMAND', progress: 2, message: '指令已接收，等待意图理解', decisionReasons: [], startedAt: Date.now(), updatedAt: Date.now() }
    store.addEvent({ level: 'INFO', stage: 'COMMAND', message: `收到指令：${trimmed}` })
  }

  async control(command: MiningCommand) {
    const store = useMiningStore()
    if (command === 'pause' && store.running && store.workflow.stage !== 'PAUSED') {
      store.workflow.previousStage = store.workflow.stage; store.workflow.stage = 'PAUSED'; store.robot.controllerState = 'PAUSED'
      store.addEvent({ level: 'WARNING', stage: 'PAUSED', message: '任务已暂停，机械臂保持当前状态' })
    } else if (command === 'resume' && store.workflow.stage === 'PAUSED') {
      store.workflow.stage = store.workflow.previousStage ?? 'TASK_EXECUTION'; store.robot.controllerState = this.phase === 'execution' ? 'EXECUTING' : 'PLANNING'
      store.addEvent({ level: 'INFO', stage: store.workflow.stage, message: '任务继续执行' })
    } else if (command === 'cancel') {
      store.running = false; this.phase = 'idle'; store.workflow.stage = 'IDLE'; store.workflow.message = '任务取消请求已完成（非安全急停）'; store.robot.controllerState = 'IDLE'
      store.addEvent({ level: 'WARNING', stage: 'IDLE', message: '已取消当前 Web 任务请求；硬件安全由机器人控制系统负责' })
    } else if (command === 'reset') {
      store.resetState(); store.connected = true; store.devices = devices(); store.detections = detections.map((item) => ({ ...item, selected: false })); this.phase = 'idle'; this.stepIndex = -1; this.elapsed = 0
    } else if (command === 'fault' && store.running) {
      store.running = false; store.workflow.previousStage = store.workflow.stage; store.workflow.stage = 'ERROR'; store.workflow.message = '模拟故障：MoveIt 规划场景不可用'; store.robot.controllerState = 'ERROR'
      const moveit = store.devices.find((item) => item.id === 'moveit'); if (moveit) { moveit.status = 'ERROR'; moveit.message = '规划场景同步超时' }
      const current = store.currentTask; if (current) current.status = 'FAILED'
      store.addEvent({ level: 'ERROR', stage: 'ERROR', taskId: store.workflow.currentTaskId, message: '模拟故障：MoveIt 规划场景同步超时', details: { recovery: '复位显示状态后重新发送指令' } })
    }
  }

  setSpeed(speed: number) { this.speed = speed; useMiningStore().speed = speed }

  private tick = (time: number) => {
    const store = useMiningStore(), delta = Math.min(100, time - this.previousTime) * this.speed
    this.previousTime = time
    store.devices.forEach((device) => { if (device.status === 'ONLINE') device.lastHeartbeat = Date.now() })
    if (store.running && store.workflow.stage !== 'PAUSED' && store.workflow.stage !== 'ERROR') {
      this.elapsed += delta; this.update(time)
    }
    this.frame = requestAnimationFrame(this.tick)
  }

  private update(time: number) {
    const store = useMiningStore()
    if (this.phase === 'intent' && this.elapsed >= 800) {
      this.phase = 'planning'; this.elapsed = 0
      store.workflow.stage = 'INTENT_UNDERSTANDING'; store.workflow.recognizedIntent = '执行钻锚备料流程'; store.workflow.progress = 8; store.workflow.message = '已识别意图：准备钻杆、锚固剂与锚杆'
      store.workflow.decisionReasons = ['作业区域可用', '备料工序完整', '设备状态满足执行条件']; store.addEvent({ level: 'THINK', stage: 'INTENT_UNDERSTANDING', message: '已识别意图：执行钻锚备料流程' })
    } else if (this.phase === 'planning' && this.elapsed >= 1000 && !store.tasks.length) {
      store.tasks = plan(); store.workflow.stage = 'TASK_PLANNING'; store.workflow.progress = 15; store.workflow.planningDurationMs = 186; store.workflow.message = '正在生成长程任务计划'; store.robot.controllerState = 'PLANNING'
      store.addEvent({ level: 'PLAN', stage: 'TASK_PLANNING', message: '已生成 3 个父任务、9 个子任务' })
    } else if (this.phase === 'planning' && this.elapsed >= 1900) {
      this.phase = 'execution'; this.elapsed = 0; this.stepIndex = 0; this.enterStep(0)
    } else if (this.phase === 'execution') {
      const duration = 1150
      const progress = Math.min(1, this.elapsed / duration)
      this.animateRobot(time, progress)
      if (this.elapsed >= duration) { this.completeStep(); this.elapsed = 0 }
    }
  }

  private enterStep(index: number) {
    const store = useMiningStore(), flat = store.tasks.flatMap((parent) => parent.children ?? []), task = flat[index]
    if (!task) return
    const parentIndex = Math.floor(index / 3), actionIndex = index % 3, meta = parents[parentIndex]
    task.status = 'RUNNING'; task.startTime = Date.now(); task.progress = 8
    const activeParent=store.tasks[parentIndex]; if(activeParent) activeParent.status='RUNNING'
    store.workflow.stage = 'TASK_EXECUTION'; store.workflow.currentTaskId = task.id; store.workflow.currentObjectId = meta.objectId
    store.workflow.progress = 18 + (index / flat.length) * 78; store.workflow.message = `正在执行：${task.title}`; store.robot.controllerState = actionIndex === 0 ? 'PLANNING' : 'EXECUTING'
    store.detections.forEach((detection) => { detection.selected = detection.id.startsWith(meta.objectId) && (actionIndex === 0 ? detection.source === 'GLOBAL' : detection.source === 'WRIST') })
    store.plannedPath = this.pathFor(parentIndex); store.executedPath = []
    const level = actionIndex === 0 ? 'VISION' : actionIndex === 1 ? 'ACTION' : 'ACTION'
    const message = actionIndex === 0 ? `发现${meta.title.slice(0, -2)}目标 ${meta.objectId}，置信度 ${Math.round((.96 - parentIndex * .015) * 100)}%` : `正在执行${task.title}`
    store.addEvent({ level, stage: 'TASK_EXECUTION', taskId: task.id, message })
    if (actionIndex === 1) store.addEvent({ level: 'PLAN', stage: 'TASK_EXECUTION', taskId: task.id, message: 'MoveIt 路径规划成功，轨迹点 42' })
  }

  private completeStep() {
    const store = useMiningStore(), flat = store.tasks.flatMap((parent) => parent.children ?? []), task = flat[this.stepIndex]
    if (task) { task.status = 'COMPLETED'; task.progress = 100; task.endTime = Date.now(); task.durationMs = task.endTime - (task.startTime ?? task.endTime); store.lastActionResult = `${task.title}完成`; store.addEvent({ level: 'SUCCESS', stage: 'TASK_EXECUTION', taskId: task.id, message: `${task.title}完成` }) }
    store.tasks.forEach((parent) => {
      const children = parent.children ?? []; parent.progress = children.reduce((sum, child) => sum + child.progress, 0) / Math.max(1, children.length)
      parent.status = children.every((child) => child.status === 'COMPLETED') ? 'COMPLETED' : children.some((child) => child.status === 'RUNNING') ? 'RUNNING' : 'PENDING'
    })
    this.stepIndex += 1
    if (this.stepIndex >= flat.length) {
      this.phase = 'idle'; store.running = false; store.workflow.stage = 'COMPLETED'; store.workflow.progress = 100; store.workflow.currentTaskId = undefined; store.workflow.currentObjectId = undefined; store.workflow.message = '钻锚备料作业全部完成'; store.robot.controllerState = 'IDLE'; store.robot.executedProgress = 100
      store.detections.forEach((detection) => { detection.selected = false; detection.state = 'HANDLED' }); store.addEvent({ level: 'SUCCESS', stage: 'COMPLETED', message: '钻杆、锚固剂和锚杆备料全部完成' }); return
    }
    this.enterStep(this.stepIndex)
  }

  private animateRobot(time: number, progress: number) {
    const store = useMiningStore(), phase = this.stepIndex * .72 + progress * Math.PI
    const home=[-.28,-.52,.18,-1.62,.12,1.28,.54]
    store.robot.timestamp = Date.now(); store.robot.jointPosition = store.robot.jointNames.map((_, index) => (home[index]??0)+Math.sin(phase + index * .55) * (.08 + index * .006))
    store.robot.jointVelocity = store.robot.jointNames.map((_, index) => Math.cos(phase + index * .55) * .12); store.robot.jointEffort = store.robot.jointNames.map((_, index) => 3.5 + Math.sin(time / 800 + index) * .8)
    store.robot.tcpPosition = { x: .34 + progress * .22, y: -.14 + Math.sin(phase) * .06, z: .38 - progress * .18 }
    store.robot.tcpLinearSpeed = progress > .95 ? .01 : .12 + Math.sin(progress * Math.PI) * .08; store.robot.tcpAngularSpeed = .18 + Math.cos(progress * Math.PI) * .06
    store.robot.gripperWidth = this.stepIndex % 3 === 1 ? .075 * (1 - progress) : this.stepIndex % 3 === 2 ? .018 : .075
    store.robot.gripperForce = this.stepIndex % 3 === 1 ? progress * 26 : this.stepIndex % 3 === 2 ? 24 : 0; store.robot.gripperState = store.robot.gripperWidth < .025 ? 'CLOSED' : 'OPEN'
    store.robot.plannedProgress = 100; store.robot.executedProgress = progress * 100
    const pathIndex = Math.floor(progress * (store.plannedPath.length - 1)); store.executedPath = store.plannedPath.slice(0, Math.max(1, pathIndex + 1))
    const task = store.currentTask; if (task) task.progress = Math.max(8, progress * 100)
  }

  private pathFor(index: number): MiningPoint[] {
    const offset = index * .11
    return [{ x: .2, y: .05, z: .52 }, { x: .32, y: -.03 + offset, z: .46 }, { x: .44, y: -.12 + offset, z: .32 }, { x: .55, y: -.18 + offset, z: .18 }]
  }
}

export const workflowSchema = z.object({ taskId: z.string(), command: z.string(), stage: z.enum(['IDLE','COMMAND','INTENT_UNDERSTANDING','TASK_PLANNING','TASK_EXECUTION','COMPLETED','PAUSED','ERROR']), progress: z.number(), message: z.string(), decisionReasons: z.array(z.string()), updatedAt: z.number() })
const taskStatusSchema = z.enum(['PENDING','RUNNING','COMPLETED','SKIPPED','PAUSED','FAILED'])
const taskNodeSchema: z.ZodType<TaskNode> = z.lazy(() => z.object({ id:z.string(),parentId:z.string().optional(),order:z.number(),title:z.string(),description:z.string().optional(),status:taskStatusSchema,progress:z.number(),startTime:z.number().optional(),endTime:z.number().optional(),durationMs:z.number().optional(),children:z.array(taskNodeSchema).optional() }))
const detectionSchema: z.ZodType<Detection> = z.object({ id:z.string(),className:z.string(),confidence:z.number().min(0).max(1),source:z.enum(['WRIST','GLOBAL']),imageWidth:z.number().positive(),imageHeight:z.number().positive(),bbox:z.object({x:z.number(),y:z.number(),width:z.number(),height:z.number()}),selected:z.boolean(),state:z.enum(['VISIBLE','OCCLUDED','GRASPABLE','UNREACHABLE','HANDLED']) })
const deviceSchema: z.ZodType<DeviceStatus> = z.object({ id:z.string(),name:z.string(),status:z.enum(['ONLINE','OFFLINE','CONNECTING','STALE','ERROR','DISABLED']),latencyMs:z.number().optional(),lastHeartbeat:z.number().optional(),message:z.string().optional() })
const eventSchema = z.object({ id:z.string().optional(),timestamp:z.number().optional(),level:z.enum(['INFO','THINK','PLAN','VISION','ACTION','WARNING','ERROR','SUCCESS']),stage:z.enum(['IDLE','COMMAND','INTENT_UNDERSTANDING','TASK_PLANNING','TASK_EXECUTION','COMPLETED','PAUSED','ERROR']).optional(),taskId:z.string().optional(),message:z.string(),details:z.record(z.string(),z.unknown()).optional() })
const parseStringJson = (message: unknown) => typeof message === 'object' && message !== null && 'data' in message ? JSON.parse(String((message as { data: unknown }).data)) : message
export const adaptMiningWorkflow = (message: unknown): WorkflowState => workflowSchema.parse(parseStringJson(message)) as WorkflowState

type JointStateMessage = { name?:unknown;position?:unknown;velocity?:unknown;effort?:unknown }
export const adaptJointState = (message: JointStateMessage) => {
  if(!Array.isArray(message.name)||!Array.isArray(message.position))throw new Error('JointState 缺少 name 或 position 数组')
  const count=Math.min(message.name.length,message.position.length)
  const names=message.name.slice(0,count).map(String),positions=message.position.slice(0,count).map(Number)
  if(!count||positions.some(value=>!Number.isFinite(value)))throw new Error('JointState 关节数据为空或包含非法角度')
  const optional=(value:unknown)=>Array.isArray(value)?value.slice(0,count).map(Number).map(item=>Number.isFinite(item)?item:0):[]
  return { names,positions,velocities:optional(message.velocity),efforts:optional(message.effort) }
}

export class MiningRosDataSource implements MiningDataSource {
  readonly mode = 'ros' as const
  private client?: RosClient
  private subscriptions: ROSLIB.Topic[] = []
  private commandTopic?: ROSLIB.Topic

  connect() {
    const store = useMiningStore(); store.connected = false
    this.client = new RosClient(miningConfig.rosbridgeUrl, (status) => {
      store.connected = status === 'online'
      if (status === 'online') this.subscribe()
    }); this.client.connect()
  }
  disconnect() { this.subscriptions.forEach((topic) => topic.unsubscribe()); this.client?.disconnect() }
  async sendCommand(command: string) {
    if (!this.commandTopic) throw new Error('ROS 尚未连接，指令未发送')
    this.commandTopic.publish(new ROSLIB.Message({ data: command }))
  }
  async control(command: MiningCommand) {
    if (!this.commandTopic) throw new Error('ROS 尚未连接，控制请求未发送')
    this.commandTopic.publish(new ROSLIB.Message({ data: JSON.stringify({ command, requestedAt: Date.now() }) }))
  }
  setSpeed(speed: number) { useMiningStore().speed = speed }
  private subscribe() {
    const ros = this.client?.connection; if (!ros) return
    const store=useMiningStore()
    const subscribeJson=<T>(name:string,schema:z.ZodType<T>,apply:(value:T)=>void,label:string)=>{const topic=new ROSLIB.Topic({ros,name,messageType:miningMessageTypes.string,throttle_rate:80});topic.subscribe(message=>{try{apply(schema.parse(parseStringJson(message)))}catch(error){console.warn(`[Mining ROS] 已丢弃非法${label}消息`,error)}});this.subscriptions.push(topic)}
    subscribeJson(miningTopics.workflow,workflowSchema,value=>{store.workflow=value as WorkflowState},'工作流')
    subscribeJson(miningTopics.taskPlan,z.array(taskNodeSchema),value=>{store.tasks=value},'任务计划')
    subscribeJson(miningTopics.detections,z.array(detectionSchema),value=>{store.detections=value},'检测结果')
    subscribeJson(miningTopics.devices,z.array(deviceSchema),value=>{store.devices=value},'设备状态')
    subscribeJson(miningTopics.events,eventSchema,value=>{store.events.push({ ...value,id:value.id??crypto.randomUUID(),timestamp:value.timestamp??Date.now() })},'执行事件')
    const joints=new ROSLIB.Topic({ros,name:miningTopics.joints,messageType:miningMessageTypes.jointState,throttle_rate:50});joints.subscribe(message=>{try{const data=adaptJointState(message as JointStateMessage);store.robot.jointNames=data.names;store.robot.jointPosition=data.positions;store.robot.jointVelocity=data.velocities;store.robot.jointEffort=data.efforts;store.robot.controllerState=data.velocities.some(value=>Math.abs(value)>.001)?'EXECUTING':'IDLE';store.robot.timestamp=Date.now()}catch(error){console.warn('[Mining ROS] 已丢弃非法 JointState 消息',error)}});this.subscriptions.push(joints)
    this.commandTopic = new ROSLIB.Topic({ ros, name: miningTopics.command, messageType: miningMessageTypes.string })
  }
}

let source: MiningDataSource | undefined
export const getMiningDataSource = () => source ??= miningConfig.mode === 'ros' ? new MiningRosDataSource() : new MiningMockDataSource()
