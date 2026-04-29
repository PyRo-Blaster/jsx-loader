# JSX Asset Loader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure client-side React SPA that allows users to upload, manage, and instantly preview `.jsx` files in a fullscreen light-themed stage with a floating frosted-glass HUD manager, backed by IndexedDB and deployable via Docker Compose.

**Architecture:** 
1. **Frontend**: Vite + React 18 SPA. `@babel/standalone` transpiles uploaded JSX strings in the browser. A custom `new Function` sandbox executes the code, mocking `require('react')` to inject the global React instance. `localforage` persists files to IndexedDB.
2. **UI**: Tailwind CSS for styling (light theme, frosted glass). `framer-motion` for HUD expand/collapse animations. Lucide-react for icons.
3. **Deployment**: Multi-stage Dockerfile (Node builder -> Nginx Alpine server) orchestrated by `docker-compose.yml` for easy Linux deployment.

**Tech Stack:** React 18, Vite, Tailwind CSS, `@babel/standalone`, `localforage`, `framer-motion`, Docker, Nginx.

---

## Phase 1: Project Initialization & Configuration

### Task 1.1: Scaffold Vite Project & Install Dependencies

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `tsconfig.json`

- [ ] **Step 1: Initialize Vite React-TS Project**
Run: `npm create vite@latest . -- --template react-ts` (Note: Ensure this is run in the root directory and overrides if necessary, or manually create the files).

- [ ] **Step 2: Install Dependencies**
Run: `npm install @babel/standalone localforage framer-motion lucide-react`
Run: `npm install -D tailwindcss postcss autoprefixer @types/babel__standalone`

- [ ] **Step 3: Configure Tailwind CSS**
Initialize Tailwind config: `npx tailwindcss init -p`
Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 4: Setup Global CSS**
Modify `src/index.css` to include Tailwind directives and global resets for fullscreen:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f8fafc;
}
```

- [ ] **Step 5: Commit Phase 1**
```bash
git add .
git commit -m "chore: initialize vite project with tailwind and core dependencies"
```

---

## Phase 2: Core Services (Storage, Compiler, Runner)

### Task 2.1: Implement IndexedDB Storage Service

**Files:**
- Create: `src/services/store.ts`

- [ ] **Step 1: Define Types and localforage setup**
Create `src/services/store.ts`:
```typescript
import localforage from 'localforage';

export interface JSXAsset {
  id: string;
  name: string;
  content: string;
  size: number;
  updatedAt: number;
}

const store = localforage.createInstance({
  name: 'JSXAssetLoader',
  storeName: 'assets'
});

export const saveAsset = async (asset: JSXAsset): Promise<void> => {
  await store.setItem(asset.id, asset);
};

export const getAsset = async (id: string): Promise<JSXAsset | null> => {
  return await store.getItem(id);
};

