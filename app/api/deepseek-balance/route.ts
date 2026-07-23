import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DEEPSEEK_API_KEY not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.deepseek.com/user/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch balance from DeepSeek API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching DeepSeek balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
