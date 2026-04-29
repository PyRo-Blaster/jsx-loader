import { describe, expect, it, vi } from 'vitest'

import { createAssetId } from './id'

describe('createAssetId', () => {
  it('uses crypto.randomUUID when available', () => {
    const uuidSpy = vi.fn(() => 'uuid-from-randomUUID')
    vi.stubGlobal('crypto', { randomUUID: uuidSpy })

    const id = createAssetId()

    expect(id).toBe('uuid-from-randomUUID')
    expect(uuidSpy).toHaveBeenCalledTimes(1)
  })

  it('falls back to timestamp-random string when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {})

    const id = createAssetId()

    expect(id).toMatch(/^asset-\d+-[a-z0-9]+$/)
  })
})
