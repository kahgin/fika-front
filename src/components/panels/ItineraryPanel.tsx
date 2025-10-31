import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronDown, ChevronRight, MoreHorizontal, Clock, Plus } from "lucide-react"

interface ItineraryPanelProps {
  className?: string
}

interface ItineraryItem {
  id: string
  name: string
  time?: string
  duration?: string
  distance?: string
  image?: string
  category?: string
  hasTime: boolean
}

interface ItineraryDay {
  id: string
  date: string
  dayName: string
  items: ItineraryItem[]
  isExpanded: boolean
}

export default function ItineraryPanel({ className = "" }: ItineraryPanelProps) {
  const [open, setOpen] = useState(false)

  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>({
    "day1": false,
    "day2": true,
    "day3": false
  })

  const tripData = {
    title: "Singapore's Trip",
    destination: "Singapore",
    dates: "5 days",
    travelers: "2 travelers",
    budget: "$"
  }

  const ideasItems: ItineraryItem[] = [
    {
      id: "idea1",
      name: "Singapore Botanic Gardens",
      category: "Attraction",
      image: "/api/placeholder/300/200",
      hasTime: false
    }
  ]

  const itineraryDays: ItineraryDay[] = [
    {
      id: "day1",
      date: "Mon 1/1",
      dayName: "Day 1",
      isExpanded: expandedDays["day1"],
      items: []
    },
    {
      id: "day2",
      date: "Tue 1/2",
      dayName: "Day 2",
      isExpanded: expandedDays["day2"],
      items: [
        {
          id: "dest1",
          name: "Civic District",
          time: "9:00 AM - 11:00 AM",
          distance: "0.13 km",
          image: "/api/placeholder/300/200",
          hasTime: true
        },
        {
          id: "dest2",
          name: "National Gallery Singapore",
          time: "2:00 PM - 5:00 PM",
          distance: "",
          image: "/api/placeholder/300/200",
          hasTime: true
        }
      ]
    },
    {
      id: "day3",
      date: "Wed 1/3",
      dayName: "Day 3",
      isExpanded: expandedDays["day3"],
      items: [
        {
          id: "dest3",
          name: "Marina Bay Sands",
          time: "11:00 AM - 2:00 PM",
          distance: "0.5 km",
          image: "/api/placeholder/300/200",
          hasTime: true
        }
      ]
    }
  ]

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayId]: !prev[dayId]
    }))
  }

  const hasIdeas = ideasItems.length > 0

  return (
    <div className={`h-full overflow-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
      <div className="border-b border-gray-200 p-6">
        <div className="mb-4">
          <h1 className="font-semibold">{tripData.title}</h1>
        </div>

        {/* Trip Details */}
        <ToggleGroup variant="outline" type="single">
          <ToggleGroupItem value="destination" className="text-xs" onClick={() => setOpen(true)}>
            {tripData.destination}
          </ToggleGroupItem>
          <ToggleGroupItem value="dates" className="text-xs" onClick={() => setOpen(true)}>
            {tripData.dates}
          </ToggleGroupItem>
          <ToggleGroupItem value="budget" className="text-xs" onClick={() => setOpen(true)}>
            {tripData.budget}
          </ToggleGroupItem>
        </ToggleGroup>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Destination</DialogTitle>
            </DialogHeader>
            <p>Show your itinerary form here</p>
          </DialogContent>
        </Dialog>

      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* Ideas Section - Only show if there are ideas */}
        {hasIdeas && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ChevronDown className="size-5" />
                <h2 className="text-lg font-semibold">Ideas</h2>
                <span className="text-sm text-gray-500">{ideasItems.length} item</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs items-center">
                All <ChevronDown className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4">
              {ideasItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h6 className="font-medium">{item.name}</h6>
                  </div>
                  <Button size="sm" className="btn-primary">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Itinerary Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">
              Itinerary <span className="text-sm font-normal text-gray-500">{tripData.dates}</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Distances</span>
              <div className="w-8 h-4 bg-gray-200 rounded-full relative">
                <div className="w-4 h-4 bg-black rounded-full absolute right-0 top-0"></div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {itineraryDays.map((day) => (
              <div key={day.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Day Header */}
                <button
                  onClick={() => toggleDay(day.id)}
                  className={`w-full flex items-center justify-between p-4 transition-colors ${day.isExpanded ? "border-b" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {day.isExpanded ? (
                      <ChevronDown className="size-5 text-muted-foreground/90" />
                    ) : (
                      <ChevronRight className="size-5 text-muted-foreground/90" />
                    )}
                    <div className="text-left">
                      <h4>{day.dayName}</h4>
                      <p className="text-sm text-muted-foreground/90">{day.date}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="size-5 text-muted-foreground/90" />
                  </Button>
                </button>

                {/* Day Content */}
                {day.isExpanded && (
                  <div className="p-4 space-y-4 bg-white">
                    {day.items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No destinations added yet</p>
                        <Button size="sm" className="btn-primary mt-2">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Destination
                        </Button>
                      </div>
                    ) : (
                      day.items.map((item) => (
                        <div key={item.id} className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h6 className="font-medium mb-1">{item.name}</h6>
                            {item.time && (
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Clock className="size-3" />
                                {item.time}
                              </div>
                            )}
                            {item.distance && (
                              <div className="text-xs text-gray-400 mt-1">
                                {item.distance}
                              </div>
                            )}
                          </div>
                          <Button variant="outline" size="sm" className="text-xs rounded-full shadow-none">Details</Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
