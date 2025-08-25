// app/api/arena/battle-count/route.ts
import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { CONTRACTS } from '@/lib/web3/config';
import { ARENA_ABI } from '@/lib/contracts/abis';

// Create a public client for reading from the blockchain
const publicClient = createPublicClient({
  transport: http(process.env.NEXT_PUBLIC_SEI_TESTNET_RPC),
});

export async function GET() {
  try {
    console.log('Fetching battle count from contract...');
    
    if (!CONTRACTS.ARENA) {
      return NextResponse.json(
        { error: 'Arena contract address not configured' },
        { status: 500 }
      );
    }

    // Get the battle count from the contract
    const battleCount = await publicClient.readContract({
      address: CONTRACTS.ARENA as `0x${string}`,
      abi: ARENA_ABI,
      functionName: 'getBattleCount',
    }) as bigint;

    console.log('Battle count from contract:', battleCount.toString());

    return NextResponse.json({
      success: true,
      count: Number(battleCount),
      countBigInt: battleCount.toString()
    });

  } catch (error) {
    console.error('Error fetching battle count:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch battle count from contract',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}