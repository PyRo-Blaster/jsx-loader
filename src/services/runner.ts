import React from 'react'
import {
  listSupportedRuntimeModules,
  resolveRuntimeModule,
} from './moduleRegistry'

export function runComponent(compiledCode: string): React.ComponentType {
  try {
    const exportsObj: Record<string, unknown> = {}

    const customRequire = (moduleName: string) => {
      const resolved = resolveRuntimeModule(moduleName)
      if (resolved !== undefined) {
        return resolved
      }

      throw new Error(
        `Module '${moduleName}' is not supported in this sandbox. Supported modules: ${listSupportedRuntimeModules().join(', ')}`,
      )
    }

    // The compiled code writes to exports.default.
    const execute = new Function('exports', 'require', 'React', compiledCode)
    execute(exportsObj, customRequire, React)

    const component = exportsObj.default
    if (!component || typeof component !== 'function') {
      throw new Error(
        'No default export found. The JSX file must have an export default component.',
      )
    }

    return component as React.ComponentType
  } catch (error) {
    throw new Error(`Execution failed: ${(error as Error).message}`)
  }
}
