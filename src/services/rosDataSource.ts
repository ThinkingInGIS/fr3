import ROSLIB from '@/ros/roslibBrowser'
import { runtimeConfig } from '@/config/runtime'
import { useConnectionStore } from '@/stores/connection'
import { useRobotStore } from '@/stores/robot'
import { useVisionStore } from '@/stores/vision'
import { useTaskStore } from '@/stores/task'
import { RosClient } from '@/ros/rosClient'
import { topicRegistry } from '@/ros/topicRegistry'
import { CommandService } from '@/ros/commandService'
import { adaptDetections, adaptServoError, adaptTaskEvent, adaptTaskState, safeAdapt } from '@/ros/messageAdapters'
import type { DataSource } from './dataSource'
import type { SystemCommand } from '@/types/task'

export class RosDataSource implements DataSource {
  readonly mode = 'ros' as const
  private client?: RosClient
  private subscriptions: ROSLIB.Topic[] = []
  private commands?: CommandService

  connect() {
    const connection = useConnectionStore()
    this.client = new RosClient(runtimeConfig.rosbridgeUrl, (status, detail) => {
      connection.setRos(status, detail)
      if (status === 'online') this.subscribe()
    })
    this.client.connect()
  }

  disconnect() { this.subscriptions.forEach((topic) => topic.unsubscribe()); this.client?.disconnect() }

  async command(command: SystemCommand) {
    if (!this.commands) throw new Error('ROS 尚未连接，命令未发送')
    await this.commands.send(command)
  }

  private subscribe() {
    const ros = this.client?.connection
    if (!ros) return
    const connection = useConnectionStore(), robot = useRobotStore(), vision = useVisionStore(), task = useTaskStore()
    const add = (config: { name: string; type: string }, callback: (message: unknown) => void) => {
      const topic = new ROSLIB.Topic({ ros, name: config.name, messageType: config.type, throttle_rate: 80 })
      topic.subscribe((message) => { connection.touch(); callback(message) })
      this.subscriptions.push(topic)
    }
    add(topicRegistry.jointStates, (raw) => {
      const message = raw as { name?: string[]; position?: number[] }
      if (!message.name || !message.position) return
      robot.updateJoints(Object.fromEntries(message.name.map((name, index) => [name, message.position?.[index] ?? 0])))
    })
    add(topicRegistry.detectedObjects, (raw) => { const value = safeAdapt(adaptDetections, raw, '检测'); if (value) vision.setDetections(value) })
    add(topicRegistry.taskState, (raw) => { const value = safeAdapt(adaptTaskState, raw, '任务状态'); if (value) task.current = value })
    add(topicRegistry.taskEvents, (raw) => { const value = safeAdapt(adaptTaskEvent, raw, '任务事件'); if (value) task.events.push(value) })
    add(topicRegistry.servoError, (raw) => { const value = safeAdapt(adaptServoError, raw, '伺服误差'); if (value) task.addServo(value) })
    const commandTopic = new ROSLIB.Topic({ ros, name: topicRegistry.command.name, messageType: topicRegistry.command.type })
    this.commands = new CommandService(commandTopic)
  }
}
