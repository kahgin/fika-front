import { MessageCircle, Briefcase, Search, MapPlus } from "lucide-react"

export const appRoutes = [
  {
    id: "chat",
    path: "/chat",
    label: "Chat",
    icon: MessageCircle,
  },
  {
    id: "itinerary",
    path: "/itinerary",
    label: "Itinerary",
    icon: Briefcase,
  },
  {
    id: "search",
    path: "/search",
    label: "Search",
    icon: Search,
  },
  {
    id: "create",
    path: "/create",
    label: "Create",
    icon: MapPlus,
  },
  {
    id: "settings",
    path: "/settings",
    label: "Settings",
    icon: Briefcase,
  }
] as const

export type ViewType = typeof appRoutes[number]["id"]
