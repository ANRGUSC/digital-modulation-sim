import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import Quiz from './components/Quiz.tsx'
import DigDeeper from './components/DigDeeper.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/dig-deeper" element={<DigDeeper />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  </StrictMode>,
)
