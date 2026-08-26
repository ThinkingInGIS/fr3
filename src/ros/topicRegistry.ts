import { runtimeConfig } from '@/config/runtime'

export const topicRegistry = {
  jointStates: { name: runtimeConfig.topics.jointStates, type: 'sensor_msgs/msg/JointState' },
  detectedObjects: { name: runtimeConfig.topics.detectedObjects, type: 'std_msgs/msg/String' },
  taskState: { name: runtimeConfig.topics.taskState, type: 'std_msgs/msg/String' },
  taskEvents: { name: runtimeConfig.topics.taskEvents, type: 'std_msgs/msg/String' },
  servoError: { name: runtimeConfig.topics.servoError, type: 'std_msgs/msg/String' },
  command: { name: runtimeConfig.topics.command, type: 'std_msgs/msg/String' },
} as const
