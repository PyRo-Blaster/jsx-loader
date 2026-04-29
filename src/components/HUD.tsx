import { AnimatePresence, motion } from 'framer-motion'
import { FolderOpen, Upload, X } from 'lucide-react'
import { useRef } from 'react'

import { useAppContext } from '../context/AppContext'

export function HUD() {
  const {
    assets,
    loadedAssetId,
    hudExpanded,
    error,
    setHudExpanded,
    uploadAsset,
    saveAssetContent,
    loadAsset,
    unloadAsset,
    removeAsset,
    clearError,
  } = useAppContext()
  const inputRef = useRef<HTMLInputElement>(null)

  async function onFileSelected(file?: File) {
    if (!file) return
    await uploadAsset(file)
  }

  async function onLoadProjectSample() {
    try {
      const response = await fetch('/purification_design.jsx')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const source = await response.text()
      const assetId = await saveAssetContent('purification_design.jsx', source)
      await loadAsset(assetId)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center">
      <AnimatePresence mode="wait">
        {hudExpanded ? (
          <motion.section
            key="hud-expanded"
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: -28, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            className="pointer-events-auto flex max-h-[62vh] w-[680px] flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/85 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)] backdrop-blur-xl"
          >
            <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/55 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,.5)]" />
                JSX Asset Manager
              </div>
              <button
                type="button"
                onClick={() => setHudExpanded(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Collapse manager"
              >
                <X size={16} />
              </button>
            </header>

            <div className="flex flex-col gap-4 overflow-y-auto p-5">
              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="break-all">{error}</span>
                    <button
                      type="button"
                      onClick={clearError}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-5 text-sm text-slate-600 transition hover:border-sky-400 hover:bg-sky-50 hover:text-slate-800"
              >
                <Upload size={16} className="mx-auto mb-1.5" />
                Drop .jsx files here or click to browse
              </button>
              <button
                type="button"
                onClick={() => void onLoadProjectSample()}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Load Project Sample
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".jsx"
                className="hidden"
                onChange={(event) => {
                  void onFileSelected(event.target.files?.[0])
                  event.currentTarget.value = ''
                }}
              />

              <ul className="flex flex-col gap-2">
                {assets.map((asset) => {
                  const isActive = loadedAssetId === asset.id
                  return (
                    <li
                      key={asset.id}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                        isActive
                          ? 'border-sky-200 bg-sky-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{asset.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {(asset.size / 1024).toFixed(1)} KB ·{' '}
                          {new Date(asset.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <button
                            type="button"
                            onClick={unloadAsset}
                            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                          >
                            Unload
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void loadAsset(asset.id)}
                            className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-600"
                          >
                            Load
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void removeAsset(asset.id)}
                          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </motion.section>
        ) : (
          <motion.div
            key="hud-dock"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: -20, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="pointer-events-auto flex items-center gap-4 rounded-full border border-slate-200 bg-white/90 px-4 py-2 shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <span
                className={`h-2 w-2 rounded-full ${
                  loadedAssetId ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
              {loadedAssetId ? 'Loaded' : 'No asset loaded'}
            </div>
            <button
              type="button"
              onClick={() => setHudExpanded(true)}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <FolderOpen size={14} />
              Open Manager
            </button>
            {loadedAssetId ? (
              <button
                type="button"
                onClick={unloadAsset}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
              >
                Unload
              </button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
