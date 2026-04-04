import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const aiConfig = getAIClient();
    if (!aiConfig) {
      return NextResponse.json({ error: "AI Client not configured" }, { status: 500 });
    }

    // OpenAI TTS implementation
    if (process.env.OPENAI_API_KEY) {
      const response = await aiConfig.client.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    }

    // Fallback if no OpenAI API key is present
    return NextResponse.json({ 
      error: "Server-side TTS requires an OpenAI API key. Using client-side TTS as fallback.",
      fallback: true 
    }, { status: 501 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("TTS API error:", error);
    return NextResponse.json({ 
      error: "Failed to generate speech", 
      details: errorMessage 
    }, { status: 500 });
  }
}
