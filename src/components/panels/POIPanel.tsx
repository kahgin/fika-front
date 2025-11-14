import { useState, useEffect, useRef } from 'react';
import type { POI } from '@/services/api';
import { parseOpenHours } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ImageGrid } from '@/components/ui/image-grid';
import { AddPOIToItineraryForm } from '@/components/forms/add-poi-to-itinerary-form';
import { Star, Plus, X, ArrowLeftToLine, ArrowRightToLine, ExternalLink, MapPin, Phone, Clock } from 'lucide-react';

interface POIPanelProps {
  poi: POI;
  size?: 'full' | 'half';
  onClose: () => void;
  onToggleFullWidth?: () => void;
  showAddToTrip?: boolean;
  showToggleFullWidth?: boolean;
}

export default function POIPanel({
  poi,
  size = 'half',
  onClose,
  onToggleFullWidth,
  showAddToTrip = true,
  showToggleFullWidth = true,
}: POIPanelProps) {
  const [showNameDrawer, setShowNameDrawer] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  const transformGoogleMapsUrl = (mapsUrl: string): string => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const nameMatch = mapsUrl.match(/\/place\/([^\/]+)\//);
      const placeName = nameMatch ? nameMatch[1].replace(/\+/g, ' ') : '';
      const transformedPlaceName = decodeURIComponent(placeName);
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(transformedPlaceName)}`;
    } catch {
      return '';
    }
  };

  const parsedHours = poi.hours ? parseOpenHours(poi.hours) : null;

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current || !overviewRef.current || !locationRef.current)
        return;

      const contentRect = contentRef.current.getBoundingClientRect();
      const locationRect = locationRef.current.getBoundingClientRect();
      const locationVisible = locationRect.top - contentRect.top;

      if (locationVisible <= 120) {
        setActiveSection('location');
      } else {
        setActiveSection('overview');
      }

      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      setShowNameDrawer(contentRef.current.scrollTop >= headerHeight);
    };

    const el = contentRef.current;
    el?.addEventListener('scroll', handleScroll);
    return () => el?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element =
      sectionId === 'overview' ? overviewRef.current : locationRef.current;
    if (element && contentRef.current) {
      const offset = element.offsetTop - 160;
      contentRef.current.scrollTo({ top: offset, behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b py-2 pr-6 pl-3">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
          {showToggleFullWidth && onToggleFullWidth && (
            <Button variant="ghost" size="icon" onClick={onToggleFullWidth}>
              {size === 'full' ? <ArrowRightToLine /> : <ArrowLeftToLine />}
            </Button>
          )}
        </div>
        {showAddToTrip && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full shadow-none"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus /> Add to trip
          </Button>
        )}
      </div>

      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div
          className={`sticky top-0 z-10 h-12 place-content-center border-b bg-white px-6 transition-all duration-200 ${
            showNameDrawer ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <h3 className="truncate text-sm font-medium">{poi.name}</h3>
        </div>

        <div className="space-y-6 px-6 pb-6">
          <div ref={headerRef} className="space-y-2">
            <h2 className="text-2xl font-bold">{poi.name}</h2>
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <div className="flex items-center gap-1">
                <Star className="size-3.5 fill-current" />
                <span>{poi.rating}</span>
              </div>
              <span className="text-muted-foreground/90">∙</span>
              <span className="text-muted-foreground/90">
                {poi.reviewCount > 1000
                  ? `${(poi.reviewCount / 1000).toFixed(1)}k`
                  : poi.reviewCount}{' '}
                reviews
              </span>
              <span className="text-muted-foreground/90">∙</span>
              <span className="text-muted-foreground/90">{poi.location}</span>
            </div>
            <p className="text-muted-foreground text-sm">
              {poi.category
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </p>
          </div>

          <ImageGrid images={poi.images || []} title={poi.name} maxImages={5} />
          <div className="sticky top-12 z-10 -mx-6 flex gap-6 border-b bg-white px-6">
            <button
              onClick={() => scrollToSection('overview')}
              className={`border-b-2 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === 'overview'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => scrollToSection('location')}
              className={`border-b-2 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === 'location'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Location
            </button>
          </div>

          <div className="space-y-12">
            <section ref={overviewRef}>
              {poi.description && (
                <p className="mb-6 border-b pb-6 text-sm leading-relaxed">
                  {poi.description}
                </p>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {(poi.address || poi.website || poi.phone) && (
                  <div className="space-y-6">
                    {poi.address && (
                      <div className="flex gap-2">
                        <MapPin className="mt-1 size-4 flex-shrink-0" />
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">Address</span>
                          <a
                            onClick={() =>
                              poi.address &&
                              navigator.clipboard.writeText(poi.address)
                            }
                            className="block cursor-pointer text-sm underline-offset-4 hover:underline"
                          >
                            {poi.address}
                          </a>
                        </div>
                      </div>
                    )}

                    {poi.website && (
                      <div className="flex gap-2">
                        <ExternalLink className="mt-1 size-4 flex-shrink-0" />
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">Website</span>
                          <a
                            href={poi.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm underline-offset-4 hover:underline"
                          >
                            {new URL(poi.website).hostname}
                          </a>
                        </div>
                      </div>
                    )}

                    {poi.phone && (
                      <div className="flex gap-2">
                        <Phone className="mt-1 size-4 flex-shrink-0" />
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">Phone</span>
                          <a
                            href={`tel:${poi.phone}`}
                            className="block text-sm underline-offset-4 hover:underline"
                          >
                            {poi.phone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {parsedHours && (
                  <div className="flex gap-2">
                    <Clock className="mt-1 size-4 flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Hours of operation</span>
                      <div className="space-y-1.5">
                        <p
                          className={`mb-2 text-sm font-semibold ${
                            parsedHours.status === 'open'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {parsedHours.currentStatus}
                        </p>

                        <div className="space-y-1 text-sm">
                          {parsedHours.openHours.map((dayHour) => (
                            <div
                              key={dayHour.day}
                              className="flex justify-between gap-4"
                            >
                              <span>{dayHour.day.slice(0, 3)}</span>
                              <span className="text-right">{dayHour.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section ref={locationRef}>
              <h3 className="mb-4 text-lg font-semibold">Location</h3>

              <div className="relative overflow-hidden rounded-lg border border-gray-200">
                <iframe
                  width="100%"
                  height="360"
                  src={transformGoogleMapsUrl(poi.googleMapsUrl as string)}
                  loading="lazy"
                  title={`Map of ${poi.name}`}
                />

                {poi.googleMapsUrl && (
                  <Button
                    variant="ghost"
                    className="absolute top-4 right-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/90 text-sm shadow-md hover:bg-white"
                    onClick={() =>
                      window.open(
                        poi.googleMapsUrl,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                  >
                    Get directions
                    <ExternalLink className="size-4" />
                  </Button>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
      <AddPOIToItineraryForm
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        poi={poi}
      />
    </div>
  );
}
