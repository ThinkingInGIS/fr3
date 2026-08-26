import * as THREE from 'three'
import type { Vec3 } from '@/types/robot'

// ROS REP-103: x forward, y left, z up. Three scene: x right, y up, z toward viewer.
export const rosToThree = ({ x, y, z }: Vec3) => new THREE.Vector3(-y, z, -x)
export const threeToRos = ({ x, y, z }: THREE.Vector3): Vec3 => ({ x: -z, y: -x, z: y })

export const rosQuaternionToThree = (q: { x: number; y: number; z: number; w: number }) => {
  const rosRotation = new THREE.Quaternion(q.x, q.y, q.z, q.w)
  const basis = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2))
  return basis.multiply(rosRotation).multiply(basis.clone().invert())
}
