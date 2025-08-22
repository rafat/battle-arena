// app/api/test-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.PINATA_JWT;
  
  return NextResponse.json({
    hasToken: !!token,
    tokenLength: token?.length || 0,
    tokenStart: token?.substring(0, 20) || 'No token',
    // Don't expose the full token in production
  });
}
