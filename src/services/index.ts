import { runtimeConfig } from '@/config/runtime'
import { MockDataSource } from './mockDataSource'
import { RosDataSource } from './rosDataSource'
import type { DataSource } from './dataSource'

let instance: DataSource | undefined
export const getDataSource = (): DataSource => {
  instance ??= runtimeConfig.dataSource === 'ros' ? new RosDataSource() : new MockDataSource()
  return instance
}
