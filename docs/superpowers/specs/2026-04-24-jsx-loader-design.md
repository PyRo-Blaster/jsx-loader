# JSX Asset Loader - MVP Design Spec

## 1. Project Context
The goal is to build a "JSX Asset Loader Console" for internal use. It allows users to upload, manage, and preview `.jsx` files (like `purification_design.jsx`) without modifying the source code or restarting the development server. The project requires a modern, clean, and fullscreen "stage" to display the JSX assets, with a floating HUD (Head-Up Display) panel for asset management.

## 2. Core Requirements
- **Fullscreen Stage**: The loaded JSX component must take up 100% of the viewport. No persistent sidebars or headers should interfere with the presentation.
- **Floating HUD (Asset Manager)**: A semi-transparent, frosted-glass (light theme) panel that overlays the stage. It handles file uploads, asset listing, loading, and unloading.
- **Hot-Pluggable (Zero Build Step)**: Users upload `.jsx` files via the browser, and the site instantly compiles and mounts them.
- **Client-Side Processing**: No Node.js backend. Compilation happens entirely in the browser using `@babel/standalone`.
- **Local Persistence**: Uploaded assets are saved locally (e.g., using IndexedDB) so they persist across page reloads.

## 3. Technical Architecture

### 3.1 Stack
- **Framework**: React 18 + Vite (for fast local development and modern ecosystem support).
- **Styling**: Tailwind CSS (for frosted glass, modern UI, and rapid layout).
- **Icons**: Lucide React.
- **Animations**: Framer Motion (for smooth HUD expanding/collapsing).
- **Compiler**: `@babel/standalone` (transpiles JSX to JS in the browser).
- **Storage**: `localforage` (wrapper around IndexedDB for storing JSX strings and metadata).

### 3.2 Core Modules
1.  **Compiler Service (`src/services/compiler.ts`)**:
    - Takes raw JSX string.
    - Uses Babel to transpile it to standard React.createElement calls.
2.  **Sandbox Runner (`src/services/runner.ts`)**:
    - Creates a scoped execution environment (using `new Function` or similar).
    - Mocks the `require` or `import` statements (specifically intercepting `require('react')` to inject the global React instance).
    - Extracts and returns the `default export` as a React Component.
3.  **Asset Store (`src/services/store.ts`)**:
    - Manages CRUD operations for assets using `localforage`.
    - Asset schema: `{ id: string, name: string, content: string, size: number, updatedAt: number }`.
4.  **UI Components (`src/components/`)**:
    - `Stage`: The fullscreen container. Uses an ErrorBoundary to catch and display rendering errors.
    - `HUD`: The main control panel (Upload Dropzone + Asset List).
    - `Dock`: The collapsed state of the HUD, showing the currently loaded asset and a button to reopen the manager.
    - `AssetItem`: Individual row in the asset list with Load/Unload/Delete actions.

## 4. State Machine & Data Flow
- **App State**:
  - `assets`: List of available JSX files.
  - `loadedAssetId`: ID of the currently mounted component (null if empty).
  - `hudExpanded`: Boolean, controls whether the full manager or the mini-dock is visible.
  - `error`: Compilation or runtime error details (if any).

- **Upload Flow**:
  1. User drops `foo.jsx`.
  2. Read file as text.
  3. Store in `localforage` -> update `assets` state.
- **Load Flow**:
  1. User clicks "Load" on `foo.jsx`.
  2. Retrieve text from store.
  3. Pass to `Compiler` -> pass to `Runner` -> get React Component.
  4. Set component to `Stage` state.
  5. Set `hudExpanded` to `false` (show Dock).
- **Unload Flow**:
  1. Clear `Stage` component state.
  2. Set `hudExpanded` to `true` (show Manager).

## 5. Constraints & Limitations (MVP)
- **Dependencies**: Uploaded JSX files can *only* import from `react` (e.g., `import { useState } from 'react'`). Third-party npm packages (like `lodash` or `echarts`) are not supported in the MVP sandbox.
- **File Structure**: Only single-file components are supported. The file must have a `default export` representing the main component.
- **Security**: Since `new Function` is used, this is strictly for internal/trusted use. Do not expose this publicly to untrusted users uploading malicious scripts.

## 6. Implementation Phases (Plan)
*Note: This spec only covers the design. Implementation will be handled in a separate phase based on this document.*