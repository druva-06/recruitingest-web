import React from 'react'
import './App.css'
import { useAuth } from './AuthContext.jsx'
import LoginPage from './LoginPage.jsx'
import { AppShell } from './features/ingest/AppShell.jsx'

function App() {
  const { user, loading: authLoading, logout } = useAuth()

  if (authLoading) {
    return (
      <div className="app-loading" role="status" aria-label="Loading">
        <div className="app-loading-spinner" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <AppShell user={user} logout={logout} />
}

export default App
