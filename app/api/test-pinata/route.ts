// app/api/test-pinata/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.PINATA_JWT;
    
    if (!token) {
      return NextResponse.json({ error: 'No token found' }, { status: 400 });
    }

    console.log('Testing Pinata authentication...');
    
    // Test the token with Pinata's authentication endpoint
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Pinata response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinata error:', errorText);
      return NextResponse.json({ 
        error: 'Authentication failed', 
        status: response.status,
        statusText: response.statusText,
        details: errorText,
        tokenInfo: {
          length: token.length,
          start: token.substring(0, 20)
        }
      }, { status: 401 });
    }

    const result = await response.json();
    console.log('Pinata authentication successful:', result);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Token is valid', 
      data: result 
    });

  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
