// app/api/ai-tutor/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { code, assignment, output } = await req.json();

    // 🚨 MOCK AI RESPONSE FOR TESTING (No OpenAI API Key Required)
    // We pretend to be OpenAI taking 2 seconds to "think"
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let mockReply = "I am currently in Test Mode! But if I were awake, I'd tell you to check your syntax.";

    // Give a somewhat smart response based on their error
    if (output && output.includes("SyntaxError")) {
      mockReply = "It looks like you have a Syntax Error. Double check your brackets or colons at the end of the line!";
    } else if (output && output.includes("NameError")) {
      mockReply = "Oops! You tried to use a variable or function that hasn't been defined yet. Check your spelling!";
    }

    return NextResponse.json({ success: true, message: mockReply });

  } catch (error) {
    console.error("AI Tutor Error:", error);
    return NextResponse.json({ success: false, message: "AI Tutor is currently unavailable." }, { status: 500 });
  }
}