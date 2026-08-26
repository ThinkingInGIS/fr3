import * as THREE from 'three'

export const createCameraFrustum = (color = 0x42d3b0) => {
  const group = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(.075, .035, .03),
    new THREE.MeshStandardMaterial({ color: 0x242f31, metalness: .5, roughness: .25 }),
  )
  const points = [
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(-.13, -.09, -.25),
    new THREE.Vector3(.13, -.09, -.25), new THREE.Vector3(.13, .09, -.25),
    new THREE.Vector3(-.13, .09, -.25),
  ]
  const edges = [[0,1],[0,2],[0,3],[0,4],[1,2],[2,3],[3,4],[4,1]].flatMap(([a,b]) => [points[a], points[b]])
  const geometry = new THREE.BufferGeometry().setFromPoints(edges)
  const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: .42 }))
  group.add(body, lines)
  return group
}
