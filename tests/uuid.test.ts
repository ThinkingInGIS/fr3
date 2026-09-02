import { describe, expect, it, vi } from 'vitest'
import { createUuid } from '@/utils/uuid'

describe('createUuid', () => {
  it('uses crypto.randomUUID when the browser supports it', () => {
    const randomUUID = vi.fn(() => 'native-uuid')
    vi.stubGlobal('crypto', { randomUUID })

    expect(createUuid()).toBe('native-uuid')
    expect(randomUUID).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('creates an RFC 4122 v4 UUID without crypto.randomUUID', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(0xab) })

    expect(createUuid()).toBe('abababab-abab-4bab-abab-abababababab')
    vi.unstubAllGlobals()
  })
})
