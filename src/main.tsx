import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts-inter-latin.css'
import './index.css'
import App from './App.tsx'

void import('./fonts-mono.css')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
