# JSX Preflight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a warning-first JSX preflight layer that catches predictable import/export compatibility issues before compile/runtime execution and surfaces actionable feedback in the HUD.

**Architecture:** The implementation adds a pure `preflight` analysis service in front of the existing `compileJSX()` and `runComponent()` pipeline. `AppContext` becomes responsible for enforcing blocking preflight failures and retaining warning metadata for the UI, while `HUD` renders structured warnings without changing the existing fullscreen stage model.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Babel standalone, existing runtime module registry.

---

### Task 1: Add failing preflight tests

**Files:**
- Create: `src/services/__tests__/preflight.test.ts`
- Modify: `src/services/moduleRegistry.ts`
- Test: `src/services/__tests__/preflight.test.ts`

- [ ] **Step 1: Write the failing test file**

```ts
import { describe, expect, it } from 'vitest'

import { analyzeJSXSource } from '../preflight'

describe('analyzeJSXSource', () => {
  it('allows supported react-only files', () => {
    const report = analyzeJSXSource(`
      import { useState } from "react";
      export default function Demo() {
        const [count] = useState(1)
        return <div>{count}</div>
      }
    `)

    expect(report.canProceed).toBe(true)
    expect(report.imports).toEqual(['react'])
    expect(report.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0)
  })

  it('blocks files that import unsupported modules', () => {
    const report = analyzeJSXSource(`
      import _ from "lodash";
      export default function Demo() {
        return <div>{String(Boolean(_))}</div>
      }
    `)

    expect(report.canProceed).toBe(false)
    expect(report.issues.some((issue) => issue.code === 'unsupported-module')).toBe(true)
  })

  it('warns on mixed default and named react imports', () => {
    const report = analyzeJSXSource(`
      import React, { useMemo } from "react";
      export default function Demo() {
        const value = useMemo(() => 1, [])
        return <div>{value}</div>
      }
    `)

    expect(report.canProceed).toBe(true)
    expect(report.issues.some((issue) => issue.code === 'react-default-named-import')).toBe(true)
  })

  it('blocks files without a default export', () => {
    const report = analyzeJSXSource(`
      export function Demo() {
        return <div>Hello</div>
      }
    `)

    expect(report.canProceed).toBe(false)
    expect(report.issues.some((issue) => issue.code === 'missing-default-export')).toBe(true)
  })

  it('warns on supported side-effect imports', () => {
    const report = analyzeJSXSource(`
      import "react";
      export default function Demo() {
        return <div>Hello</div>
      }
    `)

    expect(report.canProceed).toBe(true)
    expect(report.issues.some((issue) => issue.code === 'side-effect-import')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/__tests__/preflight.test.ts`

Expected: FAIL with an import error because `src/services/preflight.ts` does not exist yet.

- [ ] **Step 3: Add a registry helper test seam**

Modify `src/services/moduleRegistry.ts` to export a read-only helper:

```ts
export function hasRuntimeModule(name: string): boolean {
  return runtimeModules.has(name)
}
```

- [ ] **Step 4: Commit the red test setup**

```bash
git add src/services/__tests__/preflight.test.ts src/services/moduleRegistry.ts
git commit -m "test: add failing jsx preflight coverage"
```

### Task 2: Implement the pure preflight analyzer

**Files:**
- Create: `src/services/preflight.ts`
- Modify: `src/services/moduleRegistry.ts`
- Test: `src/services/__tests__/preflight.test.ts`

- [ ] **Step 1: Write the minimal implementation**

Create `src/services/preflight.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- src/services/__tests__/preflight.test.ts`

Expected: PASS

- [ ] **Step 3: Add one small regression test for supported third-party imports**

Append to `src/services/__tests__/preflight.test.ts`:

```ts
it('allows supported third-party runtime modules', () => {
  const report = analyzeJSXSource(`
    import { LineChart } from "recharts";
    export default function Demo() {
      return <LineChart />
    }
  `)

  expect(report.canProceed).toBe(true)
  expect(report.imports).toEqual(['recharts'])
})
```

- [ ] **Step 4: Run the full preflight test file again**

Run: `npm test -- src/services/__tests__/preflight.test.ts`

Expected: PASS with all preflight cases green.

- [ ] **Step 5: Commit the analyzer**

```bash
git add src/services/preflight.ts src/services/moduleRegistry.ts src/services/__tests__/preflight.test.ts
git commit -m "feat: add jsx preflight analyzer"
```

### Task 3: Integrate preflight into the load pipeline

**Files:**
- Modify: `src/context/AppContext.tsx`
- Test: `src/services/__tests__/preflight.test.ts`

