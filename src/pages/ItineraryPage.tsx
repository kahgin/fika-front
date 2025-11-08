import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteItinerary, listItineraries, type CreatedItinerary } from "@/services/api";

export default function ItineraryPage() {
  const [chats, setChats] = useState<CreatedItinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItineraries = async () => {
      try {
        setLoading(true);
        const items = await listItineraries();
        if (items && Array.isArray(items)) {
          setChats(items);
          // Sync to localStorage for offline access
          items.forEach(item => {
            try {
              localStorage.setItem(`fika:chat:${item.chat_id}`, JSON.stringify(item));
            } catch {}
          });
        } else {
          setChats([]);
        }
      } catch (e) {
        console.error('Failed to load itineraries', e);
        setChats([]);
      } finally {
        setLoading(false);
      }
    };
    loadItineraries();
  }, []);

  const handleOpen = (chatId: string) => {
    localStorage.setItem('fika:lastChatId', chatId);
    window.location.href = '/chat';
  };

  const handleDelete = async (chatId: string) => {
    const ok = await deleteItinerary(chatId);
    if (ok) {
      localStorage.removeItem(`fika:chat:${chatId}`);
      setChats(prev => prev.filter(c => c.chat_id !== chatId));
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Itineraries</h2>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading itineraries...</div>
      ) : chats.length === 0 ? (
        <p className="text-sm text-muted-foreground">No itineraries yet. Create one from the form.</p>
      ) : (
        <div className="space-y-2">
          {chats.map(c => (
            <div key={c.chat_id} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="font-medium">{c.meta?.destination || 'Trip'}</div>
                <div className="text-sm text-muted-foreground">{c.chat_id}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleOpen(c.chat_id)}>Open</Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(c.chat_id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}