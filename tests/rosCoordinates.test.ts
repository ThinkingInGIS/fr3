import { describe, expect, it } from 'vitest'
import { rosToThree, threeToRos } from '@/three/rosCoordinates'

describe('ROS REP-103 coordinate conversion', () => {
  it('converts and round-trips vectors', () => {
    const source = { x: .4, y: -.2, z: .8 }
    const converted = rosToThree(source)
    expect(converted.toArray()).toEqual([.2, .8, -.4])
    expect(threeToRos(converted)).toEqual(source)
  })
})
