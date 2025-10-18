import { useState, useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";

interface ImageGridProps {
  images: string[];
  title: string;
  maxImages?: number;
}

// Shared image preload cache to avoid re-fetching
const imagePreloadCache = new Map<string, Promise<void>>();

function preloadImage(url: string): Promise<void> {
  if (imagePreloadCache.has(url)) {
    return imagePreloadCache.get(url)!;
  }

  const promise = new Promise<void>((resolve, reject) => {
    // Use setTimeout to avoid blocking with 300ms stagger
    setTimeout(() => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    }, 300);
  });

  imagePreloadCache.set(url, promise);
  return promise;
}

export function ImageGrid({ images, title, maxImages = 5 }: ImageGridProps) {
  const [displayImages, setDisplayImages] = useState<string[]>([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorStates, setErrorStates] = useState<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Limit images to maxImages (default 5)
    const limited = images.slice(0, maxImages);
    setDisplayImages(limited);

    // Preload all images in sequence
    limited.forEach((img) => {
      preloadImage(img)
        .then(() => {
          if (mountedRef.current) {
            setLoadedImages((prev) => new Set([...prev, img]));
          }
        })
        .catch(() => {
          if (mountedRef.current) {
            setErrorStates((prev) => new Set([...prev, img]));
          }
        });
    });
  }, [images, maxImages]);

  const handleImageError = (url: string) => {
    setErrorStates((prev) => new Set([...prev, url]));
    setLoadedImages((prev) => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
  };

  if (displayImages.length === 0) {
    return (
      <div className="w-full bg-gray-100 rounded-2xl flex items-center justify-center" style={{ height: "300px" }}>
        <div className="flex items-center gap-2 text-gray-500">
          <AlertCircle className="size-4" />
          <span className="text-sm">No images available</span>
        </div>
      </div>
    );
  }

  const containerHeight = "300px";

  // Single image
  if (displayImages.length === 1) {
    return (
      <div style={{ height: containerHeight }}>
        <ImageItem
          src={displayImages[0]}
          alt={title}
          isLoaded={loadedImages.has(displayImages[0])}
          isError={errorStates.has(displayImages[0])}
          onError={() => handleImageError(displayImages[0])}
        />
      </div>
    );
  }

  // Two images: main (larger) + one small
  if (displayImages.length === 2) {
    return (
      <div style={{ height: containerHeight }} className="grid grid-cols-2 gap-3">
        <div className="col-span-2 row-span-1">
          <ImageItem
            src={displayImages[0]}
            alt={`${title} 1`}
            isLoaded={loadedImages.has(displayImages[0])}
            isError={errorStates.has(displayImages[0])}
            onError={() => handleImageError(displayImages[0])}
          />
        </div>
        <div>
          <ImageItem
            src={displayImages[1]}
            alt={`${title} 2`}
            isLoaded={loadedImages.has(displayImages[1])}
            isError={errorStates.has(displayImages[1])}
            onError={() => handleImageError(displayImages[1])}
          />
        </div>
      </div>
    );
  }

  // Three images: main (larger on left) + two stacked on right
  if (displayImages.length === 3) {
    return (
      <div style={{ height: containerHeight }} className="grid grid-cols-2 gap-3">
        <div className="row-span-2">
          <ImageItem
            src={displayImages[0]}
            alt={`${title} 1`}
            isLoaded={loadedImages.has(displayImages[0])}
            isError={errorStates.has(displayImages[0])}
            onError={() => handleImageError(displayImages[0])}
          />
        </div>
        <div>
          <ImageItem
            src={displayImages[1]}
            alt={`${title} 2`}
            isLoaded={loadedImages.has(displayImages[1])}
            isError={errorStates.has(displayImages[1])}
            onError={() => handleImageError(displayImages[1])}
          />
        </div>
        <div>
          <ImageItem
            src={displayImages[2]}
            alt={`${title} 3`}
            isLoaded={loadedImages.has(displayImages[2])}
            isError={errorStates.has(displayImages[2])}
            onError={() => handleImageError(displayImages[2])}
          />
        </div>
      </div>
    );
  }

  // Four images: main (larger on left) + three stacked on right
  if (displayImages.length === 4) {
    return (
      <div style={{ height: containerHeight }} className="grid grid-cols-2 gap-3">
        <div className="row-span-3">
          <ImageItem
            src={displayImages[0]}
            alt={`${title} 1`}
            isLoaded={loadedImages.has(displayImages[0])}
            isError={errorStates.has(displayImages[0])}
            onError={() => handleImageError(displayImages[0])}
          />
        </div>
        <div>
          <ImageItem
            src={displayImages[1]}
            alt={`${title} 2`}
            isLoaded={loadedImages.has(displayImages[1])}
            isError={errorStates.has(displayImages[1])}
            onError={() => handleImageError(displayImages[1])}
          />
        </div>
        <div>
          <ImageItem
            src={displayImages[2]}
            alt={`${title} 3`}
            isLoaded={loadedImages.has(displayImages[2])}
            isError={errorStates.has(displayImages[2])}
            onError={() => handleImageError(displayImages[2])}
          />
        </div>
        <div>
          <ImageItem
            src={displayImages[3]}
            alt={`${title} 4`}
            isLoaded={loadedImages.has(displayImages[3])}
            isError={errorStates.has(displayImages[3])}
            onError={() => handleImageError(displayImages[3])}
          />
        </div>
      </div>
    );
  }

  // Five images: main (larger on left) + four in 2x2 grid on right
  return (
    <div style={{ height: containerHeight }} className="grid grid-cols-3 gap-3">
      <div className="col-span-1 row-span-2">
        <ImageItem
          src={displayImages[0]}
          alt={`${title} 1`}
          isLoaded={loadedImages.has(displayImages[0])}
          isError={errorStates.has(displayImages[0])}
          onError={() => handleImageError(displayImages[0])}
        />
      </div>
      <div>
        <ImageItem
          src={displayImages[1]}
          alt={`${title} 2`}
          isLoaded={loadedImages.has(displayImages[1])}
          isError={errorStates.has(displayImages[1])}
          onError={() => handleImageError(displayImages[1])}
        />
      </div>
      <div>
        <ImageItem
          src={displayImages[2]}
          alt={`${title} 3`}
          isLoaded={loadedImages.has(displayImages[2])}
          isError={errorStates.has(displayImages[2])}
          onError={() => handleImageError(displayImages[2])}
        />
      </div>
      <div>
        <ImageItem
          src={displayImages[3]}
          alt={`${title} 4`}
          isLoaded={loadedImages.has(displayImages[3])}
          isError={errorStates.has(displayImages[3])}
          onError={() => handleImageError(displayImages[3])}
        />
      </div>
      <div>
        <ImageItem
          src={displayImages[4]}
          alt={`${title} 5`}
          isLoaded={loadedImages.has(displayImages[4])}
          isError={errorStates.has(displayImages[4])}
          onError={() => handleImageError(displayImages[4])}
        />
      </div>
    </div>
  );
}

interface ImageItemProps {
  src: string;
  alt: string;
  isLoaded: boolean;
  isError: boolean;
  onError: () => void;
}

function ImageItem({
  src,
  alt,
  isLoaded,
  isError,
  onError,
}: ImageItemProps) {
  return (
    <div className="relative w-full h-full bg-gray-100 rounded-2xl overflow-hidden">
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse z-10" />
      )}

      {isError && (
        <div className="absolute inset-0 bg-gray-300 flex items-center justify-center z-10">
          <AlertCircle className="size-5 text-gray-500" />
        </div>
      )}

      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={onError}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}