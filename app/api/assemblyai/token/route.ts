import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const apiKey = process.env.NEXT_ASSEMBLYAI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AssemblyAI API key not configured' },
        { status: 500 }
      );
    }

    // For AssemblyAI streaming, we'll use the API key directly as a token
    // In production, you might want to generate temporary tokens via their API
    return NextResponse.json({
      token: apiKey,
    });
  } catch (error) {
    console.error('Error in AssemblyAI token:', error);
    return NextResponse.json(
      { error: 'Failed to get AssemblyAI token' },
      { status: 500 }
    );
  }
}