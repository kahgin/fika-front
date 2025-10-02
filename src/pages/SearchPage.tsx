
import { useState } from "react";
import { SearchPanel, type POI } from "@/components/panels/SearchPanel";
import { POIPanel } from "@/components/panels/POIPanel";
import { useEffect } from "react";

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

  return (
    <div className="h-screen w-full">
      {/* Desktop layout */}
      <div className="hidden lg:flex h-full overflow-hidden">
        <SearchPanel
          isCollapsed={!!selectedPOI && !isDetailFullWidth}
          isHidden={!!selectedPOI && isDetailFullWidth}
          onPOISelect={handlePOISelect}
        />
        {selectedPOI && (
          <POIPanel
            poi={selectedPOI}
            isFullWidth={isDetailFullWidth}
            onClose={handleClosePOI}
            onToggleFullWidth={handleToggleFullWidth}
          />
        )}
      </div>

      {/* Mobile & Tablet layout */}
      <div className="flex lg:hidden h-full w-full relative">
        <div
          className={
            "fixed inset-0 z-40 transition-opacity duration-300" +
            (selectedPOI ? " bg-black/40 opacity-100 pointer-events-auto" : " opacity-0 pointer-events-none")
          }
          aria-hidden="true"
          onClick={handleClosePOI}
        />

        <div
          className={
            "fixed inset-0 z-50 transition-transform duration-300 ease-in-out h-screen flex flex-col" +
            (selectedPOI ? " pointer-events-auto" : " pointer-events-none")
          }
          style={{
            transform: selectedPOI ? "translateY(0%)" : "translateY(100%)"
          }}
        >
          <div className="bg-white dark:bg-background shadow-2xl border-t border-gray-200 overflow-hidden flex-1 flex flex-col h-full">
            {selectedPOI && (
              <div className="flex-1 flex flex-col h-full">
                <POIPanel
                  poi={selectedPOI}
                  isFullWidth={true}
                  onClose={handleClosePOI}
                />
              </div>
            )}
          </div>
        </div>

        {!selectedPOI && (
          <div className="w-full h-full">
            <SearchPanel
              isCollapsed={false}
              isHidden={false}
              onPOISelect={handlePOISelect}
            />
          </div>
        )}
      </div>
    </div>
  );
}
