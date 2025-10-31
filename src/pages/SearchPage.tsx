import { useState, useEffect } from "react";
import { SearchPanel } from "@/components/panels/SearchPanel";
import { POIPanel } from "@/components/panels/POIPanel";
import type { POI } from "@/services/api";

export default function SearchPage() {
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [isDetailFullWidth, setIsDetailFullWidth] = useState(false);
  const [_, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handlePOISelect = (poi: POI) => {
    setSelectedPOI(poi);
    setIsDetailFullWidth(false);
  };

  const handleClosePOI = () => {
    setSelectedPOI(null);
    setIsDetailFullWidth(false);
  };

  const handleToggleFullWidth = () => {
    setIsDetailFullWidth(!isDetailFullWidth);
  };

  // Desktop layout (now controls widths directly)
  const renderDesktop = () => (
    <div className="hidden lg:flex h-full overflow-hidden">
      {/* Left column: SearchPanel */}
      <div
        className={[
          "transition-[width,opacity] duration-300 ease-in-out min-w-0",
          !selectedPOI ? "w-full" : isDetailFullWidth ? "w-0 opacity-0 pointer-events-none" : "w-1/2",
        ].join(" ")}
      >
        <SearchPanel
          onPOISelect={handlePOISelect}
          size={selectedPOI && !isDetailFullWidth ? "half" : "full"}
        />
      </div>

      {/* Right column: POIPanel */}
      {selectedPOI && (
        <div
          className={[
            "transition-[width] duration-300 ease-in-out min-w-0",
            isDetailFullWidth ? "w-full" : "w-1/2",
          ].join(" ")}
        >
          <POIPanel
            poi={selectedPOI}
            size={isDetailFullWidth ? "full" : "half"}
            onClose={handleClosePOI}
            onToggleFullWidth={handleToggleFullWidth}
          />
        </div>
      )}
    </div>
  );

  // Mobile & Tablet layout (unchanged behavior)
  const renderMobile = () => (
    <div className="flex lg:hidden h-full w-full relative">
      {/* Backdrop overlay */}
      <div
        className={
          "fixed inset-0 z-40 transition-opacity duration-300 " +
          (selectedPOI ? "bg-black/40 opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
        }
        aria-hidden="true"
        onClick={handleClosePOI}
      />

      {/* POI Detail Modal */}
      <div
        className={
          "fixed inset-0 z-50 transition-transform duration-300 ease-in-out h-screen flex flex-col " +
          (selectedPOI ? "pointer-events-auto" : "pointer-events-none")
        }
        style={{
          transform: selectedPOI ? "translateY(0%)" : "translateY(100%)",
        }}
      >
        <div className="bg-white shadow-2xl border-t border-gray-200 overflow-hidden flex-1 flex flex-col h-full">
          {selectedPOI && (
            <POIPanel
              poi={selectedPOI}
              size="full"
              onClose={handleClosePOI}
            />
          )}
        </div>
      </div>

      {/* Search Panel */}
      {!selectedPOI && (
        <SearchPanel
          onPOISelect={handlePOISelect}
          size="full"
        />
      )}
    </div>
  );

  return (
    <div className="h-screen w-full">
      {renderDesktop()}
      {renderMobile()}
    </div>
  );
}
