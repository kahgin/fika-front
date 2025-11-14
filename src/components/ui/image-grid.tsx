import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";

interface ImageGridProps {
  images: string[];
  title: string;
  maxImages?: number;
}

export function ImageGrid({ images, title, maxImages = 5 }: ImageGridProps) {
  const [displayImages, setDisplayImages] = useState<string[]>([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorStates, setErrorStates] = useState<Set<string>>(new Set());

  useEffect(() => {
    const limited = images.slice(0, maxImages);
    setDisplayImages(limited);
    setLoadedImages(new Set());
    setErrorStates(new Set());
  }, [images, maxImages]);

  const handleImageLoad = (url: string) => {
    setLoadedImages((prev) => new Set([...prev, url]));
  };

  const handleImageError = (url: string) => {
    setErrorStates((prev) => new Set([...prev, url]));
  };

  if (displayImages.length === 0) {
    return (
      <div className="w-full bg-gray-100 rounded-2xl flex items-center justify-center aspect-video">
        <div className="flex items-center gap-2 text-gray-500">
          <AlertCircle className="size-4" />
          <span className="text-sm">No images available</span>
        </div>
      </div>
    );
  }

  // Single image
  if (displayImages.length === 1) {
    return (
      <div className="rounded-2xl overflow-hidden w-full aspect-video">
        <ImageItem
          src={displayImages[0]}
          alt={title}
          isLoaded={loadedImages.has(displayImages[0])}
          isError={errorStates.has(displayImages[0])}
          onLoad={() => handleImageLoad(displayImages[0])}
          onError={() => handleImageError(displayImages[0])}
        />
      </div>
    );
  }

  // Two images
  if (displayImages.length === 2) {
    return (
      <div className="rounded-2xl overflow-hidden w-full" style={{ aspectRatio: "2/1" }}>
        <div className="grid grid-cols-2 grid-rows-1 gap-2 h-full w-full">
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
    );
  }

  // Three images
  if (displayImages.length === 3) {
    return (
      <div className="rounded-2xl overflow-hidden w-full" style={{ aspectRatio: "2/1" }}>
        <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full w-full">
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
    );
  }

  // Four images
  if (displayImages.length === 4) {
    return (
      <div className="rounded-2xl overflow-hidden w-full" style={{ aspectRatio: "2/1" }}>
        <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full w-full">
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
    );
  }

  // Five images - left large (2x2), right 4 in 2x2 grid
  return (
    <div className="rounded-2xl overflow-hidden w-full" style={{ aspectRatio: "1024/508" }}>
      <div className="grid grid-cols-4 gap-2 h-full w-full auto-rows-fr">
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
  );
}

interface ImageItemProps {
  src: string;
  alt: string;
  isLoaded: boolean;
  isError: boolean;
  onLoad: () => void;
  onError: () => void;
}

function ImageItem({ src, alt, isError, onLoad, onError }: ImageItemProps) {
  return (
    <div className="relative w-full h-full bg-gray-100 overflow-hidden">
      {isError && (
        <div className="absolute inset-0 bg-gray-300 flex items-center justify-center">
          <AlertCircle className="size-5 text-gray-500" />
        </div>
      )}

      <img
        referrerPolicy="no-referrer"
        src={src}
        alt={alt}
        onLoad={onLoad}
        onError={onError}
        className="w-full h-full object-cover"
      />
    </div>
  );
}