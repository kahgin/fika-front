import { useNavigate, useLocation } from 'react-router-dom'
import { navigationRoutes } from '@/configs'
import type { NavigationViewType } from '@/configs/routes'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'
import { useState } from 'react'
import CreateItineraryForm from '@/components/forms/create-itinerary-form'

// Export constant for bottom nav height - single source of truth
export const BOTTOM_NAV_HEIGHT = 64 // 16 * 4 = 64px (h-16)

export function BottomNav({ user }: { user: any }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const getCurrentView = (): NavigationViewType | string => {
    const path = location.pathname.slice(1) || 'chat'
    return path
  }

  const handleViewChange = (view: NavigationViewType, path: string) => {
    if (view === 'create') {
      setIsCreateOpen(true)
      return
    }
    navigate(view === 'chat' ? '/' : path)
  }

  const handleUserClick = () => {
    navigate('/settings')
  }

  return (
    <>
      <CreateItineraryForm open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <nav className="fixed right-0 bottom-0 left-0 z-40 border-t bg-white" style={{ height: `${BOTTOM_NAV_HEIGHT}px` }}>
        <div className="flex h-full items-center justify-around px-2">
          {navigationRoutes.map((item) => {
            const isActive = getCurrentView() === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id, item.path)}
                className="flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors"
              >
                <item.icon className={`h-6 w-6 ${isActive ? '' : 'text-muted-foreground'}`} fill={isActive ? 'rgb(156, 163, 175)' : 'none'} />
                <span className={`text-xs ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>{item.label}</span>
              </button>
            )
          })}

          {/* User Profile Button */}
          <button onClick={handleUserClick} className="flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors">
            {user.avatar ? (
              <Avatar className="h-6 w-6 rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-xs">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            ) : (
              <User className={`h-6 w-6 ${getCurrentView() === 'settings' ? '' : 'text-muted-foreground'}`} />
            )}
            <span className={`text-xs ${getCurrentView() === 'settings' ? 'font-medium' : 'text-muted-foreground'}`}>Profile</span>
          </button>
        </div>
      </nav>
    </>
  )
}
