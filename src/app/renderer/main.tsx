import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root 요소가 없다')

createRoot(container).render(
  <StrictMode>
    <p>today-is-deadline</p>
  </StrictMode>,
)
