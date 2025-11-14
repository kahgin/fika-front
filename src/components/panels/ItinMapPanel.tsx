interface ItinMapPanelProps {
  items: Array<{ id: string; name: string }>;
}

export default function ItinMapPanel({ items }: ItinMapPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 flex-col items-center justify-center text-sm text-muted-foreground">
        <p>{items.length} locations found</p>
        <p>Map view unavailable :P</p>
      </div>
    </div>
  );
}

