import * as THREE from 'three'
import type { TrajectoryPoint } from '@/types/robot'
import { rosToThree } from './rosCoordinates'

export class TrajectoryRenderer {
  readonly group = new THREE.Group()
  private line?: THREE.Line

  update(points: TrajectoryPoint[]) {
    if (this.line) { this.group.remove(this.line); this.line.geometry.dispose(); (this.line.material as THREE.Material).dispose(); this.line = undefined }
    if (points.length < 2) return
    const curve = new THREE.CatmullRomCurve3(points.map(rosToThree))
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(60))
    this.line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffc857, transparent: true, opacity: .9 }))
    this.group.add(this.line)
  }
}
