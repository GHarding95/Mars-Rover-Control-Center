import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts-inter-latin.css'
import './fonts-mono.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
