import type { SystemCommand } from '@/types/task'

export interface DataSource {
  readonly mode: 'mock' | 'ros'
  connect(): void
  disconnect(): void
  command(command: SystemCommand): Promise<void>
  setSpeed?(speed: number): void
}
