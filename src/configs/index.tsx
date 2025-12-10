import { navigationRoutes, utilityRoutes } from '@/configs/routes'
import ChatPage from '@/pages/ChatPage'
import CreateItineraryPage from '@/pages/CreateItineraryPage'
import ItineraryPage from '@/pages/ItineraryPage'
import SearchPage from '@/pages/SearchPage'
import SettingPage from '@/pages/SettingPage'

// Map navigation routes to elements
const navigationRoutesWithElements = navigationRoutes.map((route) => {
  switch (route.id) {
    case 'chat':
      return { ...route, element: <ChatPage /> }
    case 'itinerary':
      return { ...route, element: <ItineraryPage /> }
    case 'search':
      return { ...route, element: <SearchPage /> }
    case 'create':
      return { ...route, element: <CreateItineraryPage /> }
  }
})

// Map utility routes to elements
const utilityRoutesWithElements = utilityRoutes.map((route) => {
  switch (route.id) {
    case 'settings':
      return { ...route, element: <SettingPage /> }
  }
})

// All routes for rendering
export const routes = [...navigationRoutesWithElements, ...utilityRoutesWithElements]

export { navigationRoutes }
