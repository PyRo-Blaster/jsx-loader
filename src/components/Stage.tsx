import { useAppContext } from '../context/AppContext'
import { ErrorBoundary } from './ErrorBoundary'

export function Stage() {
  const { loadedComponent: LoadedComponent, loadedAssetId, reportError } =
    useAppContext()

  if (!LoadedComponent || !loadedAssetId) {
    return (
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-50">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-300">
          JSX Asset Loader
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          上传并加载 JSX 文件后，将在这里全屏展示。
        </p>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-0 overflow-auto bg-white">
      <ErrorBoundary onError={reportError}>
        <LoadedComponent />
      </ErrorBoundary>
    </div>
  )
}
