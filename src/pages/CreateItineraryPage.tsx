import CreateItineraryForm from '@/components/forms/create-itinerary-form'

export default function CreateItineraryPage() {
  return (
    <div className='flex h-full w-full flex-col overflow-hidden'>
      <div className='flex h-12 items-center border-b px-6'>
        <h6>Create Itinerary</h6>
      </div>
      <div className='flex-1 overflow-hidden'>
        <CreateItineraryForm />
      </div>
    </div>
  )
}
