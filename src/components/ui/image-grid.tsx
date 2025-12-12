import { FallbackImage } from '@/components/ui/fallback-image'
import { AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ImageGridProps {
  images: string[]
  title: string
  maxImages?: number
}

export function ImageGrid({ images, title, maxImages = 5 }: ImageGridProps) {
  const [displayImages, setDisplayImages] = useState<string[]>([])

  useEffect(() => {
    const limited = images.slice(0, maxImages)
    setDisplayImages(limited)
  }, [images, maxImages])

  if (displayImages.length === 0) {
    return (
      <div className='flex aspect-video w-full items-center justify-center rounded-2xl bg-gray-100'>
        <div className='text-muted-foreground flex items-center gap-2'>
          <AlertCircle className='size-4' />
          <span className='text-sm'>No images available</span>
        </div>
      </div>
    )
  }

  // Single image
  if (displayImages.length === 1) {
    return (
      <div className='aspect-2/1 w-full overflow-hidden rounded-2xl'>
        <ImageItem src={displayImages[0]} alt={title} />
      </div>
    )
  }

  // Two images
  if (displayImages.length === 2) {
    return (
      <div className='w-full overflow-hidden rounded-2xl'>
        <div className='grid h-full w-full grid-cols-2 grid-rows-1 gap-2'>
          <div>
            <ImageItem src={displayImages[0]} alt={`${title} 1`} />
          </div>
          <div className='col-span-1'>
            <ImageItem src={displayImages[1]} alt={`${title} 2`} />
          </div>
        </div>
      </div>
    )
  }

  // Three images
  if (displayImages.length === 3) {
    return (
      <div className='w-full overflow-hidden rounded-2xl'>
        <div className='grid aspect-2/1 h-full w-full grid-cols-2 grid-rows-2 gap-2'>
          <div className='row-span-2'>
            <ImageItem src={displayImages[0]} alt={`${title} 1`} />
          </div>
          <div>
            <ImageItem src={displayImages[1]} alt={`${title} 2`} />
          </div>
          <div>
            <ImageItem src={displayImages[2]} alt={`${title} 3`} />
          </div>
        </div>
      </div>
    )
  }

  // Four images
  if (displayImages.length === 4) {
    return (
      <div className='w-full overflow-hidden rounded-2xl'>
        <div className='grid aspect-2/1 w-full grid-cols-2 grid-rows-2 gap-2'>
          <div>
            <ImageItem src={displayImages[0]} alt={`${title} 1`} />
          </div>
          <div>
            <ImageItem src={displayImages[1]} alt={`${title} 2`} />
          </div>
          <div>
            <ImageItem src={displayImages[2]} alt={`${title} 3`} />
          </div>
          <div>
            <ImageItem src={displayImages[3]} alt={`${title} 4`} />
          </div>
        </div>
      </div>
    )
  }

  // Five images - left large (2x2), right 4 in 2x2 grid
  return (
    <div className='w-full overflow-hidden rounded-2xl'>
      <div className='grid h-full w-full auto-rows-fr grid-cols-4 gap-2'>
        <div className='col-span-2 row-span-2'>
          <ImageItem src={displayImages[0]} alt={`${title} 1`} />
        </div>
        <div className='col-span-1 row-span-1'>
          <ImageItem src={displayImages[1]} alt={`${title} 2`} />
        </div>
        <div className='col-span-1 row-span-1'>
          <ImageItem src={displayImages[2]} alt={`${title} 3`} />
        </div>
        <div className='col-span-1 row-span-1'>
          <ImageItem src={displayImages[3]} alt={`${title} 4`} />
        </div>
        <div className='col-span-1 row-span-1'>
          <ImageItem src={displayImages[4]} alt={`${title} 5`} />
        </div>
      </div>
    </div>
  )
}

interface ImageItemProps {
  src: string
  alt: string
}

function ImageItem({ src, alt }: ImageItemProps) {
  return (
    <div className='relative h-full w-full overflow-hidden bg-gray-100'>
      <FallbackImage
        src={`${src}=s1500`}
        alt={alt}
        fallbackSeed={alt}
        className='aspect-square h-full w-full object-cover'
      />
    </div>
  )
}
