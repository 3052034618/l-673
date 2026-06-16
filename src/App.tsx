import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import PlantDetail from "@/pages/PlantDetail";
import Forecast from "@/pages/Forecast";
import AlertCenter from "@/pages/AlertCenter";
import Login from "@/pages/Login";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/plant/:id" element={
          <ProtectedRoute>
            <PlantDetail />
          </ProtectedRoute>
        } />
        <Route path="/forecast" element={
          <ProtectedRoute>
            <Forecast />
          </ProtectedRoute>
        } />
        <Route path="/forecast/:plantId" element={
          <ProtectedRoute>
            <Forecast />
          </ProtectedRoute>
        } />
        <Route path="/alerts" element={
          <ProtectedRoute>
            <AlertCenter />
          </ProtectedRoute>
        } />
        <Route path="*" element={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">404 页面不存在</h2>
              <p className="text-gray-500">请检查您访问的地址</p>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}
