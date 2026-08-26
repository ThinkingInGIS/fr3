import * as THREE from 'three'

const linkMaterial = new THREE.MeshStandardMaterial({ color: 0xd8e0de, metalness: .62, roughness: .28 })
const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x151d1f, metalness: .42, roughness: .32 })

export class SimplifiedFr3 {
  readonly group = new THREE.Group()
  private readonly pivots: THREE.Group[] = []
  private gripperLeft?: THREE.Mesh
  private gripperRight?: THREE.Mesh

  constructor() {
    this.group.name = 'FR3 simplified fallback model'
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .08, 32), jointMaterial)
    base.position.y = .04
    this.group.add(base)
    const lengths = [.15, .17, .15, .14, .12, .1, .08]
    let parent = this.group
    lengths.forEach((length, index) => {
      const pivot = new THREE.Group()
      pivot.position.y = index === 0 ? .08 : lengths[index - 1]
      parent.add(pivot)
      const joint = new THREE.Mesh(new THREE.SphereGeometry(.036, 20, 14), jointMaterial)
      pivot.add(joint)
      const link = new THREE.Mesh(new THREE.CapsuleGeometry(.027, Math.max(.03, length - .054), 6, 12), linkMaterial)
      link.position.y = length / 2
      pivot.add(link)
      this.pivots.push(pivot)
      parent = pivot
    })
    const wrist = new THREE.Group(); wrist.position.y = lengths.at(-1) ?? .08; parent.add(wrist)
    const palm = new THREE.Mesh(new THREE.BoxGeometry(.085, .04, .07), jointMaterial); wrist.add(palm)
    this.gripperLeft = new THREE.Mesh(new THREE.BoxGeometry(.018, .09, .025), linkMaterial)
    this.gripperRight = this.gripperLeft.clone()
    this.gripperLeft.position.set(-.035, -.055, 0); this.gripperRight.position.set(.035, -.055, 0)
    wrist.add(this.gripperLeft, this.gripperRight)
    this.group.position.set(0, .055, .24)
    this.group.rotation.y = Math.PI
  }

  update(joints: Record<string, number>, gripperWidth: number) {
    this.pivots.forEach((pivot, index) => {
      const angle = joints[`fr3_joint${index + 1}`] ?? 0
      if (index % 2 === 0) pivot.rotation.z = angle
      else pivot.rotation.x = angle
    })
    if (this.gripperLeft && this.gripperRight) {
      const half = Math.min(.042, Math.max(.008, gripperWidth / 2))
      this.gripperLeft.position.x = -half; this.gripperRight.position.x = half
    }
  }
}
