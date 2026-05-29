import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const SYSTEM_INSTRUCTION =
  "You are Chunav Saathi, an expert on the Election Commission of India (ECI). Base answers on these facts: Helpline is 1950. Portal is voters.eci.gov.in. Form 6 is for new voters. Official app is Voter Helpline App (VHA). Valid IDs: EPIC, Aadhaar, PAN, DL. Keep answers brief, bulleted, and in the language the user speaks.";

const TRAFFIC_MESSAGE =
  "Chunav Saathi is experiencing heavy traffic. Please try asking your question again in a few moments!";

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        reply:
          "⚠️ GEMINI_API_KEY is not set. Please add it to your .env.local file:\n\nGEMINI_API_KEY=your_key_here",
      },
      { status: 200 }
    );
  }

  let message, history;
  try {
    const body = await request.json();
    message = body.message;
    history = body.history ?? [];
  } catch {
    return NextResponse.json({ reply: "Invalid request body." }, { status: 400 });
  }

  if (!message || typeof message !== "string") {
    return NextResponse.json({ reply: "Invalid message." }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Filter history: only valid roles with content
    const validHistory = history
      .filter(
        (msg) =>
          (msg.role === "user" || msg.role === "model") &&
          Array.isArray(msg.parts) &&
          msg.parts.length > 0
      )
      .slice(-10);

    // Gemini requires history to start with 'user' — trim leading model turns
    while (validHistory.length > 0 && validHistory[0].role !== "user") {
      validHistory.shift();
    }

    const chat = model.startChat({
      history: validHistory,
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    return NextResponse.json({ reply }, { status: 200 });
  } catch (error) {
    console.error("[Chunav Saathi API Error]:", error?.message ?? error);

    // Return a friendly message instead of a raw trace
    return NextResponse.json({ reply: TRAFFIC_MESSAGE }, { status: 200 });
  }
}
