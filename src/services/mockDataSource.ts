import { useConnectionStore } from '@/stores/connection'
import { useRobotStore } from '@/stores/robot'
import { useTaskStore } from '@/stores/task'
import { useVisionStore } from '@/stores/vision'
import { useWorldModelStore } from '@/stores/worldModel'
import type { DetectedObject } from '@/types/vision'
import type { TaskStage, SystemCommand } from '@/types/task'
import type { DataSource } from './dataSource'

const targets = ['Obj-04', 'Obj-02', 'Obj-06', 'Obj-01', 'Obj-05', 'Obj-03']
const slots = ['Slot-03', 'Slot-01', 'Slot-05', 'Slot-02', 'Slot-06', 'Slot-04']

const seedObjects = (): DetectedObject[] => [
  { id: 'Obj-01', className: '蓝色方块', confidence: .96, bbox2d: { x: 175, y: 208, width: 146, height: 130 }, pose: pose(.42, .21, .035), state: 'graspable', graspScore: .89 },
  { id: 'Obj-02', className: '青色圆柱', confidence: .94, bbox2d: { x: 760, y: 178, width: 128, height: 156 }, pose: pose(.48, .05, .055), state: 'graspable', graspScore: .93 },
  { id: 'Obj-03', className: '橙色方块', confidence: .91, bbox2d: { x: 426, y: 382, width: 142, height: 124 }, pose: pose(.54, .25, .035), state: 'occluded', graspScore: .72 },
  { id: 'Obj-04', className: '青绿色方块', confidence: .98, bbox2d: { x: 492, y: 198, width: 152, height: 138 }, pose: pose(.39, -.10, .035), state: 'graspable', graspScore: .96 },
  { id: 'Obj-05', className: '紫色圆柱', confidence: .88, bbox2d: { x: 913, y: 384, width: 118, height: 146 }, pose: pose(.59, .10, .055), state: 'graspable', graspScore: .84 },
  { id: 'Obj-06', className: '黄色方块', confidence: .93, bbox2d: { x: 282, y: 430, width: 138, height: 118 }, pose: pose(.45, -.24, .035), state: 'graspable', graspScore: .91 },
]

function pose(x: number, y: number, z: number) {
  return { frameId: 'world', position: { x, y, z }, orientation: { x: 0, y: 0, z: 0, w: 1 } }
}

const stageFlow: { stage: TaskStage; duration: number; loop: string; message: string }[] = [
  { stage: 'PERCEPTION', duration: 900, loop: '感知', message: '场景感知：发现 6 个候选目标' },
  { stage: 'TARGET_SELECTION', duration: 1100, loop: '理解', message: '空间理解：评估可见性、遮挡与可达性' },
  { stage: 'MOTION_PLANNING', duration: 1100, loop: '规划', message: '已生成无碰撞抓取轨迹' },
  { stage: 'APPROACH', duration: 1500, loop: '执行', message: '机械臂沿规划轨迹接近预抓取位姿' },
  { stage: 'VISUAL_SERVO', duration: 1900, loop: '反馈', message: '视觉伺服正在精定位并闭环收敛' },
  { stage: 'GRASP', duration: 800, loop: '执行', message: '夹爪闭合，确认稳定抓取' },
  { stage: 'LIFT', duration: 700, loop: '执行', message: '目标已提升并脱离工作面' },
  { stage: 'TRANSPORT', duration: 1300, loop: '执行', message: '搬运至目标码放槽位' },
  { stage: 'PLACE', duration: 800, loop: '执行', message: '柔顺放置并释放目标' },
  { stage: 'VERIFY', duration: 1000, loop: '反馈', message: '视觉验证：槽位占用与放置姿态正确' },
]

export class MockDataSource implements DataSource {
  readonly mode = 'mock' as const
  private timer?: number
  private stageIndex = 0
  private stageElapsed = 0
  private previousTime = 0
  private targetIndex = 0
  private speed = 1

  connect() {
    const connection = useConnectionStore(), vision = useVisionStore(), world = useWorldModelStore()
    connection.setRos('online')
    connection.video = 'online'
    world.objects = seedObjects()
    vision.setDetections(world.objects)
  }

  disconnect() { if (this.timer) cancelAnimationFrame(this.timer); this.timer = undefined }

  async command(command: SystemCommand) {
    const task = useTaskStore(), robot = useRobotStore()
    if (command === 'start') this.start()
    if (command === 'pause' && task.running) { task.paused = true; task.current.stage = 'PAUSED'; robot.motionState = 'PAUSED' }
    if (command === 'resume' && task.running) { task.paused = false; this.enterStage(this.stageIndex) }
    if (command === 'stop') { task.running = false; task.paused = false; task.setTask({ stage: 'IDLE', message: '演示已安全停止' }); robot.motionState = 'IDLE' }
    if (command === 'reset') this.reset()
  }

  setSpeed(speed: number) { this.speed = speed; useTaskStore().speed = speed }

  private start() {
    const task = useTaskStore()
    if (task.current.stage === 'FINISH') this.reset()
    const needsEntry = !task.running
    task.running = true; task.paused = false
    if (needsEntry) this.enterStage(this.stageIndex)
    if (!this.timer) { this.previousTime = performance.now(); this.timer = requestAnimationFrame(this.tick) }
  }

