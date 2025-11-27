interface ItinMapPanelProps {
  items: Array<{ id: string; name: string }>
}

export default function ItinMapPanel({ items }: ItinMapPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center text-sm">
        <p>{items.length} locations found</p>
        <p>Map view unavailable :P</p>
      </div>
    </div>
  )
}
