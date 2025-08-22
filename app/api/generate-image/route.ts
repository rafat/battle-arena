// app/api/generate-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    // Use the provided prompt or default prompt
    const imagePrompt = prompt || "A fierce warrior battle agent, cyberpunk style, futuristic armor, glowing eyes, standing in a battle stance, digital art, high quality, dramatic lighting, dark background with neon accents";
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    if (!response.data || response.data.length === 0 || !response.data[0].url) {
      throw new Error('No image URL received from OpenAI');
    }

    const imageUrl = response.data[0].url;
    
    return NextResponse.json({ 
      success: true, 
      imageUrl 
    });
    
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate image' 
      },
      { status: 500 }
    );
  }
}