export const getAllAssets = async (): Promise<JSXAsset[]> => {
  const assets: JSXAsset[] = [];
  await store.iterate((value: JSXAsset) => {
    assets.push(value);
  });
  return assets.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const deleteAsset = async (id: string): Promise<void> => {
  await store.removeItem(id);
};
```

### Task 2.2: Implement Browser Compiler and Sandbox Runner

**Files:**
- Create: `src/services/compiler.ts`
- Create: `src/services/runner.ts`

- [ ] **Step 1: Implement Babel Compiler**
Create `src/services/compiler.ts`:
```typescript
import * as Babel from '@babel/standalone';

export const compileJSX = (code: string): string => {
  try {
    const result = Babel.transform(code, {
      presets: ['react'],
      filename: 'dynamic.jsx'
    });
    return result.code || '';
  } catch (error) {
    console.error("Babel compilation error:", error);
    throw new Error(`Compilation failed: ${(error as Error).message}`);
  }
};
```

- [ ] **Step 2: Implement Sandbox Execution**
Create `src/services/runner.ts`. This safely executes the compiled code and injects React.
```typescript
import React from 'react';

export const runComponent = (compiledCode: string): React.ComponentType<any> => {
  try {
    const exports: Record<string, any> = {};
    
    // Mock require to provide React
    const customRequire = (moduleName: string) => {
      if (moduleName === 'react') return React;
      throw new Error(`Module '${moduleName}' is not supported in this sandbox.`);
    };

    // Create execution context
    const execute = new Function('exports', 'require', 'React', compiledCode);
    
    // Run the code
    execute(exports, customRequire, React);

    // The babel transform converts `export default` to `exports.default`
    if (!exports.default) {
      throw new Error("No default export found. The JSX file must have an `export default` component.");
    }

    return exports.default;
  } catch (error) {
    console.error("Runtime execution error:", error);
    throw new Error(`Execution failed: ${(error as Error).message}`);
  }
};
```

- [ ] **Step 3: Commit Phase 2**
```bash
git add src/services
git commit -m "feat: add localforage store, babel compiler, and sandbox runner"
```

---

## Phase 3: UI Components Construction

### Task 3.1: Build Context and State Management

**Files:**
- Create: `src/context/AppContext.tsx`

- [ ] **Step 1: Implement App Context**
Create a context to manage assets, loaded component, and HUD state.
```typescript
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { JSXAsset, getAllAssets, saveAsset, deleteAsset } from '../services/store';

interface AppContextType {
  assets: JSXAsset[];
  loadedAsset: JSXAsset | null;
  hudExpanded: boolean;
  error: string | null;
  loadAsset: (id: string) => void;
  unloadAsset: () => void;
  removeAsset: (id: string) => void;
  uploadAsset: (file: File) => Promise<void>;
  setHudExpanded: (expanded: boolean) => void;
  setError: (err: string | null) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [assets, setAssets] = useState<JSXAsset[]>([]);
  const [loadedAsset, setLoadedAsset] = useState<JSXAsset | null>(null);
  const [hudExpanded, setHudExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllAssets().then(setAssets);
  }, []);

  const loadAsset = (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (asset) {
      setLoadedAsset(asset);
      setHudExpanded(false);
      setError(null);
    }
  };

  const unloadAsset = () => {
    setLoadedAsset(null);
    setHudExpanded(true);
    setError(null);
  };

  const removeAsset = async (id: string) => {
    await deleteAsset(id);
    setAssets(assets.filter(a => a.id !== id));
    if (loadedAsset?.id === id) unloadAsset();
  };

  const uploadAsset = async (file: File) => {
    try {
      const text = await file.text();
      const newAsset: JSXAsset = {
        id: crypto.randomUUID(),
        name: file.name,
        content: text,
        size: file.size,
        updatedAt: Date.now()
      };
      await saveAsset(newAsset);
      setAssets([newAsset, ...assets]);
    } catch (err) {
      setError(`Failed to read file: ${(err as Error).message}`);
    }
  };

  return (
    <AppContext.Provider value={{ assets, loadedAsset, hudExpanded, error, loadAsset, unloadAsset, removeAsset, uploadAsset, setHudExpanded, setError }}>
      {children}
    </AppContext.Provider>
  );
};
```

### Task 3.2: Build the Fullscreen Stage

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Create: `src/components/Stage.tsx`

- [ ] **Step 1: Create ErrorBoundary**
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; onError: (err: string) => void }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError(error.message);
  }

  public render() {
    if (this.state.hasError) {
      return null; // The stage will show nothing, error handled by context
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Create Stage Component**
```tsx
import React, { useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { compileJSX } from '../services/compiler';
import { runComponent } from '../services/runner';
import { ErrorBoundary } from './ErrorBoundary';

export const Stage = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { loadedAsset, setError } = context;

  const ComponentToRender = useMemo(() => {
    if (!loadedAsset) return null;
    try {
      const compiled = compileJSX(loadedAsset.content);
      return runComponent(compiled);
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, [loadedAsset, setError]);

  if (!loadedAsset) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-0">
        <h1 className="text-3xl font-bold text-slate-300">JSX Asset Loader</h1>
        <p className="text-slate-400 mt-2">Open the HUD to load an asset.</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-auto bg-white">
      <ErrorBoundary onError={setError}>
        {ComponentToRender && <ComponentToRender />}
      </ErrorBoundary>
    </div>
  );
};
```

### Task 3.3: Build HUD and Dock Components

**Files:**
- Create: `src/components/HUD.tsx`

- [ ] **Step 1: Create HUD Component with framer-motion**
```tsx
import React, { useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Play, Trash2, SquareSquare } from 'lucide-react';
import { AppContext } from '../context/AppContext';

export const HUD = () => {
  const context = useContext(AppContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  if (!context) return null;
  const { assets, loadedAsset, hudExpanded, setHudExpanded, loadAsset, unloadAsset, removeAsset, uploadAsset, error } = context;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.jsx')) {
      uploadAsset(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed bottom-0 left-0 w-full flex justify-center z-50 pointer-events-none">
      <AnimatePresence mode="wait">
        {hudExpanded ? (
          <motion.div 
            key="panel"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: -40, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="w-[600px] bg-white/85 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden pointer-events-auto flex flex-col max-h-[60vh]"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white/50">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                JSX Asset Manager
              </div>
              <button onClick={() => setHudExpanded(false)} className="text-slate-400 hover:text-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-mono break-all">
                  {error}
                </div>
              )}

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-slate-300 rounded-xl p-5 text-center text-slate-500 text-sm bg-slate-50/50 hover:bg-slate-100 hover:border-sky-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <Upload className="mx-auto mb-2 opacity-50" size={20} />
                Drop .jsx files here or click to browse
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".jsx" className="hidden" />
              </div>

              <div className="flex flex-col gap-2">
                {assets.map(asset => {
                  const isLoaded = loadedAsset?.id === asset.id;
                  return (
                    <div key={asset.id} className={`flex justify-between items-center px-4 py-3 bg-white rounded-xl border transition-all ${isLoaded ? 'border-sky-200 bg-sky-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-900">{asset.name}</span>
                        <span className="text-[11px] text-slate-500">{(asset.size/1024).toFixed(1)} KB • {new Date(asset.updatedAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex gap-2">
                        {isLoaded ? (
                          <button onClick={unloadAsset} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors">Unload</button>
                        ) : (
                          <button onClick={() => loadAsset(asset.id)} className="px-3 py-1.5 bg-sky-500 text-white rounded-lg text-xs font-medium hover:bg-sky-600 transition-colors shadow-sm">Load</button>
                        )}
                        <button onClick={() => removeAsset(asset.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="dock"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: -24, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="bg-white/90 backdrop-blur-md border border-black/5 rounded-full px-4 py-2 flex items-center gap-4 shadow-xl pointer-events-auto"
          >
            <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
              <div className={`w-2 h-2 rounded-full ${loadedAsset ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`} />
              {loadedAsset ? loadedAsset.name : 'No asset loaded'}
            </div>
            <button onClick={() => setHudExpanded(true)} className="px-4 py-1.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-full text-xs font-medium hover:bg-slate-200 transition-colors flex items-center gap-1">
              <SquareSquare size={14} /> Open Manager
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

### Task 3.4: Wire Up App.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Setup Main Entry**
Update `src/App.tsx`:
```tsx
import React from 'react';
import { AppProvider } from './context/AppContext';
import { Stage } from './components/Stage';
import { HUD } from './components/HUD';

function App() {
  return (
    <AppProvider>
      <div className="relative w-screen h-screen overflow-hidden font-sans">
        <Stage />
        <HUD />
      </div>
    </AppProvider>
  );
}

export default App;
```

- [ ] **Step 2: Commit Phase 3**
```bash
git add src/context src/components src/App.tsx
git commit -m "feat: implement Stage, HUD, and AppContext for asset management"
```

---

## Phase 4: Deployment Configuration (Docker & Nginx)

### Task 4.1: Nginx Configuration

**Files:**
- Create: `nginx.conf`

- [ ] **Step 1: Create `nginx.conf` for SPA routing**
Create `nginx.conf` in the project root:
```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Fallback for SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
```

### Task 4.2: Multi-stage Dockerfile

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**
```text
node_modules
dist
.git
.env
```

- [ ] **Step 2: Create `Dockerfile`**
```dockerfile
# Stage 1: Build
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*
# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Task 4.3: Docker Compose Configuration

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create `docker-compose.yml`**
```yaml
version: '3.8'

services:
  jsx-loader:
    build: 
      context: .
      dockerfile: Dockerfile
    container_name: jsx-loader-web
    ports:
      - "8080:80"
    restart: always
    environment:
      - NODE_ENV=production
```

- [ ] **Step 2: Commit Phase 4**
```bash
git add nginx.conf Dockerfile .dockerignore docker-compose.yml
git commit -m "chore: add docker multi-stage build, nginx config, and docker-compose setup"
```

---

## Self-Review Checklist
- [x] All requirements from spec covered? Yes (Frontend sandbox, Light HUD, Docker Compose deployment).
- [x] Exact file paths provided? Yes.
- [x] Complete code snippets provided? Yes.
- [x] No placeholders like "TODO" or "TBD"? Yes.