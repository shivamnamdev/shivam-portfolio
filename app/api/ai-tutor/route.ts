// app/api/ai-tutor/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { labType, code, assignment, output, gitContext } = await req.json();

    // 🚨 MOCK AI RESPONSE FOR TESTING (No OpenAI API Key Required)
    // We pretend to be OpenAI taking 2 seconds to "think"
    await new Promise((resolve) => setTimeout(resolve, 1200));

    let mockReply = "I am currently in Test Mode. Share more details and I will guide step by step.";

    if (labType === "git") {
    const lastLine =
    Array.isArray(gitContext?.commandHistory) && gitContext.commandHistory.length? gitContext.commandHistory[gitContext.commandHistory.length - 1]: "";
    if ((lastLine || "").includes("nothing to commit")) {
      mockReply = "You need staged changes before commit. Try git add filename then git commit -m 'message'.";
    } else if ((lastLine || "").includes("not supported")) {
      mockReply = "This command is not in simulator v1. Use git status, git add, git commit -m, git log --oneline, git checkout -b.";
    } else {
      mockReply = "For this Git task: run git status, stage required files, commit with a meaningful message, then verify with git log --oneline.";
    }

    return NextResponse.json({ success: true, message: mockReply });
    }

if (output && output.includes("SyntaxError")) {
mockReply = "It looks like you have a Syntax Error. Double check your brackets or colons at the end of the line!";
} else if (output && output.includes("NameError")) {
mockReply = "Oops! You tried to use a variable or function that has not been defined yet. Check your spelling!";
} else if (code && !String(code).trim()) {
mockReply = "Your editor is empty. Start by writing the first step and run again.";
}

return NextResponse.json({ success: true, message: mockReply });
  } catch (error) {
    console.error("AI Tutor Error:", error);
    return NextResponse.json({ success: false, message: "AI Tutor is currently unavailable." }, { status: 500 });
  }
}