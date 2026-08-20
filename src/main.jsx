import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ProvvedituraDati } from './dati/store.jsx'
import './stili/token.css'
import './stili/base.css'
import './stili/componenti.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProvvedituraDati>
      <App />
    </ProvvedituraDati>
  </StrictMode>,
)
