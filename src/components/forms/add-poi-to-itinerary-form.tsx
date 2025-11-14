import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, XCircle } from 'lucide-react';
import type { POI } from '@/services/api';

interface AddPOIToItineraryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poi: POI | null;
  onSuccess?: () => void;
}

type ItinerarySummary = {
  id: string;
  title: string;
  dates?: string;
};

async function fetchItinerariesFromStorageOrAPI(): Promise<ItinerarySummary[]> {
  const summaries: ItinerarySummary[] = [];

  const lastId = localStorage.getItem('fika:lastChatId');
  if (lastId) {
    try {
      const raw = localStorage.getItem(`fika:chat:${lastId}`);
      if (raw) {
        const data = JSON.parse(raw);
        summaries.push({
          id: data.itin_id || String(lastId),
          title:
            (data?.meta?.destination
              ? `${data.meta.destination} Trip`
              : data?.title) || 'Trip',
          dates:
            typeof data?.meta?.dates === 'object' &&
            data?.meta?.dates?.type === 'specific'
              ? `${data?.meta?.dates?.startDate || ''} - ${data?.meta?.dates?.endDate || ''}`
              : data?.meta?.dates?.days
                ? `${data?.meta?.dates?.days} days`
                : undefined,
        });
      }
    } catch {}
  }

  try {
    const { listItineraries } = await import('@/services/api');
    const res = await listItineraries();
    if (Array.isArray(res)) {
      res.forEach((it: any) => {
        summaries.push({
          id: String(it.id || it.itin_id),
          title: it.meta?.destination
            ? `${it.meta.destination} Trip`
            : it.title || 'Trip',
          dates:
            typeof it?.meta?.dates === 'object' &&
            it?.meta?.dates?.type === 'specific'
              ? `${it?.meta?.dates?.startDate || ''} - ${it?.meta?.dates?.endDate || ''}`
              : it?.meta?.dates?.days
                ? `${it?.meta?.dates?.days} days`
                : undefined,
        });
      });
    }
  } catch {}

  const map = new Map<string, ItinerarySummary>();
  for (const s of summaries) map.set(s.id, s);
  return Array.from(map.values());
}

export function AddPOIToItineraryForm({
  open,
  onOpenChange,
  poi,
  onSuccess,
}: AddPOIToItineraryFormProps) {
  const [itineraries, setItineraries] = useState<ItinerarySummary[]>([]);
  const [loadingItineraries, setLoadingItineraries] = useState(false);
  const [adding, setAdding] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchItineraries = async () => {
    setLoadingItineraries(true);
    const result = await fetchItinerariesFromStorageOrAPI();
    setItineraries(result);
    setLoadingItineraries(false);
  };

  const handleAddToItinerary = async (itineraryId: string) => {
    if (!poi || adding) return;
    setAdding(true);
    try {
      const { addPOIToItinerary, getItinerary } = await import(
        '@/services/api'
      );
      await addPOIToItinerary(itineraryId, { poi_id: poi.id });

      const lastId = localStorage.getItem('fika:lastChatId');
      if (lastId === itineraryId) {
        const latest = await getItinerary(itineraryId);
        if (latest) {
          localStorage.setItem(
            `fika:chat:${itineraryId}`,
            JSON.stringify(latest)
          );
          window.dispatchEvent(
            new CustomEvent('itinerary-updated', {
              detail: { itineraryId, data: latest },
            })
          );
        }
      }

      onOpenChange(false);
      setSuccessDialogOpen(true);
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error('Failed to add POI:', e);
      setErrorMessage('Failed to add place to itinerary. Please try again.');
      onOpenChange(false);
      setErrorDialogOpen(true);
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchItineraries();
    }
  }, [open]);

  return (
    <>
      {/* Add to Itinerary Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to itinerary</DialogTitle>
          </DialogHeader>
          {!poi ? (
            <p className="text-muted-foreground text-sm">No place selected.</p>
          ) : loadingItineraries ? (
            <p className="text-muted-foreground text-sm">
              Loading itineraries…
            </p>
          ) : itineraries.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm">No itineraries found.</p>
              <p className="text-muted-foreground text-xs">
                Create a trip first, then add places.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {itineraries.map((it) => (
                <Button
                  key={it.id}
                  variant="ghost"
                  className="h-auto w-full justify-start px-4 py-3"
                  onClick={() => handleAddToItinerary(it.id)}
                  disabled={adding}
                >
                  <div className="w-full text-left">
                    <p className="font-medium">{it.title}</p>
                    {it.dates && (
                      <p className="text-muted-foreground text-xs">
                        {it.dates}
                      </p>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="justify-center sm:max-w-md">
          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            <div className="rounded-full bg-gray-200 p-3">
              <Check className="size-8" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold">Added successfully!</h3>
              <p className="text-muted-foreground text-sm">
                {poi?.name} has been added to your itinerary.
              </p>
            </div>
            <Button
              onClick={() => setSuccessDialogOpen(false)}
              className="w-full cursor-pointer"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="rounded-full bg-red-100 p-3">
              <XCircle className="size-8 text-red-600" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold">Failed to add</h3>
              <p className="text-muted-foreground text-sm">{errorMessage}</p>
            </div>
            <Button
              onClick={() => setErrorDialogOpen(false)}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
