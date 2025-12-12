import { useEffect, useState } from 'react'

interface FallbackImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string
  alt: string
  fallbackSeed?: string
}

/**
 * Image component with fallback support.
 * 1. If no src provided, immediately uses picsum fallback
 * 2. If src provided, tries to load original source
 * 3. If failed, falls back to picsum with seed
 * 4. If picsum fails, shows grey background
 */
export function FallbackImage({ src, alt, fallbackSeed, className = '', ...props }: FallbackImageProps) {
  const seed = fallbackSeed || alt || 'fallback'
  const picsumUrl = `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/600`

  const [currentSrc, setCurrentSrc] = useState(src || picsumUrl)
  const [hasError, setHasError] = useState(false)
  const [isPicsumFallback, setIsPicsumFallback] = useState(!src)

  // Reset state when src changes
  useEffect(() => {
    if (src) {
      setCurrentSrc(src)
      setIsPicsumFallback(false)
      setHasError(false)
    } else {
      setCurrentSrc(picsumUrl)
      setIsPicsumFallback(true)
      setHasError(false)
    }
  }, [src, picsumUrl])

  const handleError = () => {
    if (!isPicsumFallback) {
      // Try picsum fallback
      setIsPicsumFallback(true)
      setCurrentSrc(picsumUrl)
    } else {
      // Picsum also failed, show grey background
      setHasError(true)
    }
  }

  if (hasError) {
    return <div className={`bg-gray-200 ${className}`} {...props} />
  }

  return (
    <img
      referrerPolicy='no-referrer'
      src={currentSrc}
      alt={alt}
      onError={handleError}
      className={className}
      {...props}
    />
  )
}
