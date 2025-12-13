import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { navigationRoutes } from '@/configs'
import type { NavigationViewType } from '@/configs/routes'
import type { User as UserType } from '@/services/api'
import { User } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

// Export constant for bottom nav height
export const BOTTOM_NAV_HEIGHT = 64 // 16 * 4 = 64px (h-16)

export function BottomNav({ user }: { user: UserType | null }) {
  const navigate = useNavigate()
  const location = useLocation()

  const getCurrentView = (): NavigationViewType | string => {
    const path = location.pathname.slice(1) || 'chat'
    return path
  }

  const handleViewChange = (view: NavigationViewType, path: string) => {
    navigate(view === 'chat' ? '/' : path)
  }

  const handleUserClick = () => {
    navigate('/settings')
  }

  return (
    <>
      <nav
        className='fixed right-0 bottom-0 left-0 z-40 border-t bg-white'
        style={{ height: `${BOTTOM_NAV_HEIGHT}px` }}
      >
        <div className='flex h-full items-center justify-around px-2'>
          {navigationRoutes.map((item) => {
            const isActive = getCurrentView() === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id, item.path)}
                className='flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors'
              >
                <item.icon
                  className={`h-6 w-6 ${isActive ? '' : 'text-muted-foreground'}`}
                  fill={isActive ? 'rgb(156, 163, 175)' : 'none'}
                />
                <span className={`text-xs ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>{item.label}</span>
              </button>
            )
          })}

          {/* User Profile Button */}
          <button
            onClick={handleUserClick}
            className='flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors'
          >
            {user?.avatar ? (
              <Avatar className='h-6 w-6 rounded-full'>
                <AvatarImage src={user.avatar} alt={user.name || 'User'} />
                <AvatarFallback className='text-xs'>
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className={`h-6 w-6 ${getCurrentView() === 'settings' ? '' : 'text-muted-foreground'}`} />
            )}
            <span className={`text-xs ${getCurrentView() === 'settings' ? 'font-medium' : 'text-muted-foreground'}`}>
              Profile
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
