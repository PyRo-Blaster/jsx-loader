import localforage from 'localforage'

export interface JSXAsset {
  id: string
  name: string
  content: string
  size: number
  updatedAt: number
}

const assetStore = localforage.createInstance({
  name: 'jsx-loader',
  storeName: 'assets',
})

export async function saveAsset(asset: JSXAsset): Promise<void> {
  await assetStore.setItem(asset.id, asset)
}

export async function getAsset(id: string): Promise<JSXAsset | null> {
  return (await assetStore.getItem<JSXAsset>(id)) ?? null
}

export async function getAllAssets(): Promise<JSXAsset[]> {
  const results: JSXAsset[] = []
  await assetStore.iterate<JSXAsset, void>((value) => {
    results.push(value)
  })

  return results.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteAsset(id: string): Promise<void> {
  await assetStore.removeItem(id)
}
