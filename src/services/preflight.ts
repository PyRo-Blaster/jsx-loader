import { hasRuntimeModule } from './moduleRegistry'

export type JSXPreflightSeverity = 'error' | 'warning' | 'info'

export type JSXPreflightIssue = {
  severity: JSXPreflightSeverity
  code: string
  message: string
  detail?: string
}

export type JSXPreflightReport = {
  canProceed: boolean
  imports: string[]
  issues: JSXPreflightIssue[]
}

function getImportedModules(source: string): string[] {
  const matches = Array.from(
    source.matchAll(/import\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g),
  )

  return [...new Set(matches.map((match) => match[1]).filter(Boolean))].sort()
}

function hasDefaultExport(source: string): boolean {
  return /export\s+default\s+/.test(source)
}

export function analyzeJSXSource(source: string): JSXPreflightReport {
  const issues: JSXPreflightIssue[] = []
  const imports = getImportedModules(source)

  for (const moduleName of imports) {
    if (!hasRuntimeModule(moduleName)) {
      issues.push({
        severity: 'error',
        code: 'unsupported-module',
        message: `Module "${moduleName}" is not registered in the JSX runtime.`,
      })
    }
  }

  if (!hasDefaultExport(source)) {
    issues.push({
      severity: 'error',
      code: 'missing-default-export',
      message: 'The JSX file must export a default React component.',
    })
  }

  if (/import\s+React\s*,\s*\{[^}]+\}\s+from\s+['"]react['"]/.test(source)) {
    issues.push({
      severity: 'warning',
      code: 'react-default-named-import',
      message:
        'React default import with named imports was detected and will be normalized before execution.',
    })
  }

  if (/import\s+['"][^'"]+['"]\s*;?/.test(source)) {
    issues.push({
      severity: 'warning',
      code: 'side-effect-import',
      message:
        'Side-effect-only imports can be harder to reason about in the JSX sandbox.',
    })
  }

  return {
    canProceed: !issues.some((issue) => issue.severity === 'error'),
    imports,
    issues,
  }
}
