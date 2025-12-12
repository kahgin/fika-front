import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface EmptyItineraryProps {
  className?: string
}

export function EmptyItinerary({ className }: EmptyItineraryProps) {
  const navigate = useNavigate()

  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <MapPin className='size-5' />
        </EmptyMedia>
        <EmptyTitle>No Itinerary Yet</EmptyTitle>
        <EmptyDescription>
          Create your first itinerary to start planning your trip. Add destinations, hotels, and places to visit.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => navigate('/create')}>Create Itinerary</Button>
      </EmptyContent>
    </Empty>
  )
}
