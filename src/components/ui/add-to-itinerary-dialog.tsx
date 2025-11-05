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

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const result = await fetchItinerariesFromStorageOrAPI();
        if (mounted) setItins(result);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [open]);

  const handleAdd = async (id: string) => {
    if (!poi) return;
    try {
      if (onAdd) await onAdd(id, poi);
    } finally {
      onOpenChange(false);
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
          <div className="space-y-2">
            {itins.map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{it.title}</p>
                  {it.dates && <p className="text-xs text-muted-foreground truncate">{it.dates}</p>}
                </div>
                <Button size="sm" className="rounded-full" onClick={() => handleAdd(it.id)}>Add</Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AddToItineraryDialog;
