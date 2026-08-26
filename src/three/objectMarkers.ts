import * as THREE from 'three'
import type { DetectedObject } from '@/types/vision'
import { rosToThree } from './rosCoordinates'

const palette: Record<string, number> = { 'Obj-01': 0x4e89ff, 'Obj-02': 0x29c8c2, 'Obj-03': 0xf18b52, 'Obj-04': 0x43d5ad, 'Obj-05': 0x9c6bdf, 'Obj-06': 0xf2c14e }

export class ObjectMarkers {
  readonly group = new THREE.Group()
  private meshes = new Map<string, THREE.Mesh>()

  update(objects: DetectedObject[], selectedId?: string) {
    const ids = new Set(objects.map((item) => item.id))
    this.meshes.forEach((mesh, id) => { if (!ids.has(id)) { this.group.remove(mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); this.meshes.delete(id) } })
    objects.forEach((object) => {
      let mesh = this.meshes.get(object.id)
      if (!mesh) {
        const isCylinder = object.className.includes('圆柱')
        const geometry = isCylinder ? new THREE.CylinderGeometry(.032, .032, .07, 20) : new THREE.BoxGeometry(.065, .065, .065)
        mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: palette[object.id] ?? 0x42d3b0, roughness: .42, metalness: .1 }))
        mesh.userData.baseScale = 1
        this.meshes.set(object.id, mesh); this.group.add(mesh)
      }
      if (object.pose) {
        const converted = rosToThree(object.pose.position)
        mesh.position.set(converted.x, Math.max(.075, converted.y + .055), converted.z)
      }
      const material = mesh.material as THREE.MeshStandardMaterial
      material.transparent = object.state === 'placed'; material.opacity = object.state === 'placed' ? .38 : 1
      material.emissive.set(object.id === selectedId ? 0x1c8b73 : 0x000000)
      material.emissiveIntensity = object.id === selectedId ? .75 : 0
      mesh.scale.setScalar(object.id === selectedId ? 1.13 : 1)
    })
  }
}
