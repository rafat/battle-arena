'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface IPFSImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackSrc?: string;
}

// Multiple IPFS gateways for fallback
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cf-ipfs.com/ipfs/',
];

// Extract IPFS hash from various URL formats
const extractIPFSHash = (url: string): string | null => {
  // Handle different IPFS URL formats
  const patterns = [
    /\/ipfs\/([a-zA-Z0-9]+)/,  // Standard IPFS path
    /ipfs:\/\/([a-zA-Z0-9]+)/, // IPFS protocol
    /^([a-zA-Z0-9]+)$/,        // Raw hash
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
};

export function IPFSImage({ src, alt, width, height, className, fallbackSrc }: IPFSImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [gatewayIndex, setGatewayIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset state when src changes
    setCurrentSrc(src);
    setGatewayIndex(0);
    setIsLoading(true);
    setHasError(false);
    
    // Clear any existing timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    
    // Set timeout for slow loading images
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Image loading timeout, trying next gateway:', currentSrc);
        tryNextGateway();
      }
    }, 8000); // 8 second timeout
    
    setLoadingTimeout(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [src]);

  const tryNextGateway = () => {
    const hash = extractIPFSHash(src);
    if (!hash) {
      console.error('Could not extract IPFS hash from:', src);
      setHasError(true);
      return;
    }

    const nextIndex = gatewayIndex + 1;
    if (nextIndex < IPFS_GATEWAYS.length) {
      console.log(`Trying IPFS gateway ${nextIndex + 1}/${IPFS_GATEWAYS.length}:`, IPFS_GATEWAYS[nextIndex]);
      setCurrentSrc(`${IPFS_GATEWAYS[nextIndex]}${hash}`);
      setGatewayIndex(nextIndex);
      setIsLoading(true);
    } else {
      console.error('All IPFS gateways failed for:', src);
      setHasError(true);
      if (fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        setIsLoading(true);
      }
    }
  };

  const handleError = () => {
    console.warn('IPFS image failed to load:', currentSrc);
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
    setIsLoading(false);
    tryNextGateway();
  };

  const handleLoad = () => {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }
    setIsLoading(false);
    setHasError(false);
  };

  // If we have an error and no more fallbacks, show a placeholder
  if (hasError && !fallbackSrc) {
    return (
      <div 
        className={`bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white text-sm font-medium ${className}`}
        style={{ width, height }}
      >
        {alt || 'Image'}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-700 animate-pulse flex items-center justify-center text-white text-xs"
          style={{ width, height }}
        >
          Loading...
        </div>
      )}
      <Image
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
        unoptimized // Disable Next.js optimization for IPFS images to avoid additional processing delays
      />
    </div>
  );
}