import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import BatchesPage from './pages/BatchesPage'
import InventoryPage from './pages/InventoryPage'
import MovementsPage from './pages/MovementsPage'
import ClientsPage from './pages/ClientsPage'
import SalesPage from './pages/SalesPage'
import ExpensesPage from './pages/ExpensesPage'
import CalculatorPage from './pages/CalculatorPage'
import MaterialsPage from './pages/MaterialsPage'
import SettingsPage from './pages/SettingsPage'
import ProtectedRoute from './components/shared/ProtectedRoute'
import AppLayout from './components/shared/AppLayout'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected app — shared sidebar + header */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/produits" element={<ProductsPage />} />
              <Route path="/lots" element={<BatchesPage />} />
              <Route path="/inventaire" element={<InventoryPage />} />
              <Route path="/matieres" element={<MaterialsPage />} />
              <Route path="/mouvements" element={<MovementsPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/ventes" element={<SalesPage />} />
              <Route path="/depenses" element={<ExpensesPage />} />
              <Route path="/calculateur" element={<CalculatorPage />} />
              <Route path="/profil" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
