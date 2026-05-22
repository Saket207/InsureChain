import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegisterPolicy from './pages/RegisterPolicy';
import Heatmap from './pages/Heatmap';
import PolicyDetail from './pages/PolicyDetail';
import Alerts from './pages/Alerts';
import Governance from './pages/Governance';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes (no sidebar/navbar) */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Routes with app layout (sidebar + navbar) */}
          <Route element={<AppLayout />}>
            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register-policy"
              element={
                <ProtectedRoute>
                  <RegisterPolicy />
                </ProtectedRoute>
              }
            />
            <Route
              path="/policy/:id"
              element={
                <ProtectedRoute>
                  <PolicyDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <Alerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Public routes with layout */}
            <Route path="/heatmap" element={<Heatmap />} />
            <Route path="/governance" element={<Governance />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
