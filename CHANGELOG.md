# Changelog

## 0.2.0 - 2026-05-06

### Added
- Added a warning-first JSX preflight analyzer that inspects imports and default exports before compile/runtime execution.
- Added HUD warning rendering for non-blocking preflight issues so users can continue loading while still seeing import-risk diagnostics.
- Added dedicated preflight unit coverage and extra compiler/runner regression tests.
- Added `ProteinACaptureCalculator.jsx` as a real-world sample used to validate React default-plus-named import compatibility.

### Changed
- Improved React import normalization to support `import React, { ... } from 'react'` without redeclaring the injected `React` runtime binding.
- Reused the runtime module registry for preflight support checks so compile-time warnings and runtime support stay aligned.
- Bumped the package version to `0.2.0`.

### Fixed
- Fixed runtime failures caused by mixed default and named React imports in uploaded JSX files.
- Fixed the JSX loading flow to fail early with actionable preflight messages for unsupported modules and missing default exports.
- Improved Docker testability by keeping the current container build and startup flow aligned with the latest frontend bundle.
