// app/api/upload-image-to-pinata/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    console.log('Processing image upload for URL:', imageUrl);
    
    // Check if it's already an IPFS URL
    if (imageUrl.includes('ipfs/') || imageUrl.includes('ipfs.io') || imageUrl.includes('gateway.pinata.cloud')) {
      console.log('Image is already on IPFS, no upload needed');
      return NextResponse.json({
        success: true,
        ipfsUrl: imageUrl,
        ipfsHash: imageUrl.match(/\/ipfs\/([a-zA-Z0-9]+)/)?.[1] || 'existing'
      });
    }

    console.log('Fetching image from external URL:', imageUrl);

    // Fetch the image from external URL (e.g., OpenAI's blob storage)
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; agents-arena-bot/1.0)'
      }
    });
    
    if (!imageResponse.ok) {
      console.error('Failed to fetch image:', {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        url: imageUrl
      });
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    // Get the image as a buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    console.log('Image fetched successfully, size:', imageBuffer.byteLength, 'bytes');
    
    console.log('Uploading to Pinata...');

    // Validate Pinata JWT
    if (!process.env.PINATA_JWT) {
      console.error('PINATA_JWT environment variable is not set');
      throw new Error('PINATA_JWT environment variable is not configured');
    }

    // Upload to Pinata using FormData (direct HTTP API)
    const formData = new FormData();
    formData.append('file', new Blob([imageBuffer], { type: 'image/png' }), 'agent-avatar.png');
    
    // Optional: Add metadata
    formData.append('pinataMetadata', JSON.stringify({
      name: 'agent-avatar.png',
    }));

    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      },
      body: formData,
    });

    if (!pinataResponse.ok) {
      const errorText = await pinataResponse.text();
      console.error('Pinata upload failed:', {
        status: pinataResponse.status,
        statusText: pinataResponse.statusText,
        error: errorText
      });
      throw new Error(`Pinata upload failed: ${pinataResponse.status} ${pinataResponse.statusText} - ${errorText}`);
    }

    const pinataData = await pinataResponse.json();
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${pinataData.IpfsHash}`;

    console.log('Upload successful:', ipfsUrl);

    return NextResponse.json({
      success: true,
      ipfsUrl,
      ipfsHash: pinataData.IpfsHash
    });

  } catch (error) {
    console.error('Error uploading image to Pinata:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to upload image to IPFS',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
