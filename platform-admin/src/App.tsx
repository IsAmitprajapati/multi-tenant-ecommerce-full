import './App.css'
import { Button } from './components/ui/button'
import { Toaster } from './components/ui/sonner'
import Routers from './routes'

function App() {
  return (
   <main>
    <Routers/>
    <Toaster/>
   </main>
  )
}

export default App
