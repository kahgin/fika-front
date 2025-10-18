import { useState, useEffect, useRef } from "react";
import {
  Star,
  Plus,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  MapPin,
  Phone,
  Clock,
} from "lucide-react";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { ImageGrid } from "@/components/ui/image-grid";
import type { POI } from "@/services/api";

interface POIPanelProps {
  poi: POI;
  isFullWidth?: boolean;
  onClose: () => void;
  onToggleFullWidth?: () => void;
}

export function POIPanel({
  poi,
  isFullWidth = false,
  onClose,
  onToggleFullWidth,
}: POIPanelProps) {
  const [showNameDrawer, setShowNameDrawer] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const generateGoogleMapsEmbedUrl = (poi: POI) => {
    if (poi.coordinates) {
      return `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${poi.coordinates.lat},${poi.coordinates.lng}&zoom=15`;
    }
    const query = encodeURIComponent(`${poi.name} ${poi.location}`);
    return `https://www.google.com/maps/embed/v1/search?key=YOUR_API_KEY&q=${query}`;
  };

  // Collect all available images from the POI
  const getAvailableImages = (): string[] => {
    const images: string[] = [];

    // Add main image if available
    if (poi.image) {
      images.push(poi.image);
    }

    return images;
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current || !headerRef.current) return;
      const y = contentRef.current.scrollTop;

      setShowNameDrawer(y >= headerRef.current.offsetHeight);

      const sections = ["overview", "location"];
      const tabsHeight = tabsRef.current?.offsetHeight || 0;
      const stickyOffset = (showNameDrawer ? 48 : 0) + tabsHeight + 8;

      const current = sections.reduce<{ id: string; dist: number } | null>(
        (acc, id) => {
          const el = document.getElementById(id);
          if (!el) return acc;
          const dist = Math.abs(el.offsetTop - (y + stickyOffset));
          if (!acc || dist < acc.dist) return { id, dist };
          return acc;
        },
        null
      );

      if (current && current.id !== activeSection) {
        setActiveSection(current.id);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener("scroll", handleScroll);
      handleScroll();
      return () => contentElement.removeEventListener("scroll", handleScroll);
    }
  }, [activeSection, showNameDrawer]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element && contentRef.current) {
      const container = contentRef.current;
      const tabsHeight = tabsRef.current?.offsetHeight || 0;
      const stickyOffset = (showNameDrawer ? 48 : 0) + tabsHeight + 8;
      const targetScroll = Math.max(0, element.offsetTop - stickyOffset);
      container.scrollTo({ top: targetScroll, behavior: "smooth" });
      setActiveSection(sectionId);
    }
  };

  const availableImages = getAvailableImages();

  return (
    <Panel halfWidth={!isFullWidth} fullWidth={isFullWidth}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 pl-3 pr-6 py-2 flex justify-between items-center">
          <div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X />
            </Button>
            {onToggleFullWidth && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleFullWidth}
              >
                {isFullWidth ? <Minimize2 /> : <Maximize2 />}
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" className="shadow-none rounded-full">
            <Plus /> Add to trip
          </Button>
        </div>

        {/* Scrollable Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto relative">
          {/* Name Drawer */}
          <div
            className={`flex items-center px-6 sticky top-0 z-10 bg-white border-b transition-all duration-300 ease-in-out
              ${showNameDrawer ? "h-12 opacity-100" : "h-0 opacity-0"}
            `}
          >
            <h3 className="font-medium truncate text-sm">{poi.name}</h3>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {/* POI Header */}
            <div ref={headerRef} className="mb-6 space-y-1">
              <h2>{poi.name}</h2>
              <div className="flex items-center gap-3 text-sm">
                {/* separate them with a dot */}
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1">
                    <Star className="size-3.5 fill-current" />
                    <span>{poi.rating}</span>
                  </div>
                  <span className="text-muted-foreground/90">•</span>
                  <span className="items-center text-muted-foreground/90">
                    {poi.reviewCount > 1000
                      ? `${(poi.reviewCount / 1000).toFixed(1)}k`
                      : poi.reviewCount}
                  </span>
                  <span className="text-muted-foreground/90">•</span>
                  <span className="items-center text-muted-foreground/90">{poi.location}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground/90">{poi.category}</p>
            </div>

            {/* Hero Image Grid */}
            <div className="mb-6">
              <ImageGrid
                images={availableImages}
                title={poi.name}
                maxImages={5}
              />
            </div>

            {/* Navigation Tabs */}
            <div
              ref={tabsRef}
              className="sticky top-12 z-10 bg-white backdrop-blur-sm px-1 mb-6 border-b"
            >
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => scrollToSection("overview")}
                  className={`pb-2 border-b-2 text-sm font-medium transition-colors ${
                    activeSection === "overview"
                      ? "border-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => scrollToSection("location")}
                  className={`pb-2 border-b-2 text-sm font-medium transition-colors ${
                    activeSection === "location"
                      ? "border-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Location
                </button>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              <section id="overview" className="scroll-mt-24">
                {poi.description && (
                  <p className="text-gray-600 text-sm leading-relaxed mb-5">{poi.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {poi.address && (
                    <div>
                      <span className="font-medium mb-2 flex items-center gap-2">
                        <MapPin className="size-4" />
                        Address
                      </span>
                      <p className="text-gray-600 text-sm">{poi.address}</p>
                    </div>
                  )}

                  {(poi.website || poi.phone) && (
                    <div>
                      {poi.website && (
                        <>
                          <span className="font-medium mb-2 flex items-center gap-2">
                            <ExternalLink className="size-4" />
                            Website
                          </span>
                          <a
                            href={poi.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm"
                          >
                            {new URL(poi.website).hostname}
                          </a>
                        </>
                      )}

                      {poi.phone && (
                        <>
                          <span className="font-medium mt-4 mb-2 flex items-center gap-2">
                            <Phone className="size-4" />
                            Phone
                          </span>
                          <a href={`tel:${poi.phone}`} className="block text-sm">
                            {poi.phone}
                          </a>
                        </>
                      )}
                    </div>
                  )}

                  {poi.hours && (
                    <div>
                      <span className="font-medium mb-2 flex items-center gap-2">
                        <Clock className="size-4" />
                        Hours of operation
                      </span>
                      {poi.isOpenNow !== undefined && (
                        <p
                          className={`text-sm font-medium ${
                            poi.isOpenNow ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {poi.isOpenNow ? "Open now" : "Closed now"}
                        </p>
                      )}
                      <p className="text-gray-600 text-sm">{poi.hours}</p>
                    </div>
                  )}
                </div>
              </section>

              <section id="location" className="scroll-mt-24">
                <h3 className="text-lg font-medium mb-3">Location</h3>

                <div className="relative rounded-lg overflow-hidden border border-gray-200 mb-4">
                  {/* Map iframe */}
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

                  {/* Overlayed button */}
                  {poi.googleMapsUrl && (
                    <Button
                      variant="ghost"
                      className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-sm rounded-full bg-white/90"
                      onClick={() => window.open(poi.googleMapsUrl, "_blank", "noopener,noreferrer")}
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
    </Panel>
  );
}