import { defineStore } from 'pinia'

export type ConnectionStatus = 'offline' | 'connecting' | 'online' | 'error'

export const useConnectionStore = defineStore('connection', {
  state: () => ({
    ros: 'offline' as ConnectionStatus,
    video: 'offline' as ConnectionStatus,
    lastMessageAt: 0,
    reconnectAttempt: 0,
    errorMessage: '',
  }),
  actions: {
    setRos(status: ConnectionStatus, message = '') {
      this.ros = status
      this.errorMessage = message
      if (status === 'online') { this.reconnectAttempt = 0; this.lastMessageAt = Date.now() }
    },
    touch() { this.lastMessageAt = Date.now() },
  },
})
