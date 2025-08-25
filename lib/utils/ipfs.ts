// lib/utils/ipfs.ts

// Multiple IPFS gateways for fallback
export const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cf-ipfs.com/ipfs/',
  'https://ipfs.filebase.io/ipfs/',
];

/**
 * Extract IPFS hash from various URL formats
 */
export const extractIPFSHash = (url: string): string | null => {
  if (!url) return null;
  
  // Handle different IPFS URL formats
  const patterns = [
    /\/ipfs\/([a-zA-Z0-9]+)/,  // Standard IPFS path
    /ipfs:\/\/([a-zA-Z0-9]+)/, // IPFS protocol
    /^(Qm[a-zA-Z0-9]+)$/,      // Raw Qm hash
    /^(bafy[a-zA-Z0-9]+)$/,    // Raw bafybeig hash
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // If it's already a hash, return as-is
  if (/^[a-zA-Z0-9]+$/.test(url) && (url.startsWith('Qm') || url.startsWith('bafy'))) {
    return url;
  }
  
  return null;
};

/**
 * Convert any IPFS URL to use a specific gateway
 */
export const convertToIPFSGateway = (url: string, gatewayUrl: string = IPFS_GATEWAYS[0]): string | null => {
  const hash = extractIPFSHash(url);
  if (!hash) return null;
  
  return `${gatewayUrl}${hash}`;
};

/**
 * Get all possible IPFS URLs for a given hash or URL
 */
export const getAllIPFSUrls = (url: string): string[] => {
  const hash = extractIPFSHash(url);
  if (!hash) return [];
  
  return IPFS_GATEWAYS.map(gateway => `${gateway}${hash}`);
};

/**
 * Test if an IPFS URL is accessible
 */
export const testIPFSUrl = async (url: string, timeout: number = 5000): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Find the first working IPFS gateway for a given URL
 */
export const findWorkingGateway = async (url: string): Promise<string | null> => {
  const urls = getAllIPFSUrls(url);
  
  for (const testUrl of urls) {
    const isWorking = await testIPFSUrl(testUrl);
    if (isWorking) {
      return testUrl;
    }
  }
  
  return null;
};