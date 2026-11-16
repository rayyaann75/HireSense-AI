import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Ensure URL has protocol
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    console.log("Analyzing URL with Jina Reader:", targetUrl);

    // Use Jina Reader for high-speed, AI-friendly markdown extraction
    // It handles Vercel, Netlify, and other SPA sites perfectly.
    const readerUrl = `https://r.jina.ai/${targetUrl}`;
    
    const response = await axios.get(readerUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'markdown'
      },
      timeout: 15000 // 15s timeout
    });

    const text = response.data;

    if (!text || text.length < 50) {
      throw new Error("Could not extract meaningful content from this URL");
    }

    console.log("URL Analysis successful, text length:", text.length);

    return NextResponse.json({ text });
  } catch (error: unknown) {
    let errorMessage = "An unexpected error occurred.";
    let type = "UNKNOWN";

    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.details || error.response?.data?.error || error.message;
      type = "AxiosError";
    } else if (error instanceof Error) {
      errorMessage = error.message;
      type = error.constructor.name;
    } else {
      errorMessage = String(error);
      type = typeof error;
    }

    console.error("URL Analysis error detailed:", error);
    return NextResponse.json({ 
      error: "Failed to parse portfolio URL",
      details: errorMessage,
      type
    }, { status: 500 });
  }
}
