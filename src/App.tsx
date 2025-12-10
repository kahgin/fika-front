import { BottomNav } from '@/components/bottom-nav'
import { SidebarLayout } from '@/components/sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { routes } from '@/configs'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

function AppContent() {
  const { user } = useAuth()
  const isMobile = useIsMobile()

  return (
    <Router>
      <SidebarProvider defaultOpen={false}>
        <SidebarLayout user={user}>
          <Routes>
            <Route path='/' element={<Navigate to='/chat' replace />} />
            {routes.map((route) => (
              <Route key={route.id} path={route.path} element={route.element} />
            ))}
          </Routes>
          {isMobile && <BottomNav user={user} />}
        </SidebarLayout>
      </SidebarProvider>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <Toaster position='top-center' richColors closeButton />
      <AppContent />
    </AuthProvider>
  )
}

export default App
