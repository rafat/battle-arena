// app/api/test-json-upload/route.ts
import { NextResponse } from 'next/server';
import { uploadToPinata } from '@/lib/web3/pinata';

export async function GET() {
  try {
    console.log('=== Testing JSON Upload ===');
    
    const testData = {
      name: "Test Agent",
      description: "This is a test agent",
      image: "https://gateway.pinata.cloud/ipfs/QmdFbZpuMzRAxdNTKhoAhUYWwqinXZTFR6txfuti3UPqKd",
      attributes: [
        { trait_type: 'Class', value: 'Warrior' },
        { trait_type: 'Attack', value: 100 },
        { trait_type: 'Defense', value: 50 },
        { trait_type: 'Speed', value: 75 },
        { trait_type: 'Health', value: 200 },
      ],
    };

    console.log('Testing JSON upload with data:', testData);
    
    const ipfsHash = await uploadToPinata(testData);
    
    return NextResponse.json({
      success: true,
      message: 'JSON uploaded successfully',
      ipfsHash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      testData
    });
    
  } catch (error) {
    console.error('Test JSON upload failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// Also support POST for completeness
export async function POST() {
  return GET();
}
