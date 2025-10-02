import { useState } from "react";
import { Search, Star, CirclePlus } from "lucide-react";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface POI {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  location: string;
  image: string;
  description?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  website?: string;
  googleMapsUrl?: string;
  address?: string;
  phone?: string;
  hours?: string;
  isOpenNow?: boolean;
}

interface SearchPanelProps {
  isCollapsed: boolean;
  isHidden?: boolean;
  onPOISelect: (poi: POI) => void;
}

const mockPOIs: POI[] = [
  {
    id: "1",
    name: "Eiffel Tower",
    category: "Attraction",
    rating: 4.5,
    reviewCount: 125000,
    location: "Paris, France",
    image: "https://picsum.photos/seed/eiffel/1200/800",
    description: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolorem maiores nulla, veniam rerum saepe, hic omnis cumque libero corrupti soluta mollitia. Numquam fugiat quasi reprehenderit voluptatibus maiores dolores veniam fugit! Doloremque, omnis, quidem laboriosam ipsam, tempore nulla culpa quas sapiente ullam a ratione labore hic nam laborum nemo! Temporibus accusamus fugiat numquam cumque unde aut, illum odit dolorem exercitationem est. Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolorem maiores nulla, veniam rerum saepe, hic omnis cumque libero corrupti soluta mollitia. Numquam fugiat quasi reprehenderit voluptatibus maiores dolores veniam fugit! Doloremque, omnis, quidem laboriosam ipsam, tempore nulla culpa quas sapiente ullam a ratione labore hic nam laborum nemo! Temporibus accusamus fugiat numquam cumque unde aut, illum odit dolorem exercitationem est.`,
    coordinates: { lat: 48.8584, lng: 2.2945 },
    website: "https://www.toureiffel.paris/en",
    googleMapsUrl:
      "https://www.google.com/maps/place/Eiffel+Tower,+Champ+de+Mars,+Paris",
  },
  {
    id: "2",
    name: "Louvre Museum",
    category: "Museum",
    rating: 4.7,
    reviewCount: 98000,
    location: "Paris, France",
    image: "https://picsum.photos/seed/louvre/1200/800",
    description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolorem maiores nulla, veniam rerum saepe, hic omnis cumque libero corrupti soluta mollitia. Numquam fugiat quasi reprehenderit voluptatibus maiores dolores veniam fugit! Doloremque, omnis, quidem laboriosam ipsam, tempore nulla culpa quas sapiente ullam a ratione labore hic nam laborum nemo! Temporibus accusamus fugiat numquam cumque unde aut, illum odit dolorem exercitationem est.",
    coordinates: { lat: 48.8606, lng: 2.3376 },
    website: "https://www.louvre.fr/en",
    googleMapsUrl:
      "https://www.google.com/maps/place/Louvre+Museum,+Paris",
  },
  {
    id: "3",
    name: "Le Jules Verne",
    category: "Restaurant",
    rating: 4.3,
    reviewCount: 2500,
    location: "Paris, France",
    image: "https://picsum.photos/seed/julesverne/1200/800",
    description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolorem maiores nulla, veniam rerum saepe, hic omnis cumque libero corrupti soluta mollitia. Numquam fugiat quasi reprehenderit voluptatibus maiores dolores veniam fugit! Doloremque, omnis, quidem laboriosam ipsam, tempore nulla culpa quas sapiente ullam a ratione labore hic nam laborum nemo! Temporibus accusamus fugiat numquam cumque unde aut, illum odit dolorem exercitationem est.",
    coordinates: { lat: 48.8584, lng: 2.2945 },
    website: "https://www.lejulesverne-paris.com/en",
    googleMapsUrl:
      "https://www.google.com/maps/place/Le+Jules+Verne,+Eiffel+Tower,+Paris",
  },
  {
    id: "4",
    name: "Colosseum",
    category: "Attraction",
    rating: 4.8,
    reviewCount: 90000,
    location: "Rome, Italy",
    image: "https://picsum.photos/seed/colosseum/1200/800",
    description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolorem maiores nulla, veniam rerum saepe, hic omnis cumque libero corrupti soluta mollitia. Numquam fugiat quasi reprehenderit voluptatibus maiores dolores veniam fugit! Doloremque, omnis, quidem laboriosam ipsam, tempore nulla culpa quas sapiente ullam a ratione labore hic nam laborum nemo! Temporibus accusamus fugiat numquam cumque unde aut, illum odit dolorem exercitationem est.",
    coordinates: { lat: 41.8902, lng: 12.4922 },
    website: "https://parcocolosseo.it/en/",
    googleMapsUrl:
      "https://www.google.com/maps/place/Colosseum,+Rome",
  },
  {
    id: "5",
    name: "Shinjuku Gyoen",
    category: "Park",
    rating: 4.6,
    reviewCount: 32000,
    location: "Tokyo, Japan",
    image: "https://picsum.photos/seed/shinjuku/1200/800",
    coordinates: { lat: 35.6852, lng: 139.7100 },
    website: "https://fng.or.jp/shinjuku/en/",
    googleMapsUrl:
      "https://www.google.com/maps/place/Shinjuku+Gyoen,+Tokyo",
  },
  {
    id: "6",
    name: "Sydney Opera House",
    category: "Attraction",
    rating: 4.7,
    reviewCount: 75000,
    location: "Sydney, Australia",
    image: "https://picsum.photos/seed/opera/1200/800",
    coordinates: { lat: -33.8568, lng: 151.2153 },
    website: "https://www.sydneyoperahouse.com/",
    googleMapsUrl:
      "https://www.google.com/maps/place/Sydney+Opera+House",
  },
  {
    id: "6",
    name: "Sydney Opera House",
    category: "Attraction",
    rating: 4.7,
    reviewCount: 75000,
    location: "Sydney, Australia",
    image: "https://picsum.photos/seed/opera/1200/800",
    coordinates: { lat: -33.8568, lng: 151.2153 },
    website: "https://www.sydneyoperahouse.com/",
    googleMapsUrl:
      "https://www.google.com/maps/place/Sydney+Opera+House",
  },
];

export function SearchPanel({ isCollapsed, isHidden = false, onPOISelect }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'hotels' | 'restaurants' | 'attractions'>('attractions');

  return (
    <Panel fullWidth={!isCollapsed && !isHidden} halfWidth={isCollapsed && !isHidden} collapsed={isHidden}>
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="p-6 shrink-0">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for places, restaurants, hotels..."
                className="pl-10 rounded-full"
              />
            </div>
            <Button variant="outline" className="rounded-full">Search</Button>
          </div>
          
          {/* Category Tabs */}
          <div className="flex gap-2">
            {(['attractions', 'restaurants', 'hotels'] as const).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "outline" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className="capitalize rounded-full"
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>

        {/* POI Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
            {mockPOIs.map((poi, index) => (
              <div
                key={`${poi.id}-${index}`}
                className="overflow-hidden cursor-pointer"
                onClick={() => onPOISelect(poi)}
              >
                <div className="relative">
                  <img
                    src={poi.image}
                    alt={poi.name}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className="absolute top-4 right-4">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle add to itinerary
                      }}
                      style={{ all: 'unset', cursor: 'pointer' }}
                    >
                      <CirclePlus className="size-6" color="white" fill="rgba(0,0,0,0.3)"/>
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{poi.name}</span>
                    <div className="flex items-center gap-1">
                      <Star className="size-3 fill-current" />
                      <span className="text-sm">{poi.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground/90">{poi.category}</p>
                  <p className="text-sm text-muted-foreground/90">{poi.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
