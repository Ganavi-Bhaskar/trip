import { useEffect, useRef } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { AppShell } from './components/layout/AppShell'
import { AuthPage } from './pages/AuthPage'
import { BalancesPage } from './pages/BalancesPage'
import { DashboardPage } from './pages/DashboardPage'
import { ExpenseEditRedirect } from './pages/ExpenseEditRedirect'
import { ExpensesPage, ExpenseFormPage } from './pages/ExpensesPage'
import { ItineraryPage } from './pages/ItineraryPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PhotosPage } from './pages/PhotosPage'
import { SettingsPage } from './pages/SettingsPage'
import { TripFormPage } from './pages/TripFormPage'
import { TripOverviewPage } from './pages/TripOverviewPage'
import { TravelersPage } from './pages/TravelersPage'
import { WelcomePage } from './pages/WelcomePage'
import { LoadingState } from './components/ui/States'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingState label="Opening your travel journal" />
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
}

function ThemeSync() {
  const { user } = useAuth()
  const { setTheme } = useTheme()
  const appliedUserId = useRef<string | null>(null)

  useEffect(() => {
    // Only apply the DB-stored theme preference ONCE per login session.
    // If the user has already selected a local theme during this session,
    // we do NOT overwrite it when the user object re-fetches (e.g. after saving settings).
    if (!user) {
      appliedUserId.current = null
      return
    }
    // Only sync when the user ID changes (i.e. a new login), not on every user object mutation.
    if (appliedUserId.current === user.id) return
    appliedUserId.current = user.id
    // Only apply the DB theme if the user has no locally-stored preference yet.
    // getStoredTheme() returns 'system' as fallback, but we can check if localStorage has a value.
    const localKey = window.localStorage.getItem('tripsplit-theme')
    if (!localKey) {
      // First time for this browser — use the DB preference
      setTheme(user.preferences.theme)
    }
    // If the user already has a local preference, respect it and don't overwrite
  }, [user, setTheme])

  return null
}


function App() {
  return <AuthProvider><ThemeProvider><ToastProvider><BrowserRouter><ThemeSync /><Routes>
    <Route path="/" element={<WelcomePage />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/trips/new" element={<TripFormPage />} />
        <Route path="/trips/:tripId/edit" element={<TripFormPage />} />
        <Route path="/trips/:tripId" element={<TripOverviewPage />} />
        <Route path="/trips/:tripId/itinerary" element={<ItineraryPage />} />
        <Route path="/trips/:tripId/expenses" element={<ExpensesPage />} />
        <Route path="/trips/:tripId/expenses/new" element={<ExpenseFormPage />} />
        <Route path="/trips/:tripId/expenses/:expenseId/edit" element={<ExpenseFormPage />} />
        <Route path="/expenses/:expenseId/edit" element={<ExpenseEditRedirect />} />
        <Route path="/trips/:tripId/travelers" element={<TravelersPage />} />
        <Route path="/trips/:tripId/photos" element={<PhotosPage />} />
        <Route path="/trips/:tripId/balances" element={<BalancesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></BrowserRouter></ToastProvider></ThemeProvider></AuthProvider>
}

export default App
