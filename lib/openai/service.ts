import OpenAI from "openai";
import { OpenAiConfigStatus, OpenAiMessageLog } from "./types";
import { OpenAiLogService } from "./logs";

export const FUNNY_INSULT_PROMPT = (userMessage: string) =>
  `Zareaguj na zprávu "${userMessage}" vtipnou nadávkou, která nebude sprostá, ale pobaví. Vracej pouze výstup, žádné komentáře okolo.`;

let openaiClient: OpenAI | null = null;

export const AVAILABLE_OPENAI_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
];

/**
 * Checks whether OPENAI_API_KEY is configured in the environment.
 */
export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== "");
}

/**
 * Returns configuration metadata for OpenAI subsystem.
 */
export function getOpenAiConfig(): OpenAiConfigStatus {
  const isConfigured = isOpenAiConfigured();
  const rawKey = process.env.OPENAI_API_KEY || "";
  let maskedKey: string | undefined;

  if (rawKey.length > 8) {
    maskedKey = `${rawKey.slice(0, 3)}...${rawKey.slice(-4)}`;
  } else if (rawKey) {
    maskedKey = "***";
  }

  return {
    isConfigured,
    apiKeyConfigured: isConfigured,
    defaultModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    maskedKey,
    organization: process.env.OPENAI_ORG_ID || undefined,
    availableModels: AVAILABLE_OPENAI_MODELS,
  };
}

/**
 * Returns a singleton instance of the OpenAI client.
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing OPENAI_API_KEY environment variable. Please set it in .env"
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Executes a chat completion and automatically records token usage and metrics into the log service.
 */
export async function executeChatCompletion(params: {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  userIdentifier?: string;
  source?: string;
  temperature?: number;
}): Promise<{
  completion: string;
  log: OpenAiMessageLog;
}> {
  const startTime = Date.now();
  const model = params.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const source = params.source || "system";

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt });
  }
  messages.push({ role: "user", content: params.prompt });

  try {
    if (!isOpenAiConfigured()) {
      // Graceful fallback for local development or demo environment without API key
      const durationMs = Date.now() - startTime + 120;
      const mockCompletion = `[OpenAI Simulation (${model})]: Zpracováno v offline/vývojovém režimu pro prompt: "${params.prompt.slice(0, 80)}"`;
      const promptTokens = Math.max(10, Math.round(params.prompt.length / 4));
      const completionTokens = Math.max(15, Math.round(mockCompletion.length / 4));
      const totalTokens = promptTokens + completionTokens;

      const log = await OpenAiLogService.logInteraction({
        model,
        prompt: params.prompt,
        completion: mockCompletion,
        promptTokens,
        completionTokens,
        totalTokens,
        durationMs,
        status: "success",
        userIdentifier: params.userIdentifier,
        source,
        rawPayload: { simulated: true, model, messages },
      });

      return { completion: mockCompletion, log };
    }

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: params.temperature ?? 0.7,
    });

    const durationMs = Date.now() - startTime;
    const content = response.choices[0]?.message?.content?.trim() || "";

    const promptTokens = response.usage?.prompt_tokens ?? Math.round(params.prompt.length / 4);
    const completionTokens = response.usage?.completion_tokens ?? Math.round(content.length / 4);
    const totalTokens = response.usage?.total_tokens ?? (promptTokens + completionTokens);

    const log = await OpenAiLogService.logInteraction({
      model,
      prompt: params.prompt,
      completion: content,
      promptTokens,
      completionTokens,
      totalTokens,
      durationMs,
      status: "success",
      userIdentifier: params.userIdentifier,
      source,
      rawPayload: response as unknown as Record<string, unknown>,
    });

    return { completion: content, log };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await OpenAiLogService.logInteraction({
      model,
      prompt: params.prompt,
      completion: "",
      promptTokens: Math.round(params.prompt.length / 4),
      completionTokens: 0,
      totalTokens: Math.round(params.prompt.length / 4),
      durationMs,
      status: "error",
      errorMessage,
      userIdentifier: params.userIdentifier,
      source,
      rawPayload: { error: errorMessage },
    });

    throw new Error(`OpenAI API execution failed: ${errorMessage}`);
  }
}

/**
 * Prompts the OpenAI API for a funny, non-vulgar insult and returns the output.
 */
export async function generateFunnyInsult(
  userMessage: string = "",
  userIdentifier?: string
): Promise<string> {
  const result = await executeChatCompletion({
    prompt: FUNNY_INSULT_PROMPT(userMessage),
    userIdentifier,
    source: "insult_generator",
  });

  if (!result.completion) {
    throw new Error("Received empty response from OpenAI API.");
  }

  return result.completion;
}
