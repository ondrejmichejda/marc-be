import OpenAI from "openai";
import { OpenAiConfigStatus, OpenAiMessageLog } from "./types";
import { OpenAiLogService } from "./logs";
import { UserAiSettingsService } from "./userSettings";
import { TelegramService } from "../telegram/service";

export const FUNNY_INSULT_PROMPT = (userMessage: string) =>
  `Zareaguj na zprávu "${userMessage}" vtipnou nadávkou, která nebude sprostá, ale pobaví. Vracej pouze výstup, žádné komentáře okolo.`;

let openaiClient: OpenAI | null = null;

export const DEFAULT_OPENAI_MODEL = "gpt-4o";

/**
 * Returns the default OpenAI model name.
 */
export function getEffectiveOpenAiModel(): string {
  return DEFAULT_OPENAI_MODEL;
}

export const AVAILABLE_OPENAI_MODELS = [
  "gpt-4o",
];

/**
 * Checks whether a given model identifier corresponds to an OpenAI reasoning model
 * (such as o1, o1-mini, o3-mini, etc.) which does not support custom temperature settings.
 */
export function isReasoningModel(model: string): boolean {
  const m = model.toLowerCase();
  return (
    m.startsWith("o1") ||
    m.startsWith("o3") ||
    m.startsWith("o4") ||
    m.includes("-reasoning")
  );
}

/**
 * Checks whether Web Search is enabled for OpenAI queries.
 * Defaults to true unless explicitly disabled via OPENAI_WEB_SEARCH="false" or OPENAI_ENABLE_WEB_SEARCH="false".
 */
export function isOpenAiWebSearchEnabled(): boolean {
  if (process.env.OPENAI_WEB_SEARCH === "false" || process.env.OPENAI_ENABLE_WEB_SEARCH === "false") {
    return false;
  }
  return true;
}

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

  const effectiveModel = getEffectiveOpenAiModel();
  const webSearchEnabled = isOpenAiWebSearchEnabled();

  return {
    isConfigured,
    apiKeyConfigured: isConfigured,
    defaultModel: effectiveModel,
    webSearchEnabled,
    maskedKey,
    organization: process.env.OPENAI_ORG_ID || undefined,
    availableModels: [effectiveModel],
  };
}

/**
 * Returns an OpenAI client instance.
 * If an apiKey is provided, creates a client instance for that key; otherwise uses singleton.
 */
export function getOpenAIClient(apiKey?: string, organization?: string): OpenAI {
  if (apiKey && apiKey.trim() !== "") {
    return new OpenAI({
      apiKey: apiKey.trim(),
      organization: organization?.trim() || undefined,
    });
  }

  if (!openaiClient) {
    const envApiKey = process.env.OPENAI_API_KEY;
    if (!envApiKey) {
      throw new Error(
        "OpenAI API token is not configured. Please configure your personal OpenAI token in the AI Settings page."
      );
    }
    openaiClient = new OpenAI({
      apiKey: envApiKey,
      organization: process.env.OPENAI_ORG_ID || undefined,
    });
  }
  return openaiClient;
}

/**
 * Executes a chat completion or response and automatically records token usage and metrics into the log service.
 * Supports per-user API tokens and model configurations.
 * Uses OpenAI's Responses API with reasoning, web search, text formatting, and resilient fallback handling.
 */
