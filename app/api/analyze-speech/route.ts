import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model = 'gpt-4o-mini' } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.NEXT_OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OpenAI API key not found');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert English language assessment AI specializing in analyzing Korean learners\' speaking skills. Provide precise, professional evaluations using the specified scoring system and respond only in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent scoring
        max_tokens: 800,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to analyze speech', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const analysisContent = data.choices[0]?.message?.content;

    if (!analysisContent) {
      return NextResponse.json(
        { error: 'No analysis content received from OpenAI' },
        { status: 500 }
      );
    }

    // Parse the JSON response from OpenAI
    let analysis;
    try {
      analysis = JSON.parse(analysisContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', analysisContent);
      return NextResponse.json(
        { error: 'Invalid response format from OpenAI' },
        { status: 500 }
      );
    }

    // Validate the analysis structure
    if (!analysis.complexity || !analysis.accuracy || !analysis.fluency) {
      console.error('Invalid analysis structure:', analysis);
      return NextResponse.json(
        { error: 'Invalid analysis structure received' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
      model: model,
      usage: data.usage
    });

  } catch (error) {
    console.error('Error in analyze-speech API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 