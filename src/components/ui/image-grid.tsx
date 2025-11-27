import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

interface ImageGridProps {
  images: string[]
  title: string
  maxImages?: number
}

export function ImageGrid({ images, title, maxImages = 5 }: ImageGridProps) {
  const [displayImages, setDisplayImages] = useState<string[]>([])
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [errorStates, setErrorStates] = useState<Set<string>>(new Set())

  useEffect(() => {
    const limited = images.slice(0, maxImages)
    setDisplayImages(limited)
    setLoadedImages(new Set())
    setErrorStates(new Set())
  }, [images, maxImages])

  const handleImageLoad = (url: string) => {
    setLoadedImages((prev) => new Set([...prev, url]))
  }

  const handleImageError = (url: string) => {
    setErrorStates((prev) => new Set([...prev, url]))
  }

  if (displayImages.length === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-gray-100">
        <div className="flex items-center gap-2 text-gray-500">
          <AlertCircle className="size-4" />
          <span className="text-sm">No images available</span>
        </div>
      </div>
    )
  }

  // Single image
  if (displayImages.length === 1) {
    return (
      <div className="aspect-2/1 w-full overflow-hidden rounded-2xl">
        <ImageItem
          src={displayImages[0]}
          alt={title}
          isLoaded={loadedImages.has(displayImages[0])}
          isError={errorStates.has(displayImages[0])}
          onLoad={() => handleImageLoad(displayImages[0])}
          onError={() => handleImageError(displayImages[0])}
        />
      </div>
    )
  }

  // Two images
  if (displayImages.length === 2) {
    return (
      <div className="w-full overflow-hidden rounded-2xl">
        <div className="grid h-full w-full grid-cols-2 grid-rows-1 gap-2">
          <div>
            <ImageItem
              src={displayImages[0]}
              alt={`${title} 1`}
              isLoaded={loadedImages.has(displayImages[0])}
              isError={errorStates.has(displayImages[0])}
              onLoad={() => handleImageLoad(displayImages[0])}
              onError={() => handleImageError(displayImages[0])}
            />
          </div>
          <div className="col-span-1">
            <ImageItem
              src={displayImages[1]}
              alt={`${title} 2`}
              isLoaded={loadedImages.has(displayImages[1])}
              isError={errorStates.has(displayImages[1])}
              onLoad={() => handleImageLoad(displayImages[1])}
              onError={() => handleImageError(displayImages[1])}
            />
          </div>
        </div>
      </div>
    )
  }

  // Three images
  if (displayImages.length === 3) {
    return (
      <div className="w-full overflow-hidden rounded-2xl">
        <div className="grid aspect-2/1 h-full w-full grid-cols-2 grid-rows-2 gap-2">
          <div className="row-span-2">
            <ImageItem
              src={displayImages[0]}
              alt={`${title} 1`}
              isLoaded={loadedImages.has(displayImages[0])}
              isError={errorStates.has(displayImages[0])}
              onLoad={() => handleImageLoad(displayImages[0])}
              onError={() => handleImageError(displayImages[0])}
            />
          </div>
          <div>
            <ImageItem
              src={displayImages[1]}
              alt={`${title} 2`}
              isLoaded={loadedImages.has(displayImages[1])}
              isError={errorStates.has(displayImages[1])}
              onLoad={() => handleImageLoad(displayImages[1])}
              onError={() => handleImageError(displayImages[1])}
            />
          </div>
          <div>
            <ImageItem
              src={displayImages[2]}
              alt={`${title} 3`}
              isLoaded={loadedImages.has(displayImages[2])}
              isError={errorStates.has(displayImages[2])}
              onLoad={() => handleImageLoad(displayImages[2])}
              onError={() => handleImageError(displayImages[2])}
            />
          </div>
        </div>
      </div>
    )
  }

  // Four images
  if (displayImages.length === 4) {
    return (
      <div className="w-full overflow-hidden rounded-2xl">
        <div className="grid aspect-2/1 w-full grid-cols-2 grid-rows-2 gap-2">
          <div>
            <ImageItem
              src={displayImages[0]}
              alt={`${title} 1`}
              isLoaded={loadedImages.has(displayImages[0])}
              isError={errorStates.has(displayImages[0])}
              onLoad={() => handleImageLoad(displayImages[0])}
              onError={() => handleImageError(displayImages[0])}
            />
          </div>
          <div>
            <ImageItem
              src={displayImages[1]}
              alt={`${title} 2`}
              isLoaded={loadedImages.has(displayImages[1])}
              isError={errorStates.has(displayImages[1])}
              onLoad={() => handleImageLoad(displayImages[1])}
              onError={() => handleImageError(displayImages[1])}
            />
          </div>
          <div>
            <ImageItem
              src={displayImages[2]}
              alt={`${title} 3`}
              isLoaded={loadedImages.has(displayImages[2])}
              isError={errorStates.has(displayImages[2])}
              onLoad={() => handleImageLoad(displayImages[2])}
              onError={() => handleImageError(displayImages[2])}
            />
          </div>
          <div>
            <ImageItem
              src={displayImages[3]}
              alt={`${title} 4`}
              isLoaded={loadedImages.has(displayImages[3])}
              isError={errorStates.has(displayImages[3])}
              onLoad={() => handleImageLoad(displayImages[3])}
              onError={() => handleImageError(displayImages[3])}
            />
          </div>
        </div>
      </div>
    )
  }

  // Five images - left large (2x2), right 4 in 2x2 grid
  return (
    <div className="w-full overflow-hidden rounded-2xl">
      <div className="grid h-full w-full auto-rows-fr grid-cols-4 gap-2">
        <div className="col-span-2 row-span-2">
          <ImageItem
            src={displayImages[0]}
            alt={`${title} 1`}
            isLoaded={loadedImages.has(displayImages[0])}
            isError={errorStates.has(displayImages[0])}
            onLoad={() => handleImageLoad(displayImages[0])}
            onError={() => handleImageError(displayImages[0])}
          />
        </div>
        <div className="col-span-1 row-span-1">
          <ImageItem
            src={displayImages[1]}
            alt={`${title} 2`}
            isLoaded={loadedImages.has(displayImages[1])}
            isError={errorStates.has(displayImages[1])}
            onLoad={() => handleImageLoad(displayImages[1])}
            onError={() => handleImageError(displayImages[1])}
          />
        </div>
        <div className="col-span-1 row-span-1">
          <ImageItem
            src={displayImages[2]}
            alt={`${title} 3`}
            isLoaded={loadedImages.has(displayImages[2])}
            isError={errorStates.has(displayImages[2])}
            onLoad={() => handleImageLoad(displayImages[2])}
            onError={() => handleImageError(displayImages[2])}
          />
        </div>
        <div className="col-span-1 row-span-1">
          <ImageItem
            src={displayImages[3]}
            alt={`${title} 4`}
            isLoaded={loadedImages.has(displayImages[3])}
            isError={errorStates.has(displayImages[3])}
            onLoad={() => handleImageLoad(displayImages[3])}
            onError={() => handleImageError(displayImages[3])}
          />
        </div>
        <div className="col-span-1 row-span-1">
          <ImageItem
            src={displayImages[4]}
            alt={`${title} 5`}
            isLoaded={loadedImages.has(displayImages[4])}
            isError={errorStates.has(displayImages[4])}
            onLoad={() => handleImageLoad(displayImages[4])}
            onError={() => handleImageError(displayImages[4])}
          />
        </div>
      </div>
    </div>
  )
}

interface ImageItemProps {
  src: string
  alt: string
  isLoaded: boolean
  isError: boolean
  onLoad: () => void
  onError: () => void
}

function ImageItem({ src, alt, isError, onLoad, onError }: ImageItemProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-100">
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-300">
          <AlertCircle className="size-5 text-gray-500" />
        </div>
      )}

      <img
        referrerPolicy="no-referrer"
        src={`${src}=s1500`}
        alt={alt}
        onLoad={onLoad}
        onError={onError}
        className="aspect-square h-full w-full object-cover"
      />
    </div>
  )
}
