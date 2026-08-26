import { defineStore } from 'pinia'
import type { ServoError, TaskEvent, TaskState } from '@/types/task'

const initialTask = (): TaskState => ({
  taskId: 'mock-sort-001', taskName: '多目标自主抓取与整齐码放', stage: 'IDLE',
  progress: 0, total: 6, reasons: [], message: '系统就绪，等待开始演示', updatedAt: Date.now(),
})

export const useTaskStore = defineStore('task', {
  state: () => ({
    current: initialTask(),
    events: [] as TaskEvent[],
    servoHistory: [] as ServoError[],
    running: false,
    paused: false,
    speed: 1,
    activeLoop: '感知',
  }),
  actions: {
    setTask(update: Partial<TaskState>) { this.current = { ...this.current, ...update, updatedAt: Date.now() } },
    addEvent(event: Omit<TaskEvent, 'id' | 'timestamp'>) {
      this.events.push({ ...event, id: `${Date.now()}-${this.events.length}`, timestamp: Date.now() })
      if (this.events.length > 120) this.events.shift()
    },
    addServo(error: ServoError) {
      this.servoHistory.push(error)
      const cutoff = Date.now() - 12_000
      this.servoHistory = this.servoHistory.filter((item) => item.timestamp >= cutoff)
    },
    reset() {
      this.current = initialTask(); this.events = []; this.servoHistory = []
      this.running = false; this.paused = false; this.activeLoop = '感知'
    },
  },
})
