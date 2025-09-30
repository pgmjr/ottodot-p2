import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PLACEHOLDER_IMAGE_DATA_URI } from '../lib/placeholderImage';

interface ReliableImageProps {
  src: string | undefined | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  fallbackText?: string;
  priority?: boolean; // For above-the-fold content
  loading?: 'lazy' | 'eager';
}

/**
 * ReliableImage Component
 * 
 * A robust image component that prioritizes display reliability over optimization.
 * Implements multi-level fallback system to ensure images always display something.
 * 
 * Fallback Strategy:
 * 1. Original image URL (with validation)
 * 2. Cleaned/retried URL 
 * 3. Placeholder SVG image
 * 4. Text fallback with icon
 */
const ReliableImage: React.FC<ReliableImageProps> = ({
  src,
  alt,
  className = '',
  style,
  onLoad,
  onError,
  fallbackText,
  priority = false,
  loading = 'lazy'
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [fallbackLevel, setFallbackLevel] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const mountedRef = useRef(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
      setIsVisible(true);
      return;
    }

    // For non-priority images, we need to wait for the DOM element to be available
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && mountedRef.current) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' } // Start loading 50px before visible
    );

    // Use a timeout to ensure the ref is attached after render
    const timeoutId = setTimeout(() => {
      if (imgRef.current && mountedRef.current) {
        observer.observe(imgRef.current);
      }
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [priority]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Validates and cleans image URLs
   */
  const validateAndCleanUrl = useCallback((url: string): string | null => {
    if (!url || typeof url !== 'string') return null;
    
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return null;

    // Accept valid URL patterns
    if (
      trimmedUrl.startsWith('https://') ||
      trimmedUrl.startsWith('http://') ||
      trimmedUrl.startsWith('/') ||
      trimmedUrl.startsWith('data:') ||
      trimmedUrl.startsWith('./') ||
      trimmedUrl.startsWith('../')
    ) {
      return trimmedUrl;
    }

    // Try to fix common URL issues
    if (trimmedUrl.includes('://') && !trimmedUrl.startsWith('http')) {
      return `https://${trimmedUrl.split('://')[1]}`;
    }

    // If it looks like a domain, try adding https
    if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ') && !trimmedUrl.includes('\n')) {
      return `https://${trimmedUrl}`;
    }

    return null;
  }, []);

  // Reset state when src prop changes
  React.useEffect(() => {
    // Reset all state when src changes
    setCurrentSrc(null);
    setFallbackLevel(0);
    setHasError(false);
  }, [src]);

  // Initialize source when visible
  React.useEffect(() => {
    if (src && !currentSrc && fallbackLevel === 0 && isVisible) {
      const validatedSrc = validateAndCleanUrl(src);
      if (validatedSrc) {
        setCurrentSrc(validatedSrc);
      } else {
        // Skip to placeholder if URL is clearly invalid
        setCurrentSrc(PLACEHOLDER_IMAGE_DATA_URI);
        setFallbackLevel(2);
      }
    }
  }, [src, currentSrc, fallbackLevel, validateAndCleanUrl, isVisible]);

  /**
   * Handles image load errors with progressive fallbacks
   */
  const handleError = useCallback(() => {
    console.log('🖼️ ReliableImage Error:', { 
      src, 
      currentSrc, 
      fallbackLevel, 
      alt,
      isTemplate: alt?.includes('Question image') || alt?.includes('template')
    });
    
    // Prevent state updates if component is unmounted
    if (!mountedRef.current) return;

    // Try next fallback level
    if (fallbackLevel === 0 && src) {
      // Level 1: Try cleaning the URL more aggressively
      const cleanedUrl = src.trim().replace(/\s+/g, '').replace(/\n/g, '');
      console.log('🖼️ Trying cleaned URL:', { original: src, cleaned: cleanedUrl });
      if (cleanedUrl !== currentSrc && validateAndCleanUrl(cleanedUrl)) {
        setCurrentSrc(cleanedUrl);
        setFallbackLevel(1);
        return;
      }
    }

    // Level 2: Use placeholder image
    if (fallbackLevel < 2) {
      console.log('🖼️ Falling back to placeholder image');
      setCurrentSrc(PLACEHOLDER_IMAGE_DATA_URI);
      setFallbackLevel(2);
      return;
    }

    // Level 3: Text fallback
    console.log('🖼️ Falling back to text');
    setHasError(true);
    setFallbackLevel(3);
    
    // Call user-provided onError callback
    onError?.();
  }, [currentSrc, fallbackLevel, src, onError, validateAndCleanUrl, alt]);

  /**
   * Handles successful image load
   */
  const handleLoad = useCallback(() => {
    console.log('✅ ReliableImage Load Success:', { 
      src, 
      currentSrc, 
      alt,
      isTemplate: alt?.includes('Question image') || alt?.includes('template')
    });
    onLoad?.();
  }, [onLoad, src, currentSrc, alt]);

  // Text fallback for when all image attempts fail
  if (hasError || fallbackLevel === 3) {
    return (
      <div 
        className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 ${className}`}
        style={style}
        title={alt}
      >
        <div className="text-center p-4">
          <div className="text-2xl mb-1">🖼️</div>
          <div className="text-sm">
            {fallbackText || 'Image not available'}
          </div>
          {alt && alt !== fallbackText && (
            <div className="text-xs mt-1 opacity-70">
              {alt}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Return img element with lazy loading and error handling
  return (
    <img
      ref={imgRef}
      src={isVisible ? (currentSrc || PLACEHOLDER_IMAGE_DATA_URI) : PLACEHOLDER_IMAGE_DATA_URI}
      alt={alt}
      className={className}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
};

export default ReliableImage;