import { describe, expect, it } from 'vitest'

import { deleteAsset, getAllAssets, getAsset, saveAsset, type JSXAsset } from '../store'

describe('asset store', () => {
  it('saves and loads an asset', async () => {
    const asset: JSXAsset = {
      id: `asset-${Date.now()}`,
      name: 'demo.jsx',
      content: 'export default function Demo(){ return <div/> }',
      size: 42,
      updatedAt: Date.now(),
    }

    await saveAsset(asset)
    const loaded = await getAsset(asset.id)

    expect(loaded).toEqual(asset)
  })

  it('returns assets sorted by updatedAt desc', async () => {
    const first: JSXAsset = {
      id: `asset-first-${Date.now()}`,
      name: 'first.jsx',
      content: 'first',
      size: 1,
      updatedAt: Date.now() - 1000,
    }

    const second: JSXAsset = {
      id: `asset-second-${Date.now()}`,
      name: 'second.jsx',
      content: 'second',
      size: 2,
      updatedAt: Date.now(),
    }

    await saveAsset(first)
    await saveAsset(second)

    const assets = await getAllAssets()
    const firstIndex = assets.findIndex((x) => x.id === first.id)
    const secondIndex = assets.findIndex((x) => x.id === second.id)

    expect(firstIndex).toBeGreaterThan(-1)
    expect(secondIndex).toBeGreaterThan(-1)
    expect(secondIndex).toBeLessThan(firstIndex)
  })

  it('deletes asset by id', async () => {
    const id = `asset-delete-${Date.now()}`
    await saveAsset({
      id,
      name: 'delete.jsx',
      content: 'noop',
      size: 1,
      updatedAt: Date.now(),
    })

    await deleteAsset(id)

    const loaded = await getAsset(id)
    expect(loaded).toBeNull()
  })
})
