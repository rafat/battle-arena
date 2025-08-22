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

    console.log('Fetching image from OpenAI:', imageUrl);

    // Fetch the image from OpenAI's blob storage
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    // Get the image as a buffer
    const imageBuffer = await imageResponse.arrayBuffer();
    
    console.log('Uploading to Pinata...');

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
      console.error('Pinata error response:', errorText);
      throw new Error(`Pinata upload failed: ${pinataResponse.statusText} - ${errorText}`);
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
    console.error('Error uploading image to Pinata:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload image to IPFS',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
