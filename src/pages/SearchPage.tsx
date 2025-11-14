import { useState } from 'react';
import type { POI } from '@/services/api';
import POIPanel from '@/components/panels/POIPanel';
import SearchPanel from '@/components/panels/SearchPanel';
import { DualPanelLayout } from '@/components/ui/dual-panel';

export default function SearchPage() {
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [isDetailFullWidth, setIsDetailFullWidth] = useState(false);

  const handlePOISelect = (poi: POI) => {
    setSelectedPOI(poi);
    setIsDetailFullWidth(false);
  };

  const handleClosePOI = () => {
    setSelectedPOI(null);
    setIsDetailFullWidth(false);
  };

  const handleToggleFullWidth = () => setIsDetailFullWidth(!isDetailFullWidth);

  const renderDesktop = () => (
    <DualPanelLayout
      left={
        <SearchPanel
          onPOISelect={handlePOISelect}
          size={selectedPOI && !isDetailFullWidth ? 'half' : 'full'}
        />
      }
      right={
        selectedPOI ? (
          <POIPanel
            poi={selectedPOI}
            size={isDetailFullWidth ? 'full' : 'half'}
            onClose={handleClosePOI}
            onToggleFullWidth={handleToggleFullWidth}
          />
        ) : null
      }
      rightVisible={Boolean(selectedPOI)}
      fullWidth={selectedPOI ? (isDetailFullWidth ? 'right' : null) : 'left'}
      className="overflow-hidden"
    />
  );

  const renderMobile = () => (
    <div className="relative flex h-full w-full lg:hidden">
      <div
        className={
          'fixed inset-0 z-40 transition-opacity duration-300 ' +
          (selectedPOI
            ? 'pointer-events-auto bg-black/40 opacity-100'
            : 'pointer-events-none opacity-0')
        }
        aria-hidden="true"
        onClick={handleClosePOI}
      />

      <div
        className={
          'fixed inset-0 z-50 flex h-screen flex-col transition-transform duration-300 ease-in-out ' +
          (selectedPOI ? 'pointer-events-auto' : 'pointer-events-none')
        }
        style={{
          transform: selectedPOI ? 'translateY(0%)' : 'translateY(100%)',
        }}
      >
        <div className="flex h-full flex-1 flex-col overflow-hidden border-t border-gray-200 bg-white shadow-2xl">
          {selectedPOI && (
            <POIPanel poi={selectedPOI} size="full" onClose={handleClosePOI} />
          )}
        </div>
      </div>

      <div className={selectedPOI ? 'hidden' : 'h-full w-full'}>
        <SearchPanel onPOISelect={handlePOISelect} size="full" />
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full">
      {renderDesktop()}
      {renderMobile()}
    </div>
  );
}
