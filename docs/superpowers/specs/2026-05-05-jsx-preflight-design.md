# JSX Preflight Design Spec

## 1. Goal
This document defines a "warning-first" preflight layer for the JSX loader. The purpose is to move common import/export and runtime compatibility failures from execution time to load time, so users receive actionable feedback before a JSX file is mounted.

The preflight layer must not make the loader overly strict. It should block only cases that are known to fail, while allowing risky-but-possibly-loadable files to proceed with explicit warnings.

## 2. Problem Statement
The current load flow is:

1. Read JSX source from storage.
2. Compile with `compileJSX()`.
3. Execute with `runComponent()`.
4. Surface any thrown error in the HUD.

This works, but it is reactive rather than predictive. Problems such as unsupported module imports, missing `default export`, or React import edge cases are only discovered after the user attempts to load the file. The resulting errors are technically correct, but they are not always easy to interpret or fix.

## 3. Proposed Approach

### 3.1 Warning-First Policy
Each uploaded or loaded JSX asset is analyzed before compilation. The preflight result is grouped into three levels:

- **Blocking errors**
  - Known-failing conditions that should prevent compilation or execution.
  - Example: importing a module that is not registered in the runtime module registry.
- **Warnings**
  - Patterns that are supported or partially normalized today, but are error-prone or have higher regression risk.
  - Example: mixed React default + named import patterns.
- **Info**
  - Useful context for debugging and transparency.
  - Example: detected module list and which compatibility rule was applied.

The UI behavior should be:

- If `errors.length > 0`, stop the load and show a structured preflight failure message.
- If `warnings.length > 0`, continue loading but surface the warnings in the HUD.
- If only info items exist, proceed silently unless developer-facing diagnostics are needed later.

### 3.2 Scope of First Version
The first version should focus on high-value static checks that match the current architecture:

- Detect imported module names.
- Detect whether imported modules exist in `moduleRegistry`.
- Detect whether the file has a `default export`.
- Detect high-risk React import patterns that rely on compiler normalization.
- Detect side-effect imports.
- Detect obvious remaining `import` / `export` statements after normalization if the compiler leaves them behind.

The first version should not attempt full semantic correctness or full AST-based linting. Lightweight analysis is sufficient if the output is stable and understandable.

## 4. Architecture Changes

### 4.1 New Service
Add a new service:

- `src/services/preflight.ts`

Primary interface:

- `analyzeJSXSource(source: string): JSXPreflightReport`

Suggested result shape:

```ts
type JSXPreflightSeverity = 'error' | 'warning' | 'info'

type JSXPreflightIssue = {
  severity: JSXPreflightSeverity
  code: string
  message: string
  detail?: string
}

type JSXPreflightReport = {
  canProceed: boolean
  imports: string[]
  issues: JSXPreflightIssue[]
}
```

This service should be pure and side-effect free so it can be unit-tested independently.

### 4.2 Integration in Load Flow
Update the load pipeline in `AppContext`:

1. Retrieve asset content.
2. Run `analyzeJSXSource(content)`.
3. If preflight returns blocking errors:
   - stop loading
   - set structured UI error message
4. If preflight returns warnings:
   - keep warnings available for UI display
   - proceed to compile and run
5. Compile and execute as before.

This keeps `compileJSX()` and `runComponent()` focused on transformation and execution while moving policy logic earlier in the flow.

### 4.3 Registry Reuse
The preflight layer must reuse the existing runtime module registry rather than inventing a separate support list.

- `moduleRegistry.ts` remains the source of truth for supported modules.
- Preflight reads the supported module names from the registry.
- Runtime still enforces support at execution time as a final safeguard.

This avoids drift between "what preflight claims is supported" and "what the runner can actually load."

## 5. Detection Rules

### 5.1 Blocking Rules
The following cases should return blocking errors:

- Importing a module not present in `moduleRegistry`
- No `default export` detected
- Source that still contains obviously unsupported module syntax after normalization readiness checks

Expected error style:

- `Module "lodash" is not registered in the JSX runtime.`
- `The JSX file must export a default React component.`

### 5.2 Warning Rules
The following cases should return warnings but still allow loading:

- `import React, { ... } from 'react'`
  - Supported, but depends on compatibility handling
- `import React, * as ReactNS from 'react'`
  - Supported only through injected React conventions
- Side-effect imports such as `import 'some-module'`
  - Allowed only if the module is supported; still warn because execution order and side effects are harder to reason about
- Multiple third-party imports in one file
  - Warn that the file depends on a broader runtime surface and may be more fragile

### 5.3 Info Rules
Info items may include:

- List of imported modules
- Whether React import normalization was applied
- Whether the file depends on third-party runtime modules

## 6. Error Message Strategy
Preflight messages should be user-oriented rather than compiler-oriented.

Good:

- `Preflight failed: module "lodash" is not supported by this loader.`
- `Preflight warning: React default import was detected and will be normalized before execution.`

Avoid exposing raw Babel parser errors at the preflight stage unless needed for debugging. If compile-time parsing still fails later, wrap those errors with contextual language that tells the user whether the issue is syntax, unsupported module usage, or runtime execution.

## 7. Testing Strategy
Add focused unit tests for `preflight.ts` covering:

- supported `react` import only
- supported `react` + `recharts` imports
- unsupported module import
- missing `default export`
- side-effect import
- React default + named import mixed pattern

The test suite should validate:

- `canProceed`
- issue severity classification
- key message text
- imported module extraction

Existing compiler and runner tests remain in place and continue to protect transform and execution behavior.

## 8. Rollout Notes
This change should be introduced as an additive safety layer rather than a compiler rewrite. The implementation should remain small, readable, and easy to extend as more runtime modules are registered.

The intent is not to guarantee that every warning-free file will always render correctly. The intent is to catch predictable failures early and give users clearer feedback than the current compile/run exception path.
