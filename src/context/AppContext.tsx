import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ComponentType } from 'react'

import { compileJSX } from '../services/compiler'
import { runComponent } from '../services/runner'
import {
  analyzeJSXSource,
  type JSXPreflightIssue,
} from '../services/preflight'
import {
  deleteAsset,
  getAllAssets,
  getAsset,
  saveAsset,
  type JSXAsset,
} from '../services/store'
import { createAssetId } from '../utils/id'

type AppContextValue = {
  assets: JSXAsset[]
  loadedAssetId: string | null
  loadedComponent: ComponentType | null
  hudExpanded: boolean
  error: string | null
  preflightIssues: JSXPreflightIssue[]
  uploadAsset: (file: File) => Promise<void>
  saveAssetContent: (name: string, content: string) => Promise<string>
  loadAsset: (assetId: string) => Promise<void>
  unloadAsset: () => void
  removeAsset: (assetId: string) => Promise<void>
  setHudExpanded: (expanded: boolean) => void
  clearError: () => void
  clearPreflightIssues: () => void
  reportError: (message: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<JSXAsset[]>([])
  const [loadedAssetId, setLoadedAssetId] = useState<string | null>(null)
  const [loadedComponent, setLoadedComponent] = useState<ComponentType | null>(null)
  const [hudExpanded, setHudExpanded] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preflightIssues, setPreflightIssues] = useState<JSXPreflightIssue[]>([])

  const refreshAssets = useCallback(async () => {
    const rows = await getAllAssets()
    setAssets(rows)
  }, [])

  useEffect(() => {
    void refreshAssets()
  }, [refreshAssets])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearPreflightIssues = useCallback(() => {
    setPreflightIssues([])
  }, [])

  const reportError = useCallback((message: string) => {
    setError(message)
  }, [])

  const uploadAsset = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.jsx')) {
        setError('Only .jsx files are supported.')
        return
      }

      try {
        const content = await file.text()
        const asset: JSXAsset = {
          id: createAssetId(),
          name: file.name,
          content,
          size: file.size,
          updatedAt: Date.now(),
        }

        await saveAsset(asset)
        await refreshAssets()
        setError(null)
      } catch (err) {
        setError(`Upload failed: ${(err as Error).message}`)
      }
    },
    [refreshAssets],
  )

  const saveAssetContent = useCallback(
    async (name: string, content: string): Promise<string> => {
      const existing = (await getAllAssets()).find((item) => item.name === name)
      const asset: JSXAsset = {
        id: existing?.id ?? createAssetId(),
        name,
        content,
        size: new Blob([content]).size,
        updatedAt: Date.now(),
      }

      await saveAsset(asset)
      await refreshAssets()
      return asset.id
    },
    [refreshAssets],
  )

  const loadAsset = useCallback(async (assetId: string) => {
    try {
      const asset = await getAsset(assetId)
      if (!asset) {
        throw new Error('Asset not found.')
      }

      const report = analyzeJSXSource(asset.content)
      setPreflightIssues(report.issues)

      const blockingIssues = report.issues.filter(
        (issue) => issue.severity === 'error',
      )

      if (blockingIssues.length > 0) {
        throw new Error(
          `Preflight failed: ${blockingIssues.map((issue) => issue.message).join(' ')}`,
        )
      }

      const compiled = compileJSX(asset.content)
      const component = runComponent(compiled)

      setLoadedAssetId(asset.id)
      setLoadedComponent(() => component)
      setHudExpanded(false)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  const unloadAsset = useCallback(() => {
    setLoadedAssetId(null)
    setLoadedComponent(null)
    setHudExpanded(true)
    setError(null)
    setPreflightIssues([])
  }, [])

  const removeAsset = useCallback(
    async (assetId: string) => {
      await deleteAsset(assetId)
      if (loadedAssetId === assetId) {
        unloadAsset()
      }
      await refreshAssets()
    },
    [loadedAssetId, refreshAssets, unloadAsset],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      assets,
      loadedAssetId,
      loadedComponent,
      hudExpanded,
      error,
      preflightIssues,
      uploadAsset,
      saveAssetContent,
      loadAsset,
      unloadAsset,
      removeAsset,
      setHudExpanded,
      clearError,
      clearPreflightIssues,
      reportError,
    }),
    [
      assets,
      loadedAssetId,
      loadedComponent,
      hudExpanded,
      error,
      preflightIssues,
      uploadAsset,
      saveAssetContent,
      loadAsset,
      unloadAsset,
      removeAsset,
      clearError,
      clearPreflightIssues,
      reportError,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return ctx
}
