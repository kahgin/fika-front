import { MessageCircle, Scroll, Search, SquarePlus } from 'lucide-react'

// Navigation routes
export const navigationRoutes = [
  {
    id: 'chat',
    path: '/chat',
    label: 'Chat',
    icon: MessageCircle,
  },
  {
    id: 'itinerary',
    path: '/itinerary',
    label: 'Itinerary',
    icon: Scroll,
  },
  {
    id: 'search',
    path: '/search',
    label: 'Search',
    icon: Search,
  },
  {
    id: 'create',
    path: '/create',
    label: 'Create',
    icon: SquarePlus,
  },
] as const

// Utility routes
export const utilityRoutes = [
  {
    id: 'settings',
    path: '/settings',
    label: 'Settings',
  },
] as const

// All app routes combined
export const appRoutes = [...navigationRoutes, ...utilityRoutes] as const

export type NavigationViewType = (typeof navigationRoutes)[number]['id']
export type UtilityViewType = (typeof utilityRoutes)[number]['id']
export type ViewType = NavigationViewType | UtilityViewType