  private reset() {
    const task = useTaskStore(), robot = useRobotStore(), world = useWorldModelStore(), vision = useVisionStore()
    task.reset(); robot.reset(); world.reset(); world.objects = seedObjects(); vision.setDetections(world.objects)
    this.stageIndex = 0; this.stageElapsed = 0; this.targetIndex = 0
  }

  private tick = (time: number) => {
    const task = useTaskStore()
    const delta = Math.min(100, time - this.previousTime) * this.speed
    this.previousTime = time
    if (task.running && !task.paused) {
      this.stageElapsed += delta
      this.animate(this.stageElapsed / stageFlow[this.stageIndex].duration)
      if (this.stageElapsed >= stageFlow[this.stageIndex].duration) this.advance()
    }
    this.timer = requestAnimationFrame(this.tick)
  }

  private enterStage(index: number) {
    const task = useTaskStore(), robot = useRobotStore(), world = useWorldModelStore(), vision = useVisionStore()
    const step = stageFlow[index], targetId = targets[this.targetIndex], slotId = slots[this.targetIndex]
    task.setTask({
      stage: step.stage, targetId, targetSlotId: slotId, message: step.message,
      reasons: step.stage === 'TARGET_SELECTION' ? ['视野完整', '遮挡较少', 'IK 可达', '碰撞代价最低'] : task.current.reasons,
      planningMs: step.stage === 'MOTION_PLANNING' ? 148 : task.current.planningMs,
      trajectoryLengthM: step.stage === 'MOTION_PLANNING' ? .84 : task.current.trajectoryLengthM,
      graspScore: world.objects.find((item) => item.id === targetId)?.graspScore,
    })
    task.activeLoop = step.loop
    robot.motionState = ['APPROACH', 'LIFT', 'TRANSPORT', 'PLACE'].includes(step.stage) ? 'MOVING' : 'IDLE'
    world.selectedObjectId = targetId; world.nextSlotId = slotId
    world.objects.forEach((object) => {
      if (object.id === targetId && !['grasped', 'placed'].includes(object.state)) object.state = 'selected'
    })
    vision.setDetections([...world.objects])
    if (step.stage === 'MOTION_PLANNING') robot.trajectory = [
      { x: .22, y: 0, z: .55 }, { x: .29, y: -.03, z: .48 }, { x: .34, y: -.07, z: .32 }, { x: .39, y: -.10, z: .13 },
    ]
    task.addEvent({ level: step.stage === 'VERIFY' ? 'success' : 'info', stage: step.stage, message: step.message })
  }

  private advance() {
    const task = useTaskStore(), robot = useRobotStore(), world = useWorldModelStore(), vision = useVisionStore()
    const finishedStage = stageFlow[this.stageIndex].stage
    const targetId = targets[this.targetIndex], slotId = slots[this.targetIndex]
    if (finishedStage === 'GRASP') world.objects.find((item) => item.id === targetId)!.state = 'grasped'
    if (finishedStage === 'PLACE') {
      const object = world.objects.find((item) => item.id === targetId)!, slot = world.slots.find((item) => item.id === slotId)!
      object.state = 'placed'; slot.occupied = true; slot.objectId = targetId
    }
    if (finishedStage === 'VERIFY') {
      task.current.progress += 1
      this.targetIndex += 1
      if (this.targetIndex >= targets.length) {
        world.selectedObjectId = undefined; world.nextSlotId = undefined
        task.setTask({ stage: 'FINISH', message: '全部目标码放完成，任务验证通过', targetId: undefined, targetSlotId: undefined })
        task.running = false; task.activeLoop = '反馈'; robot.motionState = 'IDLE'; robot.trajectory = []
        task.addEvent({ level: 'success', stage: 'FINISH', message: '6 / 6 目标全部码放完成' })
        vision.setDetections([...world.objects]); return
      }
      this.stageIndex = 0
    } else this.stageIndex += 1
    this.stageElapsed = 0
    world.updatedAt = Date.now(); vision.setDetections([...world.objects]); this.enterStage(this.stageIndex)
  }

  private animate(progress: number) {
    const task = useTaskStore(), robot = useRobotStore()
    const p = Math.min(1, progress), stage = stageFlow[this.stageIndex].stage
    const wave = Math.sin((this.targetIndex * 1.7 + p) * Math.PI)
    robot.updateJoints({
      fr3_joint1: -.28 + this.targetIndex * .08 + p * .18,
      fr3_joint2: -.42 + wave * .13,
      fr3_joint3: .08 + p * .16,
      fr3_joint4: -1.72 + p * .25,
      fr3_joint5: .12 + wave * .1,
      fr3_joint6: 1.42 - p * .2,
      fr3_joint7: .63 + p * .16,
    })
    if (stage === 'VISUAL_SERVO') {
      const norm = Math.max(.72, 20.4 * Math.exp(-4.2 * p))
      task.addServo({ timestamp: Date.now(), translationMm: { x: norm * .7, y: norm * .42, z: norm * .21 }, rotationDeg: { x: norm * .08, y: norm * .05, z: norm * .03 }, translationNormMm: norm, thresholdMm: 1, status: norm <= 1 ? 'CONVERGED' : 'ALIGNING' })
    }
    robot.gripperWidth = stage === 'GRASP' || ['LIFT', 'TRANSPORT', 'PLACE', 'VERIFY'].includes(stage) ? .07 * (1 - p) : robot.gripperWidth
  }
}
