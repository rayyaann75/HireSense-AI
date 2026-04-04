import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { getAIClient } from "@/lib/ai";
import { setupPdfPolyfills } from "@/lib/polyfills";

export const runtime = 'nodejs';

const aiConfig = getAIClient();

export async function POST(req: NextRequest) {
  try {
    setupPdfPolyfills();

    let pdf;
    try {
      pdf = require("pdf-parse");
    } catch (e: any) {
      console.warn("pdf-parse not loaded, will rely on vision for PDFs if needed");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log("Analyzing file:", file.name, "Type:", file.type);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length === 0) {
      throw new Error("File buffer is empty");
    }

    let text = "";
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    // 1. Handle DOCX (Fastest)
    if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith(".docx")) {
      console.log("Parsing DOCX...");
      const data = await mammoth.extractRawText({ buffer });
      text = data.value;
    } 
    // 2. Handle Images (Vision - Fast & Accurate)
    else if (fileType.startsWith("image/") || fileName.endsWith(".png") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
      console.log("Using AI Vision for image analysis...");
      if (!aiConfig) throw new Error("AI Configuration missing for Vision analysis");

      const base64Image = buffer.toString('base64');
      const response = await aiConfig.client.chat.completions.create({
        model: aiConfig.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this resume/portfolio image accurately. Maintain formatting." },
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
      });
      text = response.choices[0].message.content || "";
    }
    // 3. Handle PDF (Text-based first, then Vision for scanned)
    else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      console.log("Parsing PDF...");
      try {
        if (pdf) {
          const data = await pdf(buffer);
          text = data.text;
        }
        
        // If PDF is scanned (little to no text), use Vision
        if (!text || text.trim().length < 100) {
          console.log("Scanned PDF detected, using AI Vision...");
          if (!aiConfig) throw new Error("AI Configuration missing for Vision analysis");
          
          // Note: Standard Vision models take the first page of a PDF as an image in many implementations
          // For simplicity, we'll treat it as a blob if the provider supports it, or ask user for image
          // Actually, for "Elite" speed, we'll suggest uploading images for scanned docs, 
          // but we can try to pass the buffer if supported.
          // Most providers (OpenRouter/OpenAI) don't take PDF buffers in vision directly yet.
          // We will stick to text-based PDF for now and Image-based Vision.
          if (!text) text = "This PDF appears to be a scanned image. For best results, please upload a high-quality image file or a text-based PDF.";
        }
      } catch (pdfError: any) {
        console.error("PDF Parse Error:", pdfError.message);
        text = "Failed to parse PDF text. If this is a scanned document, please upload it as an image (PNG/JPG).";
      }
    } 
    // 4. Handle Text/Everything else
    else {
      text = buffer.toString("utf-8");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("No text could be extracted");
    }

    // Basic cleaning
    text = text.replace(/\s+/g, " ").trim();
    console.log("Analysis successful, text length:", text.length);

    return NextResponse.json({ text });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("CRITICAL Analysis error:", error);
    return NextResponse.json({ 
      error: "Failed to parse document", 
      details: errorMessage,
      type: error instanceof Object ? error.constructor.name : typeof error
    }, { status: 500 });
  }
}