- [ ] **Step 1: Extend app context state for warnings**

Modify `src/context/AppContext.tsx` to add `preflightIssues` and `clearPreflightIssues`:

```ts
import { analyzeJSXSource, type JSXPreflightIssue } from '../services/preflight'

type AppContextValue = {
  // existing fields...
  preflightIssues: JSXPreflightIssue[]
  clearPreflightIssues: () => void
}

const [preflightIssues, setPreflightIssues] = useState<JSXPreflightIssue[]>([])

const clearPreflightIssues = useCallback(() => {
  setPreflightIssues([])
}, [])
```

- [ ] **Step 2: Add preflight before compile and run**

Replace the body of `loadAsset` with:

```ts
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
        `Preflight failed: ${blockingIssues.map((issue) => issue.message).join(' ')}`
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
```

- [ ] **Step 3: Clear warnings when unloading**

Update `unloadAsset`:

```ts
const unloadAsset = useCallback(() => {
  setLoadedAssetId(null)
  setLoadedComponent(null)
  setHudExpanded(true)
  setError(null)
  setPreflightIssues([])
}, [])
```

- [ ] **Step 4: Run targeted validation**

Run: `npm test -- src/services/__tests__/preflight.test.ts src/services/__tests__/compiler.test.ts src/services/__tests__/runner.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the pipeline integration**

```bash
git add src/context/AppContext.tsx
git commit -m "feat: run jsx preflight before load"
```

### Task 4: Surface warnings in the HUD

**Files:**
- Modify: `src/components/HUD.tsx`
- Modify: `src/context/AppContext.tsx`
- Test: `src/services/__tests__/preflight.test.ts`

- [ ] **Step 1: Read preflight warnings from context**

In `src/components/HUD.tsx`, extend the context destructure:

```ts
const {
  assets,
  loadedAssetId,
  hudExpanded,
  error,
  preflightIssues,
  setHudExpanded,
  uploadAsset,
  saveAssetContent,
  loadAsset,
  unloadAsset,
  removeAsset,
  clearError,
  clearPreflightIssues,
} = useAppContext()
```

- [ ] **Step 2: Add a warning panel above the upload buttons**

Insert this block below the existing error panel:

```tsx
{preflightIssues.some((issue) => issue.severity === 'warning') ? (
  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
    <div className="mb-1 flex items-center justify-between gap-2">
      <span className="font-medium">Preflight warnings</span>
      <button
        type="button"
        onClick={clearPreflightIssues}
        className="text-amber-600 hover:text-amber-800"
      >
        <X size={14} />
      </button>
    </div>
    <ul className="space-y-1">
      {preflightIssues
        .filter((issue) => issue.severity === 'warning')
        .map((issue) => (
          <li key={issue.code}>- {issue.message}</li>
        ))}
    </ul>
  </div>
) : null}
```

- [ ] **Step 3: Preserve existing error precedence**

Keep the existing red error panel unchanged so blocking failures still present as the primary failure state. Warning UI must be additive, not a replacement.

- [ ] **Step 4: Run build verification**

Run: `npm run build`

Expected: successful production build with no TypeScript errors.

- [ ] **Step 5: Commit the HUD update**

```bash
git add src/components/HUD.tsx src/context/AppContext.tsx
git commit -m "feat: show jsx preflight warnings in hud"
```

### Task 5: Final regression pass

**Files:**
- Modify: `src/services/__tests__/compiler.test.ts`
- Modify: `src/services/__tests__/runner.test.ts`
- Test: `src/services/__tests__/preflight.test.ts`

- [ ] **Step 1: Add one regression test proving preflight does not replace compiler coverage**

Append to `src/services/__tests__/compiler.test.ts`:

```ts
it('still compiles react default plus named imports after preflight support is added', () => {
  const source = `
    import React, { useMemo } from "react";
    export default function Demo() {
      const value = useMemo(() => 2, [])
      return <div>{value}</div>
    }
  `

  const result = compileJSX(source)
  expect(result).toContain('useMemo')
})
```

- [ ] **Step 2: Run the focused regression suite**

Run: `npm test -- src/services/__tests__/preflight.test.ts src/services/__tests__/compiler.test.ts src/services/__tests__/runner.test.ts`

Expected: PASS

- [ ] **Step 3: Run lint/build safety checks**

Run: `npm run build`

Expected: PASS

- [ ] **Step 4: Commit the regression sweep**

```bash
git add src/services/__tests__/preflight.test.ts src/services/__tests__/compiler.test.ts src/services/__tests__/runner.test.ts
git commit -m "test: add jsx preflight regression coverage"
```
