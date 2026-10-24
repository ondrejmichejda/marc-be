import OpenAI from "openai";

export const FUNNY_INSULT_PROMPT =
  "Vrať mi vtipnou nadávku, která nebude sprostá, ale pobaví. Vracej pouze výstup, žádné komentáře okolo.";

let openaiClient: OpenAI | null = null;

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
 * Prompts the OpenAI API for a funny, non-vulgar insult and returns the output.
 */
export async function generateFunnyInsult(): Promise<string> {
  const openai = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: FUNNY_INSULT_PROMPT,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Received empty response from OpenAI API.");
  }

  return content;
}
