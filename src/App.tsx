import { HUD } from './components/HUD'
import { Stage } from './components/Stage'
import { AppProvider } from './context/AppContext'

export default function App() {
  return (
    <AppProvider>
      <main className="relative h-screen w-screen overflow-hidden font-sans">
        <Stage />
        <HUD />
      </main>
    </AppProvider>
  )
}
