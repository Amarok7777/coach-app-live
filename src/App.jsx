import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Players from './pages/Players'
import PlayerProfile from './pages/PlayerProfile'
import Training from './pages/Training'
import TrainingDetail from './pages/TrainingDetail'
import Matches from './pages/Matches'
import MatchDetail from './pages/MatchDetail'
import Lineup from './pages/Lineup'
import Availability from './pages/Availability'
import Injuries from './pages/Injuries'
import Stats from './pages/Stats'
import Admin from './pages/Admin'
import ShareView from './pages/ShareView'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ color: 'var(--md-outline)' }}>
      <span className="material-symbols-outlined animate-spin" style={{ fontSize: 32 }}>progress_activity</span>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function Wrap({ Page }) {
  return <PrivateRoute><Layout><Page /></Layout></PrivateRoute>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"          element={<Login />} />
        <Route path="/share/:token"   element={<ShareView />} />

        {/* Protected */}
        <Route path="/"               element={<Wrap Page={Dashboard} />} />
        <Route path="/players"        element={<Wrap Page={Players} />} />
        <Route path="/players/:id"    element={<Wrap Page={PlayerProfile} />} />
        <Route path="/training"       element={<Wrap Page={Training} />} />
        <Route path="/training/:id"   element={<Wrap Page={TrainingDetail} />} />
        <Route path="/matches"        element={<Wrap Page={Matches} />} />
        <Route path="/matches/:id"    element={<Wrap Page={MatchDetail} />} />
        <Route path="/lineup"         element={<Wrap Page={Lineup} />} />
        <Route path="/availability"   element={<Wrap Page={Availability} />} />
        <Route path="/injuries"       element={<Wrap Page={Injuries} />} />
        <Route path="/stats"          element={<Wrap Page={Stats} />} />
        <Route path="/admin"          element={<Wrap Page={Admin} />} />

        {/* Fallback */}
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
