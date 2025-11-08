import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Luggage, MapPin } from "lucide-react";
import { getItinerary, fetchPOIById, type CreatedItinerary, type POI } from "@/services/api";
import POIPanel from "@/components/panels/POIPanel";
import ChatPanel from "@/components/panels/ChatPanel";
import ItineraryPanel from "@/components/panels/ItineraryPanel";

function MapPanel({}: { items: Array<{ id: string; name: string }> }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      {/* TODO: plot markers when coordinates are available */}
      Map view unavailable: missing coordinates.
    </div>
  );
}

export default function ChatPage() {
  const [itinerary, setItinerary] = useState<CreatedItinerary | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<'itinerary' | 'poi' | 'map'>('itinerary');
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [fullWidth, setFullWidth] = useState<boolean>(false);
  const [loadingPoi, setLoadingPoi] = useState(false);

  useEffect(() => {
    const lastId = localStorage.getItem('fika:lastChatId');
    if (!lastId) {
      setItinerary(null);
      return;
    }

    // Always validate with backend; update cache only on success
    getItinerary(lastId)
      .then((data) => {
        if (data) {
          setItinerary(data);
          try {
            localStorage.setItem(`fika:chat:${lastId}`, JSON.stringify(data));
          } catch {}
        } else {
          setItinerary(null);
          localStorage.removeItem(`fika:chat:${lastId}`);
          localStorage.removeItem('fika:lastChatId');
        }
      })
      .catch(() => {
        setItinerary(null);
        localStorage.removeItem(`fika:chat:${lastId}`);
        localStorage.removeItem('fika:lastChatId');
      });

    // Listen for itinerary updates from other components
    const handleItineraryUpdate = (event: CustomEvent) => {
      const { itineraryId, data } = event.detail;
      if (itineraryId === lastId) {
        setItinerary(data);
      }
    };

    window.addEventListener('itinerary-updated', handleItineraryUpdate as EventListener);
    return () => {
      window.removeEventListener('itinerary-updated', handleItineraryUpdate as EventListener);
    };
  }, []);

  const toggleMap = () => {
    if (!itinerary) return;
    setRightPanelMode((m) => (m === 'map' ? 'itinerary' : 'map'));
  };

  const handleOpenPOI = async (poi: { id: string; name: string }) => {
    setLoadingPoi(true);
    setRightPanelMode('poi');
    
    try {
      // First check if POI details exist in itinerary data
      const found = itinerary?.maut?.items?.find((i: any) => i.id === poi.id);
      if (found && found.description) {
        const adapted: POI = {
          id: found.id,
          name: found.name,
          rating: found.rating || 0,
          reviewCount: found.reviews || 0,
          location: found.location || "",
          category: found.category || "",
          images: found.images || [],
          description: found.description,
          address: found.address,
          website: found.website,
          phone: found.phone,
          hours: found.hours,
          coordinates: found.coordinates,
          googleMapsUrl: found.googleMapsUrl,
        } as POI;
        setSelectedPoi(adapted);
        return;
      }
      
      // Fetch full details from backend
      const details = await fetchPOIById(poi.id);
      if (details) {
        setSelectedPoi(details);
      } else {
        // Fallback with minimal data
        setSelectedPoi({ 
          id: poi.id, 
          name: poi.name, 
          rating: 0, 
          reviewCount: 0, 
          location: "", 
          category: "", 
          images: [] 
        } as POI);
      }
    } catch (error) {
      console.error('Error fetching POI details:', error);
      setSelectedPoi({ 
        id: poi.id, 
        name: poi.name, 
        rating: 0, 
        reviewCount: 0, 
        location: "", 
        category: "", 
        images: [] 
      } as POI);
    } finally {
      setLoadingPoi(false);
    }
  };

  const handleClosePOI = () => {
    setRightPanelMode('itinerary');
    setSelectedPoi(null);
  };

  const handleToggleWidth = () => {
    setFullWidth(!fullWidth);
  };

  const rightContent = useMemo(() => {
    if (!itinerary) return null;
    if (rightPanelMode === 'poi') {
      if (loadingPoi) {
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-sm text-muted-foreground">Loading POI details...</p>
            </div>
          </div>
        );
      }
      if (selectedPoi) {
        return (
          <POIPanel
            poi={selectedPoi}
            size={fullWidth ? 'full' : 'half'}
            onClose={handleClosePOI}
            onToggleFullWidth={handleToggleWidth}
            showAddToTrip={false}
          />
        );
      }
    }
    if (rightPanelMode === 'map') {
      const items = (itinerary.maut?.items || []).map((i: any) => ({ id: i.id, name: i.name }));
      return <MapPanel items={items} />;
    }
    return (
      <ItineraryPanel
        className="h-full"
        data={itinerary}
        onOpenDetails={handleOpenPOI}
        onToggleWidth={handleToggleWidth}
        fullWidth={fullWidth}
      />
    );
  }, [itinerary, rightPanelMode, selectedPoi, fullWidth, loadingPoi]);

  return (
    <>
      {/* Panel Header */}
      <div className="px-6 h-12 flex items-center justify-between border-b">
        <div className="flex items-center justify-between w-full">
          <h6 className="font-semibold">Chat</h6>
          <Button variant="outline" size="sm" onClick={toggleMap} disabled={!itinerary} title={rightPanelMode === 'map' ? 'Show itinerary' : 'Show map'}>
            {rightPanelMode === 'map' ? <Luggage /> : <MapPin/>}
            <span>{rightPanelMode === 'map' ? 'Itinerary' : 'Map'}</span>
          </Button>
        </div>
      </div>

      {/* Content with independent scrollbars */}
      <div className="flex h-[calc(100vh-48px)]">
        {/* ChatPanel */}
        <div
          className={[
            "transition-[width,opacity] duration-300 ease-in-out min-w-0 overflow-y-auto",
            !itinerary ? "flex-1" : fullWidth ? "w-0 opacity-0 pointer-events-none" : "border-r flex-1 basis-1/2",
          ].join(" ")}
        >
          <ChatPanel />
        </div>

        {/* Right panel: hidden entirely when no itinerary */}
        {itinerary && (
          <div
            className={[
              "transition-[width] duration-300 ease-in-out min-w-0 overflow-y-auto",
              fullWidth ? "flex-1" : "flex-1 basis-1/2",
            ].join(" ")}
          >
            <div className="relative h-full">
              {rightContent}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
