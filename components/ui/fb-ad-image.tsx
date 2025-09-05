'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface FbAdImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  fallbackText?: string
}

/**
 * Facebook Ad Image component that handles:
 * - Facebook CDN URLs that may fail with 403
 * - Development placeholders
 * - Graceful fallbacks
 */
export function FbAdImage({ 
  src, 
  alt = "Ad", 
  className,
  fallbackText = "Ad Image",
  ...props 
}: FbAdImageProps) {
  const [imageError, setImageError] = React.useState(false)
  const [imageLoaded, setImageLoaded] = React.useState(false)
  
  // In development, Facebook CDN images often fail due to CORS
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isFacebookCdn = src?.includes('scontent') || src?.includes('fbcdn.net')
  
  // Reset state when src changes
  React.useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
  }, [src])
  
  // If no src or known Facebook CDN in development, show placeholder
  if (!src || (isDevelopment && isFacebookCdn && imageError)) {
    return (
      <div 
        className={cn(
          "relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900",
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="w-10 h-10 mx-auto mb-2 text-slate-400 dark:text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" 
              />
            </svg>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {fallbackText}
            </p>
            {isDevelopment && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Dev Mode
              </p>
            )}
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-pink-500/10 to-orange-500/10 rounded-full blur-xl" />
      </div>
    )
  }
  
  return (
    <div className={cn("relative overflow-hidden", className)} {...props}>
      {/* Loading state */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse" />
      )}
      
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover",
          !imageLoaded && "opacity-0"
        )}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
    </div>
  )
}