/**
 * roslib 1.x is published as a Browserify bundle rather than an ES module.
 * Loading its browser build explicitly ensures it assigns `globalThis.ROSLIB`
 * before the dashboard creates any ROS connections.
 */
import 'roslib/build/roslib.js'
import type ROSLIBTypes from 'roslib'

type RoslibApi = typeof ROSLIBTypes

const ROSLIB = (globalThis as typeof globalThis & { ROSLIB?: RoslibApi }).ROSLIB

if (!ROSLIB) {
  throw new Error('ROSLIB 浏览器库加载失败')
}

export default ROSLIB
