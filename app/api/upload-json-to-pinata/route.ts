// app/api/upload-json-to-pinata/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const PINATA_JWT = process.env.PINATA_JWT;

    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: 'PINATA_JWT environment variable is not set' },
        { status: 500 }
      );
    }

    const requestBody = {
      pinataContent: body,
      pinataMetadata: {
        name: 'agent-metadata.json',
      },
    };

    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Pinata upload failed: ${res.statusText}`, details: errorText },
        { status: res.status }
      );
    }

    const result = await res.json();
    return NextResponse.json({ success: true, ipfsHash: result.IpfsHash });
  } catch (err) {
    return NextResponse.json(
      { error: 'Unexpected error uploading JSON to Pinata' },
      { status: 500 }
    );
  }
}