export async function executeChatCompletion(params: {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  userIdentifier?: string;
  source?: string;
  temperature?: number;
  webSearch?: boolean;
  webSearchContextSize?: "low" | "medium" | "high";
  serviceTier?: "default" | "auto" | "flex" | "fast" | "priority" | "ultrafast";
  reasoningEffort?: "low" | "medium" | "high";
  stream?: boolean;
  apiKey?: string;
  organization?: string;
  userId?: string;
}): Promise<{
  completion: string;
  log: OpenAiMessageLog;
}> {
  const startTime = Date.now();
  let effectiveApiKey = params.apiKey?.trim();
  let effectiveOrg = params.organization?.trim();
  let model = params.model;
  let temperature = params.temperature;
  let reasoningEffort = params.reasoningEffort;
  let isWebSearch = params.webSearch;

  if (!effectiveApiKey && params.userId) {
    try {
      const userSettings = await UserAiSettingsService.getSettings(params.userId);
      if (userSettings?.apiKey) {
        effectiveApiKey = userSettings.apiKey.trim();
        if (!effectiveOrg && userSettings.organization) {
          effectiveOrg = userSettings.organization.trim();
        }
        if (!model && (userSettings.customModel || userSettings.defaultModel)) {
          model = userSettings.customModel || userSettings.defaultModel;
        }
        if (temperature === undefined && userSettings.temperature !== undefined) {
          temperature = userSettings.temperature;
        }
        if (reasoningEffort === undefined && userSettings.reasoningEffort !== undefined) {
          reasoningEffort = userSettings.reasoningEffort;
        }
        if (isWebSearch === undefined && userSettings.webSearchEnabled !== undefined) {
          isWebSearch = userSettings.webSearchEnabled;
        }
      }
    } catch (err) {
      console.warn("[OpenAI Service] Could not load user AI settings:", (err as Error).message);
    }
  }

  if (!effectiveApiKey && process.env.OPENAI_API_KEY) {
    effectiveApiKey = process.env.OPENAI_API_KEY.trim();
  }
  if (!effectiveApiKey) {
    effectiveApiKey = "";
  }
  if (!model) {
    model = getEffectiveOpenAiModel();
  }
  if (isWebSearch === undefined) {
    isWebSearch = isOpenAiWebSearchEnabled();
  }
  const source = params.source || "system";

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt });
  }
  messages.push({ role: "user", content: params.prompt });

  try {
    if (!effectiveApiKey || effectiveApiKey.startsWith("sk-test-") || effectiveApiKey.startsWith("mock-")) {
      // Graceful fallback for local development, test suite, or mock keys without making network calls
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
        rawPayload: { simulated: true, model, messages, webSearch: isWebSearch },
      });

      return { completion: mockCompletion, log };
    }

    const openai = getOpenAIClient(effectiveApiKey, params.organization);

    let content = "";
    let promptTokens = Math.round(params.prompt.length / 4);
    let completionTokens = 0;
    let totalTokens = promptTokens;
    let rawPayloadRecord: Record<string, unknown> = {};

    // 1. Primary execution via OpenAI Responses API with reasoning, web search, and structured text options
    let responsesSucceeded = false;

    try {
      const responsesInput: Array<{
        role: "user" | "system" | "developer";
        content: Array<{
          type: "input_text";
          text: string;
        }>;
      }> = [];

      if (params.systemPrompt) {
        responsesInput.push({
          role: "system",
          content: [
            {
              type: "input_text",
              text: params.systemPrompt,
            },
          ],
        });
      }

      responsesInput.push({
        role: "user",
        content: [
          {
            type: "input_text",
            text: params.prompt,
          },
        ],
      });

      const tools = isWebSearch
        ? [
            {
              type: "web_search" as const,
              user_location: {
                type: "approximate" as const,
              },
              search_context_size: params.webSearchContextSize || "medium",
            },
          ]
        : undefined;

      const modelIsReasoning = isReasoningModel(model);
      const hasCustomTemperature = typeof params.temperature === "number" && !modelIsReasoning;
      const shouldUseReasoning = modelIsReasoning || (params.reasoningEffort !== undefined && !hasCustomTemperature);

      const basePayload: Record<string, unknown> = {
        model,
        service_tier: params.serviceTier || "default",
        input: responsesInput,
        text: {
          format: {
            type: "text" as const,
          },
          verbosity: "medium" as const,
        },
        ...(tools && tools.length > 0 ? { tools } : {}),
        store: true,
      };

      const includeItems: string[] = [];
      if (isWebSearch) {
        includeItems.push("web_search_call.action.sources");
      }

      if (shouldUseReasoning) {
        basePayload.reasoning = {
          effort: params.reasoningEffort || "medium",
          mode: "standard" as const,
          summary: "auto" as const,
        };
        includeItems.push("reasoning.encrypted_content");
      } else if (hasCustomTemperature) {
        basePayload.temperature = params.temperature;
      }

      if (includeItems.length > 0) {
        basePayload.include = includeItems;
      }

      const executeResponsesCall = async (payload: Record<string, unknown>, isStream: boolean) => {
        if (isStream) {
          return await openai.responses.create({
            ...(payload as unknown as OpenAI.Responses.ResponseCreateParamsStreaming),
            stream: true,
          });
        }
        return await openai.responses.create({
          ...(payload as unknown as OpenAI.Responses.ResponseCreateParamsNonStreaming),
          stream: false,
        });
      };

      let responseOrStream: unknown;
      try {
        responseOrStream = await executeResponsesCall(basePayload, Boolean(params.stream));
      } catch (callErr: unknown) {
        const errMessage = (callErr instanceof Error ? callErr.message : String(callErr)).toLowerCase();
        const status = (callErr as { status?: number }).status;

        const isParamError =
          errMessage.includes("temperature") ||
          errMessage.includes("reasoning") ||
          errMessage.includes("unsupported parameter") ||
          status === 400;

        if (isParamError) {
          const sanitizedPayload = { ...basePayload };
          delete sanitizedPayload.temperature;
          delete sanitizedPayload.reasoning;
          const currentIncludes = sanitizedPayload.include;
          if (Array.isArray(currentIncludes)) {
            const filtered = (currentIncludes as string[]).filter(
              (inc) => !inc.startsWith("reasoning")
            );
            if (filtered.length > 0) {
              sanitizedPayload.include = filtered;
            } else {
              delete sanitizedPayload.include;
            }
          }
          responseOrStream = await executeResponsesCall(sanitizedPayload, Boolean(params.stream));
        } else {
          throw callErr;
        }
      }

      if (params.stream) {
        const stream = responseOrStream as AsyncIterable<{
          type?: string;
          delta?: string;
          response?: { output_text?: string; usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } };
        }>;
        let streamedText = "";
        for await (const event of stream) {
          if (event.type === "response.output_text.delta" && event.delta) {
            streamedText += event.delta;
          } else if (event.type === "response.completed" && event.response?.output_text) {
            streamedText = event.response.output_text;
            if (event.response.usage) {
              promptTokens = event.response.usage.input_tokens ?? promptTokens;
              completionTokens = event.response.usage.output_tokens ?? Math.round(streamedText.length / 4);
              totalTokens = event.response.usage.total_tokens ?? (promptTokens + completionTokens);
            }
          }
        }
        content = streamedText.trim();
        rawPayloadRecord = { mode: "responses_stream", model };
        responsesSucceeded = true;
      } else {
        const response = responseOrStream as OpenAI.Responses.Response;
        content = response.output_text?.trim() || "";

        if (!content && Array.isArray(response.output)) {
          for (const item of response.output) {
            if (item.type === "message" && Array.isArray(item.content)) {
              for (const part of item.content) {
                if (part.type === "output_text") {
                  content += part.text;
                }
              }
            }
          }
          content = content.trim();
        }

        if (response.usage) {
          promptTokens = response.usage.input_tokens ?? promptTokens;
          completionTokens = response.usage.output_tokens ?? Math.round(content.length / 4);
          totalTokens = response.usage.total_tokens ?? (promptTokens + completionTokens);
        } else {
          completionTokens = Math.round(content.length / 4);
          totalTokens = promptTokens + completionTokens;
        }

        rawPayloadRecord = response as unknown as Record<string, unknown>;
        responsesSucceeded = true;
      }
    } catch (responsesErr: unknown) {
      console.warn(
        `[OpenAI Service] Responses API attempt encountered error, falling back to chat completions: ${
          responsesErr instanceof Error ? responsesErr.message : String(responsesErr)
        }`
      );
    }

    // 2. Secondary fallback via standard chat completions if responses endpoint is unsupported
    if (!responsesSucceeded) {
      const requestPayload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model,
        messages,
      };
      if (typeof params.temperature === "number" && !isReasoningModel(model)) {
        requestPayload.temperature = params.temperature;
      }
      if (isWebSearch) {
        requestPayload.web_search_options = {
          search_context_size: params.webSearchContextSize || "medium",
        };
      }

      let chatResponse: OpenAI.Chat.Completions.ChatCompletion;
      try {
        chatResponse = await openai.chat.completions.create(requestPayload);
      } catch (err: unknown) {
        const errMessage = (err instanceof Error ? err.message : String(err)).toLowerCase();
        const status = (err as { status?: number }).status;

        const isTempError =
          requestPayload.temperature !== undefined &&
          (errMessage.includes("temperature") || status === 400);

        const isWebSearchError =
          requestPayload.web_search_options !== undefined &&
          (errMessage.includes("web_search") || errMessage.includes("search_options") || status === 400);

        if (isTempError || isWebSearchError) {
          if (isTempError) {
            delete requestPayload.temperature;
          }
          if (isWebSearchError) {
            delete requestPayload.web_search_options;
          }

          try {
            chatResponse = await openai.chat.completions.create(requestPayload);
          } catch (retryErr: unknown) {
            if (requestPayload.web_search_options !== undefined || requestPayload.temperature !== undefined) {
              delete requestPayload.temperature;
              delete requestPayload.web_search_options;
              chatResponse = await openai.chat.completions.create(requestPayload);
            } else {
              throw retryErr;
            }
          }
        } else {
          throw err;
        }
      }

      content = chatResponse.choices[0]?.message?.content?.trim() || "";
      promptTokens = chatResponse.usage?.prompt_tokens ?? promptTokens;
      completionTokens = chatResponse.usage?.completion_tokens ?? Math.round(content.length / 4);
      totalTokens = chatResponse.usage?.total_tokens ?? (promptTokens + completionTokens);
      rawPayloadRecord = chatResponse as unknown as Record<string, unknown>;
    }

    const durationMs = Date.now() - startTime;

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
      rawPayload: rawPayloadRecord,
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
 * Creates and returns an OpenAI Responses streaming generator configured with web search,
 * reasoning, and text formatting.
 */
