import { StrictMode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthProvider'
import { LoginScreen } from './components/auth/LoginScreen'
import { RegistrationScreen } from './components/auth/RegistrationScreen'
import { AuthPreviewScreen } from './components/auth/AuthPreviewScreen'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth/login" element={<LoginScreen />} />
          <Route path="/auth/register" element={<RegistrationScreen />} />
          <Route path="/auth/preview" element={<AuthPreviewScreen />} />
          <Route path="/" element={<App />} />
          <Route path="/boards/:boardId" element={<App />} />
          <Route path="*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
