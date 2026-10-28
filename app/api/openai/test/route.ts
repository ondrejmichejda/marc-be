import { NextRequest, NextResponse } from "next/server";
import { executeChatCompletion } from "@/lib/openai";

/**
 * POST /api/openai/test
 * Executes a test chat completion and logs prompt, completion, latency, and tokens.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const systemPrompt = typeof body?.systemPrompt === "string" ? body.systemPrompt.trim() : undefined;
    const model = typeof body?.model === "string" ? body.model.trim() : undefined;
    const temperature = typeof body?.temperature === "number" ? body.temperature : 0.7;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }

    const result = await executeChatCompletion({
      prompt,
      systemPrompt,
      model,
      temperature,
      userIdentifier: body?.userIdentifier || "admin@system.console",
      source: "system_console",
    });

    return NextResponse.json({
      success: true,
      completion: result.completion,
      log: result.log,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
