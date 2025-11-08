import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { SidebarProvider } from "@/components/ui/sidebar"
import { SidebarLayout } from "@/components/sidebar"
import { routes } from "@/configs"

function App() {
  const user = {
    name: "Traveller",
    email: "traveller@example.com",
    avatar: "https://i.pinimg.com/736x/35/e2/78/35e2788fd9c56df3d3c51287549d5c0a.jpg",
  }

  return (
    <Router>
      <SidebarProvider defaultOpen={false}>
        <SidebarLayout user={user}>
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            {routes.map((route) => (
              <Route key={route.id} path={route.path} element={route.element} />
            ))}
          </Routes>
        </SidebarLayout>
      </SidebarProvider>
    </Router>
  )
}

export default App
