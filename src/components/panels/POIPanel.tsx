import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImageGrid } from "@/components/ui/image-grid";
import { parseOpenHours } from "@/lib/utils.ts";
import type { POI } from "@/services/api";
import { Star, Plus, X, ArrowLeftToLine, ArrowRightToLine, ExternalLink, MapPin, Phone, Clock } from "lucide-react";

interface POIPanelProps {
  poi: POI;
  size?: "full" | "half";
  onClose: () => void;
  onToggleFullWidth?: () => void;
}

export function POIPanel({
  poi,
  size = "half",
  onClose,
  onToggleFullWidth,
}: POIPanelProps) {
  const [showNameDrawer, setShowNameDrawer] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  const generateGoogleMapsEmbedUrl = (poi: POI) => {
    if (poi.coordinates) {
      return `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${poi.coordinates.lat},${poi.coordinates.lng}&zoom=15`;
    }
    const query = encodeURIComponent(`${poi.name} ${poi.location}`);
    return `https://www.google.com/maps/embed/v1/search?key=YOUR_API_KEY&q=${query}`;
  };

  const getAvailableImages = (): string[] => {
    if (poi.images) {
      return poi.images;
    }
    return [];
  };

  const parsedHours = poi.hours ? parseOpenHours(poi.hours) : null;

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current || !overviewRef.current || !locationRef.current) return;

      const contentRect = contentRef.current.getBoundingClientRect();
      const locationRect = locationRef.current.getBoundingClientRect();
      const locationVisible = locationRect.top - contentRect.top;

      if (locationVisible <= 120) {
        setActiveSection("location");
      } else {
        setActiveSection("overview");
      }

      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      setShowNameDrawer(contentRef.current.scrollTop >= headerHeight);
    };

    const el = contentRef.current;
    el?.addEventListener("scroll", handleScroll);
    return () => el?.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = sectionId === "overview" ? overviewRef.current : locationRef.current;
    if (element && contentRef.current) {
      const offset = element.offsetTop - 160;
      contentRef.current.scrollTo({ top: offset, behavior: "smooth" });
      setActiveSection(sectionId);
    }
  };

  const availableImages = getAvailableImages();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 pl-3 pr-6 py-2 flex justify-between items-center border-b">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
          {onToggleFullWidth && (
            <Button variant="ghost" size="icon" onClick={onToggleFullWidth}>
              {size === "full" ? <ArrowRightToLine /> : <ArrowLeftToLine />}
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" className="shadow-none rounded-full">
          <Plus /> Add to trip
        </Button>
      </div>

      {/* Scrollable Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        {/* Name Drawer */}
        <div
          className={`sticky top-0 z-10 px-6 h-12 place-content-center bg-white border-b transition-all duration-200 ${
            showNameDrawer ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <h3 className="font-medium truncate text-sm">{poi.name}</h3>
        </div>

        {/* Main Content */}
        <div className="px-6 pb-6 space-y-6">
          {/* POI Header */}
          <div ref={headerRef} className="space-y-2">
            <h2 className="text-2xl font-bold">{poi.name}</h2>
            <div className="flex items-center gap-1 text-sm flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="size-3.5 fill-current" />
                <span>{poi.rating}</span>
              </div>
              <span className="text-muted-foreground/90">∙</span>
              <span className="text-muted-foreground/90">
                {poi.reviewCount > 1000
                  ? `${(poi.reviewCount / 1000).toFixed(1)}k`
                  : poi.reviewCount}{" "}
                reviews
              </span>
              <span className="text-muted-foreground/90">∙</span>
              <span className="text-muted-foreground/90">{poi.location}</span>
            </div>
            <p className="text-sm text-muted-foreground">{poi.category}</p>
          </div>

          {/* Hero Image Grid */}
          <ImageGrid images={availableImages} title={poi.name} maxImages={5} />

          {/* Navigation Tabs */}
          <div className="border-b flex gap-6 -mx-6 px-6 sticky top-12 bg-white z-10">
            <button
              onClick={() => scrollToSection("overview")}
              className={`py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeSection === "overview"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => scrollToSection("location")}
              className={`py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeSection === "location"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Location
            </button>
          </div>

          {/* Sections */}
          <div className="space-y-12">
            <section ref={overviewRef}>
              {poi.description && (
                <p className="text-sm leading-relaxed pb-6 border-b mb-6">
                  {poi.description}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(poi.address || poi.website || poi.phone) && (
                  <div className="space-y-6">
                    {poi.address && (
                      <div className="flex gap-2">
                        <MapPin className="size-4 flex-shrink-0 mt-1" />
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">Address</span>
                          <a 
                            onClick={() => poi.address && navigator.clipboard.writeText(poi.address)}
                            className="block text-sm cursor-pointer hover:underline"
                          >
                            {poi.address}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {poi.website && (
                      <div className="flex gap-2">
                        <ExternalLink className="size-4 flex-shrink-0 mt-1" />
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">Website</span>
                          <a
                            href={poi.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm hover:underline"
                          >
                            {new URL(poi.website).hostname}
                          </a>
                        </div>
                      </div>
                    )}

                    {poi.phone && (
                      <div className="flex gap-2">
                        <Phone className="size-4 flex-shrink-0 mt-1" />
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">Phone</span>
                          <a href={`tel:${poi.phone}`} className="block text-sm hover:underline">
                            {poi.phone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Hours Section */}
                {parsedHours && (
                  <div className="flex gap-2">
                    <Clock className="size-4 flex-shrink-0 mt-1" />
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Hours of operation</span>
                      <div className="space-y-1.5">
                        <p
                          className={`text-sm font-semibold mb-2 ${
                            parsedHours.status === "open"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {parsedHours.currentStatus}
                        </p>

                        <div className="space-y-1 text-sm">
                          {parsedHours.openHours.map((dayHour) => (
                            <div key={dayHour.day} className="flex justify-between gap-4">
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
              <h3 className="text-lg font-semibold mb-4">Location</h3>

              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <iframe
                  width="100%"
                  height="240"
                  style={{ border: 0 }}
                  src={generateGoogleMapsEmbedUrl(poi)}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${poi.name}`}
                />

                {poi.googleMapsUrl && (
                  <Button
                    variant="ghost"
                    className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-sm rounded-full bg-white/90 hover:bg-white"
                    onClick={() =>
                      window.open(poi.googleMapsUrl, "_blank", "noopener,noreferrer")
                    }
                  >
                    Get directions
                    <ExternalLink className="size-3.5" />
                  </Button>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