export async function createOpenAiResponsesStream(params: {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  webSearch?: boolean;
  webSearchContextSize?: "low" | "medium" | "high";
  serviceTier?: "default" | "auto" | "flex" | "fast" | "priority" | "ultrafast";
  reasoningEffort?: "low" | "medium" | "high";
  apiKey?: string;
  organization?: string;
  userId?: string;
}) {
  let effectiveApiKey = params.apiKey?.trim();
  let effectiveOrg = params.organization?.trim();
  let model = params.model;
  let temperature = params.temperature;
  let reasoningEffort = params.reasoningEffort;
  let isWebSearch = params.webSearch;

  if (!effectiveApiKey && params.userId) {
    try {
      const userSettings = await UserAiSettingsService.getSettings(params.userId);
      if (userSettings?.apiKey) {
        effectiveApiKey = userSettings.apiKey.trim();
        if (!effectiveOrg && userSettings.organization) {
          effectiveOrg = userSettings.organization.trim();
        }
        if (!model && (userSettings.customModel || userSettings.defaultModel)) {
          model = userSettings.customModel || userSettings.defaultModel;
        }
        if (temperature === undefined && userSettings.temperature !== undefined) {
          temperature = userSettings.temperature;
        }
        if (reasoningEffort === undefined && userSettings.reasoningEffort !== undefined) {
          reasoningEffort = userSettings.reasoningEffort;
        }
        if (isWebSearch === undefined && userSettings.webSearchEnabled !== undefined) {
          isWebSearch = userSettings.webSearchEnabled;
        }
      }
    } catch (err) {
      console.warn("[OpenAI Service] Could not load user AI settings for stream:", (err as Error).message);
    }
  }

  const openai = getOpenAIClient(effectiveApiKey, effectiveOrg);
  if (!model) {
    model = getEffectiveOpenAiModel();
  }
  if (isWebSearch === undefined) {
    isWebSearch = isOpenAiWebSearchEnabled();
  }

  const input: Array<{
    role: "user" | "system" | "developer";
    content: Array<{
      type: "input_text";
      text: string;
    }>;
  }> = [];

  if (params.systemPrompt) {
    input.push({
      role: "system",
      content: [
        {
          type: "input_text",
          text: params.systemPrompt,
        },
      ],
    });
  }

  input.push({
    role: "user",
    content: [
      {
        type: "input_text",
        text: params.prompt,
      },
    ],
  });

  const tools = isWebSearch
    ? [
        {
          type: "web_search" as const,
          user_location: {
            type: "approximate" as const,
          },
          search_context_size: params.webSearchContextSize || "medium",
        },
      ]
    : undefined;

  const modelIsReasoning = isReasoningModel(model);
  const hasCustomTemperature = typeof params.temperature === "number" && !modelIsReasoning;
  const shouldUseReasoning = modelIsReasoning || (params.reasoningEffort !== undefined && !hasCustomTemperature);

  const payload: Record<string, unknown> = {
    model,
    service_tier: params.serviceTier || "default",
    input,
    text: {
      format: {
        type: "text",
      },
      verbosity: "medium",
    },
    ...(tools && tools.length > 0 ? { tools } : {}),
    stream: true,
    store: true,
  };

  const includeItems: string[] = [];
  if (isWebSearch) {
    includeItems.push("web_search_call.action.sources");
  }

  if (shouldUseReasoning) {
    payload.reasoning = {
      effort: params.reasoningEffort || "medium",
      mode: "standard",
      summary: "auto",
    };
    includeItems.push("reasoning.encrypted_content");
  } else if (hasCustomTemperature) {
    payload.temperature = params.temperature;
  }

  if (includeItems.length > 0) {
    payload.include = includeItems;
  }

  try {
    return await openai.responses.create(payload as unknown as OpenAI.Responses.ResponseCreateParamsStreaming);
  } catch (err: unknown) {
    const errMessage = (err instanceof Error ? err.message : String(err)).toLowerCase();
    const isParamError =
      errMessage.includes("temperature") ||
      errMessage.includes("reasoning") ||
      errMessage.includes("unsupported parameter") ||
      (err as { status?: number }).status === 400;

    if (isParamError) {
      delete payload.temperature;
      delete payload.reasoning;
      const currentIncludes = payload.include;
      if (Array.isArray(currentIncludes)) {
        const filtered = (currentIncludes as string[]).filter((i) => !i.startsWith("reasoning"));
        if (filtered.length > 0) {
          payload.include = filtered;
        } else {
          delete payload.include;
        }
      }
      return await openai.responses.create(payload as unknown as OpenAI.Responses.ResponseCreateParamsStreaming);
    }
    throw err;
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

/**
 * Generates an AI completion and responds in Telegram using Johan bot integration
 * to the user matched by name and surname.
 */
export async function respondToTelegramUserByName(params: {
  name?: string;
  surname?: string;
  fullName?: string;
  userEmail?: string;
  userId?: string;
  prompt: string;
  promptTitle?: string;
  scheduledTime?: string;
  systemPrompt?: string;
  temperature?: number;
  webSearch?: boolean;
}): Promise<{
  completion: string;
  log: OpenAiMessageLog;
  telegramDelivery: {
    sent: boolean;
    subscriber?: {
      chatId: number;
      firstName?: string;
      lastName?: string;
      username?: string;
    };
    error?: string;
    formattedMessage?: string;
  };
}> {
  const targetName = params.name || params.fullName;
  const userIdentifier = params.userEmail || params.userId || targetName || "telegram_user";

  // 1. Generate AI completion
  const aiResult = await executeChatCompletion({
    prompt: params.prompt,
    systemPrompt: params.systemPrompt,
    userIdentifier,
    userId: params.userId,
    source: "johan_bot_response",
    temperature: params.temperature,
    webSearch: params.webSearch,
  });

  // 2. Deliver via Johan Bot integration to user matched by name and surname
  const telegramResult = await TelegramService.sendAiPromptResponse({
    userIdentifier,
    userName: targetName,
    userSurname: params.surname,
    userEmail: params.userEmail,
    promptTitle: params.promptTitle,
    promptText: params.prompt,
    completion: aiResult.completion,
    scheduledTime: params.scheduledTime,
  });

  return {
    completion: aiResult.completion,
    log: aiResult.log,
    telegramDelivery: {
      sent: telegramResult.success,
      subscriber: telegramResult.subscriber
        ? {
            chatId: telegramResult.subscriber.chatId,
            firstName: telegramResult.subscriber.firstName,
            lastName: telegramResult.subscriber.lastName,
            username: telegramResult.subscriber.username,
          }
        : undefined,
      error: telegramResult.error,
      formattedMessage: telegramResult.formattedMessage,
    },
  };
}
