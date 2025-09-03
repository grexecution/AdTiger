"use client"

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ImageIcon } from 'lucide-react'

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null
  fallback?: string
  showPlaceholder?: boolean
  placeholderClassName?: string
  onErrorFallback?: () => void
}

export function SafeImage({ 
  src, 
  alt = '', 
  className,
  fallback,
  showPlaceholder = true,
  placeholderClassName,
  onErrorFallback,
  ...props 
}: SafeImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(src || null)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setImageSrc(src || null)
    setHasError(false)
    setIsLoading(true)
  }, [src])

  const handleError = () => {
    console.log(`Image failed to load: ${imageSrc}`)
    
    if (fallback && !hasError) {
      console.log(`Trying fallback: ${fallback}`)
      setImageSrc(fallback)
      setHasError(true)
    } else {
      setHasError(true)
      setIsLoading(false)
      onErrorFallback?.()
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  // If no src or error and no placeholder, return null
  if ((!imageSrc || hasError) && !showPlaceholder) {
    return null
  }

  // Show placeholder if no src or error occurred
  if (!imageSrc || (hasError && !fallback)) {
    return (
      <div className={cn(
        "w-full h-full bg-gray-200 flex items-center justify-center",
        placeholderClassName
      )}>
        <ImageIcon className="h-12 w-12 text-gray-400" />
      </div>
    )
  }

  return (
    <>
      {isLoading && showPlaceholder && (
        <div className={cn(
          "absolute inset-0 bg-gray-200 flex items-center justify-center animate-pulse",
          placeholderClassName
        )}>
          <ImageIcon className="h-12 w-12 text-gray-400" />
        </div>
      )}
      <img
        {...props}
        src={imageSrc}
        alt={alt}
        className={cn(className, isLoading && 'opacity-0')}
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  )
}