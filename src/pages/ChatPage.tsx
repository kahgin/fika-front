import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Luggage, MapPin } from "lucide-react";
import { getItinerary, addPOIToItinerary, fetchPOIById, type CreatedItinerary, type POI } from "@/services/api";
import POIPanel from "@/components/panels/POIPanel";
import ChatPanel from "@/components/panels/ChatPanel";
import ItineraryPanel from "@/components/panels/ItineraryPanel";

function MapPanel({ items }: { items: Array<{ id: string; name: string }> }) {
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
  const [fullWidth, setFullWidth] = useState<boolean>(() => localStorage.getItem('fika:itinerary:fullWidth') === '1');

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
  }, []);

  const toggleMap = () => {
    if (!itinerary) return; // no-op if no itinerary
    setRightPanelMode((m) => (m === 'map' ? 'itinerary' : 'map'));
  };

  const handleOpenPOI = async (poi: { id: string; name: string }) => {
    const found = itinerary?.maut?.items?.find((i: any) => i.id === poi.id);
    if (found) {
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
      setRightPanelMode('poi');
      return;
    }
    const details = await fetchPOIById(poi.id);
    if (details) {
      setSelectedPoi(details);
    } else {
      setSelectedPoi({ id: poi.id, name: poi.name, rating: 0, reviewCount: 0, location: "", category: "", images: [] } as POI);
    }
    setRightPanelMode('poi');
  };

  const handleClosePOI = () => {
    setRightPanelMode('itinerary');
    setSelectedPoi(null);
  };

  const handleToggleWidth = () => {
    const next = !fullWidth;
    setFullWidth(next);
    localStorage.setItem('fika:itinerary:fullWidth', next ? '1' : '0');
  };

  const handleAddPoiToCurrentItinerary = async (itineraryId: string, poi: POI) => {
    await addPOIToItinerary(itineraryId, { poi_id: poi.id });
    const latest = await getItinerary(itineraryId);
    if (latest) {
      setItinerary(latest);
      localStorage.setItem(`fika:chat:${itineraryId}`, JSON.stringify(latest));
    }
  };

  const rightContent = useMemo(() => {
    if (!itinerary) return null;
    if (rightPanelMode === 'poi' && selectedPoi) {
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
  }, [itinerary, rightPanelMode, selectedPoi, fullWidth]);

  return (
    <>
      {/* Panel Header */}
      <div className="py-2 px-6 flex items-center justify-between border-b">
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
        <div className={itinerary && !fullWidth ? "border-r flex-1 min-w-0 basis-1/2 overflow-y-auto" : "flex-1 min-w-0 overflow-y-auto"}>
          <ChatPanel />
        </div>

        {/* Right panel: hidden entirely when no itinerary */}
        {itinerary && (
          <div className={fullWidth ? "flex-1 min-w-0 overflow-y-auto" : "flex-1 min-w-0 basis-1/2 overflow-y-auto"}>
            <div className="relative h-full">
              {rightContent}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
