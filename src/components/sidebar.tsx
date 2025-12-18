import LoginForm from '@/components/forms/login-form'
import SignupForm from '@/components/forms/signup-form'
import Logo from '@/components/logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { navigationRoutes } from '@/configs'
import type { NavigationViewType } from '@/configs/routes'
import { useAuth } from '@/contexts/AuthContext'
import type { User } from '@/services/api'
import { BadgeCheck, LogIn, LogOut, User as UserIcon, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export function AppSidebar({ user }: { user: User | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, isMobile } = useSidebar()
  const { logout, isAuthenticated } = useAuth()
  const [isLogoHovered, setIsLogoHovered] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showSignupDialog, setShowSignupDialog] = useState(false)

  const getCurrentView = (): NavigationViewType | string => {
    const path = location.pathname.slice(1) || 'itinerary'
    return path
  }

  const handleViewChange = (view: NavigationViewType, path: string) => {
    navigate(view === 'itinerary' ? '/' : path)
  }

  return (
    <Sidebar collapsible='icon' variant='sidebar'>
      {/* Header */}
      <SidebarHeader className='flex h-12 items-center'>
        {state === 'expanded' && (
          <div className='flex w-full justify-between px-2'>
            <Logo variant='full' size='lg' />
            <SidebarTrigger className='hover:bg-muted-foreground/15 transition-colors duration-200' />
          </div>
        )}
        {state === 'collapsed' && (
          <div
            className='relative flex w-full items-center justify-center'
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            <Logo
              variant='mark'
              iconClassName='size-6'
              className={`absolute flex transition-all duration-300 ease-in-out ${isLogoHovered ? 'scale-0 rotate-12 opacity-0' : 'scale-100 rotate-0 opacity-100'} `}
            />
            <SidebarTrigger
              className={`hover:bg-muted-foreground/15 transition-all duration-300 ease-in-out ${isLogoHovered ? 'opacity-100' : 'opacity-0'} `}
            />
          </div>
        )}
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarMenu className='p-2'>
          {navigationRoutes.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                onClick={() => handleViewChange(item.id, item.path)}
                tooltip={item.label}
                isActive={getCurrentView() === item.id}
                className='transition-all duration-200 ease-in-out'
              >
                <item.icon className='shrink-0' fill={getCurrentView() === item.id ? 'rgb(156, 163, 175)' : 'none'} />
                <span className='ml-3'>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size='lg'>
                    <Avatar>
                      <AvatarImage src={user.avatar || undefined} alt={user.name || 'User'} />
                      <AvatarFallback>{(user.name || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className='grid flex-1 text-left text-sm leading-tight'>
                      <span className='truncate font-medium'>{user.name || 'User'}</span>
                      <span className='truncate text-xs'>{user.email}</span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className='ml-2 w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                  side={isMobile ? 'bottom' : 'top'}
                  align='end'
                  sideOffset={8}
                >
                  <DropdownMenuLabel className='p-0 font-normal'>
                    <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                      <Avatar>
                        <AvatarImage src={user.avatar || undefined} alt={user.name || 'User'} />
                        <AvatarFallback>{(user.name || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className='grid flex-1 text-left text-sm leading-tight'>
                        <span className='truncate font-medium'>{user.name || 'User'}</span>
                        <span className='truncate text-xs'>{user.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <BadgeCheck />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size='lg'>
                    <Avatar>
                      <AvatarFallback>
                        <UserIcon className='h-4 w-4' />
                      </AvatarFallback>
                    </Avatar>
                    <div className='grid flex-1 text-left text-sm leading-tight'>
                      <span className='truncate font-medium'>Guest</span>
                      <span className='truncate text-xs text-muted-foreground'>Sign in to save trips</span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className='ml-2 w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
                  side={isMobile ? 'bottom' : 'top'}
                  align='end'
                  sideOffset={8}
                >
                  <DropdownMenuLabel className='p-0 font-normal'>
                    <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                      <Avatar>
                        <AvatarFallback>
                          <UserIcon className='h-4 w-4' />
                        </AvatarFallback>
                      </Avatar>
                      <div className='grid flex-1 text-left text-sm leading-tight'>
                        <span className='truncate font-medium'>Guest</span>
                        <span className='truncate text-xs text-muted-foreground'>Not signed in</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowLoginDialog(true)}>
                    <LogIn />
                    Sign in
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowSignupDialog(true)}>
                    <UserPlus />
                    Create account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Auth Dialogs */}
      <LoginForm
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onSwitchToSignup={() => {
          setShowLoginDialog(false)
          setShowSignupDialog(true)
        }}
      />
      <SignupForm
        open={showSignupDialog}
        onOpenChange={setShowSignupDialog}
        onSwitchToLogin={() => {
          setShowSignupDialog(false)
          setShowLoginDialog(true)
        }}
      />
    </Sidebar>
  )
}

export function SidebarLayout({ children, user }: { children: React.ReactNode; user: User | null }) {
  return (
    <>
      <AppSidebar user={user} />
      <SidebarInset>{children}</SidebarInset>
    </>
  )
}
