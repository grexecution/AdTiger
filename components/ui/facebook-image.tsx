'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface FacebookImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  fallback?: string
}

export function FacebookImage({ src, alt, className, fallback, ...props }: FacebookImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setImgSrc(src)
    setError(false)
    setLoading(true)
  }, [src])

  const handleError = () => {
    console.log(`Image failed to load: ${src}`)
    
    // Try different fallback strategies
    if (!error && src.includes('scontent') && src.includes('fbcdn.net')) {
      // For Facebook CDN URLs, try using a placeholder
      // These URLs often fail due to CORS/auth issues in development
      setError(true)
      setLoading(false)
    } else if (fallback && imgSrc !== fallback) {
      setImgSrc(fallback)
      setError(false)
      setLoading(true)
    } else {
      setError(true)
      setLoading(false)
    }
  }

  const handleLoad = () => {
    setLoading(false)
    setError(false)
  }

  // For development, show a placeholder if the image fails
  if (error && !fallback) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20",
          className
        )}
        style={{ minHeight: '100px' }}
      >
        <div className="text-center p-2">
          <svg
            className="w-8 h-8 mx-auto mb-1 text-blue-400 dark:text-blue-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Ad Image</div>
          <div className="text-xs text-muted-foreground mt-0.5">Preview in production</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {loading && (
        <div 
          className={cn(
            "animate-pulse bg-muted",
            className
          )}
          style={{ minHeight: '100px' }}
        />
      )}
      <img
        {...props}
        src={imgSrc}
        alt={alt}
        className={cn(className, loading && 'hidden')}
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  )
}