import ROSLIB from 'roslib'

type StatusHandler = (status: 'connecting' | 'online' | 'offline' | 'error', detail?: string) => void

export class RosClient {
  private ros?: ROSLIB.Ros
  private retryTimer?: number
  private attempts = 0
  private manualClose = false

  constructor(private readonly url: string, private readonly onStatus: StatusHandler) {}

  connect() {
    this.manualClose = false
    this.onStatus('connecting')
    this.ros = new ROSLIB.Ros({ url: this.url })
    this.ros.on('connection', () => { this.attempts = 0; this.onStatus('online') })
    this.ros.on('error', (error) => this.onStatus('error', String(error)))
    this.ros.on('close', () => { this.onStatus('offline'); if (!this.manualClose) this.scheduleReconnect() })
  }

  get connection() { return this.ros }

  disconnect() {
    this.manualClose = true
    if (this.retryTimer) window.clearTimeout(this.retryTimer)
    this.ros?.close()
  }

  private scheduleReconnect() {
    const delay = Math.min(30_000, 1000 * 2 ** this.attempts++)
    this.retryTimer = window.setTimeout(() => this.connect(), delay)
  }
}
