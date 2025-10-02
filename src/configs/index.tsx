import { appRoutes } from "./routes"
import ChatPage from "@/pages/ChatPage"
import ItineraryPage from "@/pages/ItineraryPage"
import SearchPage from "@/pages/SearchPage"
import SettingPage from "@/pages/SettingPage"

export const routes = appRoutes.map((route) => {
  switch (route.id) {
    case "chat":
      return { ...route, element: <ChatPage /> }
    case "itinerary":
      return { ...route, element: <ItineraryPage /> }
    case "search":
      return { ...route, element: <SearchPage /> }
    case "create":
      return { ...route, element: null }
    case "settings":
      return { ...route, element: <SettingPage /> }
    default:
      return route
  }
})
