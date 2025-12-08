import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { navigationRoutes } from '@/configs'
import type { NavigationViewType } from '@/configs/routes'
import Logo from '@/components/logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BadgeCheck, LogOut } from 'lucide-react'

export function AppSidebar({ user }: { user: any }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, isMobile } = useSidebar()
  const [isLogoHovered, setIsLogoHovered] = useState(false)

  const getCurrentView = (): NavigationViewType | string => {
    const path = location.pathname.slice(1) || 'chat'
    return path
  }

  const handleViewChange = (view: NavigationViewType, path: string) => {
    navigate(view === 'chat' ? '/' : path)
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/* Header */}
      <SidebarHeader className="flex h-12 items-center">
        {state === 'expanded' && (
          <div className="flex w-full justify-between px-2">
            <Logo variant="full" size="lg" />
            <SidebarTrigger className="hover:bg-muted-foreground/15 transition-colors duration-200" />
          </div>
        )}
        {state === 'collapsed' && (
          <div
            className="relative flex w-full items-center justify-center"
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            <Logo
              variant="mark"
              iconClassName="size-6"
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
        <SidebarMenu className="p-2">
          {navigationRoutes.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                onClick={() => handleViewChange(item.id, item.path)}
                tooltip={item.label}
                isActive={getCurrentView() === item.id}
                className="transition-all duration-200 ease-in-out"
              >
                <item.icon className="shrink-0" fill={getCurrentView() === item.id ? 'rgb(156, 163, 175)' : 'none'} />
                <span className="ml-3">{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="ml-2 w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? 'bottom' : 'top'}
                align="end"
                sideOffset={8}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar>
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <BadgeCheck />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export function SidebarLayout({ children, user }: { children: React.ReactNode; user: any }) {
  return (
    <>
      <AppSidebar user={user} />
      <SidebarInset>{children}</SidebarInset>
    </>
  )
}
