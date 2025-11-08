import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import type { POI } from "@/services/api";

type ItinerarySummary = {
  id: string;
  title: string;
  dates?: string;
};

interface AddToItineraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poi?: POI | null;
  onAdd?: (itineraryId: string, poi: POI) => Promise<void> | void;
}

async function fetchItinerariesFromStorageOrAPI(): Promise<ItinerarySummary[]> {
  const lastId = localStorage.getItem("fika:lastChatId");
  const summaries: ItinerarySummary[] = [];
  if (lastId) {
    try {
      const raw = localStorage.getItem(`fika:chat:${lastId}`);
      if (raw) {
        const data = JSON.parse(raw);
        summaries.push({
          id: data.chat_id || String(lastId),
          title: (data?.meta?.destination ? `${data.meta.destination} Trip` : data?.title) || "Trip",
          dates: typeof data?.meta?.dates === "object" && data?.meta?.dates?.type === "specific"
            ? `${data?.meta?.dates?.startDate || ""} - ${data?.meta?.dates?.endDate || ""}`
            : (data?.meta?.dates?.days ? `${data?.meta?.dates?.days} days` : undefined),
        });
      }
    } catch {}
  }

  try {
    const api = await import("@/services/api");
    if ((api as any).listItineraries) {
      const res = await (api as any).listItineraries();
      if (Array.isArray(res)) {
        res.forEach((it: any) => {
          summaries.push({ id: String(it.id || it.chat_id), title: it.title || it.destination || "Trip", dates: it.dates });
        });
      }
    }
  } catch {}

  // Deduplicate by id
  const map = new Map<string, ItinerarySummary>();
  for (const s of summaries) map.set(s.id, s);
  return Array.from(map.values());
}

export function AddToItineraryDialog({ open, onOpenChange, poi, onAdd }: AddToItineraryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [itins, setItins] = useState<ItinerarySummary[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(false);
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      setSuccess(false);
      try {
        const result = await fetchItinerariesFromStorageOrAPI();
        if (mounted) setItins(result);
      } catch (e) {
        if (mounted) setError("Failed to load itineraries");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [open]);

  const handleAdd = async (id: string) => {
    if (!poi || adding) return;
    setAdding(true);
    setError(null);
    setSuccess(false);
    try {
      if (onAdd) await onAdd(id, poi);
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch (e) {
      console.error("Failed to add POI:", e);
      setError("Failed to add place to itinerary. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to itinerary</DialogTitle>
        </DialogHeader>
        {!poi ? (
          <p className="text-sm text-muted-foreground">No place selected.</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading itineraries…</p>
        ) : itins.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm">No itineraries found.</p>
            <p className="text-xs text-muted-foreground">Create a trip first, then add places.</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 mb-2">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3 mb-2">
                <p className="text-sm text-green-800">✓ Added to itinerary!</p>
              </div>
            )}
            <div className="space-y-2">
              {itins.map((it) => (
                <div key={it.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{it.title}</p>
                    {it.dates && <p className="text-xs text-muted-foreground truncate">{it.dates}</p>}
                  </div>
                  <Button 
                    size="sm" 
                    className="rounded-full" 
                    onClick={() => handleAdd(it.id)}
                    disabled={adding}
                  >
                    {adding ? "Adding..." : "Add"}
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AddToItineraryDialog;
