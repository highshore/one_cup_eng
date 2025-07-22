import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const openaiApiKey = process.env.NEXT_OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not found',
        message: 'Please add NEXT_OPENAI_API_KEY to your .env file'
      }, { status: 500 });
    }

    if (openaiApiKey === 'your_openai_api_key_here') {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured',
        message: 'Please replace the placeholder with your actual OpenAI API key'
      }, { status: 500 });
    }

    // Test the API key with a simple request
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key invalid',
        details: errorData,
        status: response.status
      }, { status: 400 });
    }

    const data = await response.json();
    const gpt4oMiniAvailable = data.data?.some((model: any) => model.id === 'gpt-4o-mini');

    return NextResponse.json({
      success: true,
      message: 'OpenAI API key is working!',
      keyPrefix: openaiApiKey.substring(0, 7) + '...',
      gpt4oMiniAvailable,
      modelsCount: data.data?.length || 0
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to test OpenAI API',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 