import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Global tokens first so component styles can override the shared primitives.
import './styles/global.css'
import './core/i18n/i18n'
import { App } from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
