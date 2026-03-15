import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Auth from './pages/Auth'
import Home from './pages/Home'
import Study from './pages/Study'
import Reading from './pages/Reading'
import Review from './pages/Review'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-cream-100">
        <div className="text-center">
          <div className="text-4xl mb-3">📖</div>
          <div className="flex gap-1.5 justify-center">
            {[0,1,2].map(i => (
              <div key={i}
                className="w-2 h-2 bg-warm-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return user ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/"         element={<Home />} />
                  <Route path="/study"    element={<Study />} />
                  <Route path="/reading"  element={<Reading />} />
                  <Route path="/review"   element={<Review />} />
                  <Route path="*"         element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}