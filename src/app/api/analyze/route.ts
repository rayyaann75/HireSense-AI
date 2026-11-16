import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { getAIClient } from "@/lib/ai";
// Import the pdf-parse worker before the library so it can locate its worker
// files when bundled by Turbopack / deployed to a serverless environment.
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

export const runtime = 'nodejs';

const aiConfig = getAIClient();

export async function POST(req: NextRequest) {
  try {
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
    // 3. Handle PDF (text extraction via pdf-parse v2)
    else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      console.log("Parsing PDF...");
      let parser: PDFParse | null = null;
      try {
        parser = new PDFParse({ data: buffer });
        const pdfData = await parser.getText();
        text = pdfData.text;

        // A scanned PDF contains little to no selectable text.
        if (!text || text.trim().length < 100) {
          console.log("Scanned or empty PDF detected");
          text = "This PDF appears to be a scanned image with little selectable text. For best results, please upload a high-quality image (PNG/JPG) or a text-based PDF.";
        }
      } catch (pdfError: unknown) {
        const message = pdfError instanceof Error ? pdfError.message : String(pdfError);
        console.error("PDF Parse Error:", message);
        text = "Failed to parse PDF text. If this is a scanned document, please upload it as an image (PNG/JPG).";
      } finally {
        if (parser) {
          await parser.destroy().catch(() => {});
        }
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
