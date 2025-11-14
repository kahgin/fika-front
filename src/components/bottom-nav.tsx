import { useNavigate, useLocation } from "react-router-dom"
import { navigationRoutes } from "@/configs"
import type { NavigationViewType } from "@/configs/routes"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { User } from "lucide-react"
import { useState } from "react"
import CreateItineraryForm from "@/components/forms/create-itinerary-form"

// Export constant for bottom nav height - single source of truth
export const BOTTOM_NAV_HEIGHT = 64; // 16 * 4 = 64px (h-16)

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const displayUser = user || {
    name: "Guest",
    email: "guest@example.com",
    avatar: "",
  }

  const getCurrentView = (): NavigationViewType | string => {
    const path = location.pathname.slice(1) || "chat"
    return path
  }

  const handleViewChange = (view: NavigationViewType, path: string) => {
    if (view === "create") {
      setIsCreateOpen(true)
      return
    }
    navigate(view === "chat" ? "/" : path)
  }

  const handleUserClick = () => {
    navigate("/settings")
  }

  return (
    <>
      <CreateItineraryForm open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40"
        style={{ height: `${BOTTOM_NAV_HEIGHT}px` }}
      >
        <div className="flex items-center justify-around h-full px-2">
          {navigationRoutes.map((item) => {
            const isActive = getCurrentView() === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id, item.path)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
              >
                <item.icon
                  className={`w-6 h-6 ${
                    isActive ? "text-gray-900" : "text-gray-500"
                  }`}
                  fill={isActive ? "rgb(156, 163, 175)" : "none"}
                />
                <span
                  className={`text-xs ${
                    isActive ? "text-gray-900 font-medium" : "text-gray-500"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
          
          {/* User Profile Button */}
          <button
            onClick={handleUserClick}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors"
          >
            {displayUser.avatar ? (
              <Avatar className="w-6 h-6">
                <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
                <AvatarFallback className="text-xs">
                  {displayUser.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User
                className={`w-6 h-6 ${
                  getCurrentView() === "settings"
                    ? "text-gray-900"
                    : "text-gray-500"
                }`}
              />
            )}
            <span
              className={`text-xs ${
                getCurrentView() === "settings"
                  ? "text-gray-900 font-medium"
                  : "text-gray-500"
              }`}
            >
              Profile
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
