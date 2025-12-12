import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AllowlistProvider } from './contexts/AllowlistContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AllowlistProvider>
      <App />
    </AllowlistProvider>
  </StrictMode>,
)
