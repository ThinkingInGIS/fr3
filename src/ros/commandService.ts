import ROSLIB from './roslibBrowser'
import type { SystemCommand } from '@/types/task'

export class CommandService {
  private lastSentAt = 0
  constructor(private readonly topic: ROSLIB.Topic) {}

  async send(command: SystemCommand) {
    const now = Date.now()
    if (now - this.lastSentAt < 700) throw new Error('操作过于频繁，请稍候')
    this.lastSentAt = now
    this.topic.publish(new ROSLIB.Message({ data: JSON.stringify({ command, requestedAt: now, source: 'web-dashboard' }) }))
  }
}
