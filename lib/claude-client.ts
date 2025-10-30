import Anthropic from "@anthropic-ai/sdk";

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Default model configuration
const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
const DEFAULT_MAX_TOKENS = 1024;

// Rate limiting configuration
const RATE_LIMIT_DELAY_MS = 100; // Minimum delay between requests
let lastRequestTime = 0;

/**
 * Rate-limited wrapper for Claude API calls
 */
async function rateLimitedRequest<T>(
  requestFn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
  return requestFn();
}

/**
 * Send a message to Claude and get a response
 */
export async function sendMessage(
  messages: Anthropic.MessageParam[],
  options?: {
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
    temperature?: number;
  }
): Promise<Anthropic.Message> {
  try {
    return await rateLimitedRequest(async () => {
      const response = await anthropic.messages.create({
        model: options?.model || DEFAULT_MODEL,
        max_tokens: options?.maxTokens || DEFAULT_MAX_TOKENS,
        messages,
        ...(options?.systemPrompt && { system: options.systemPrompt }),
        ...(options?.temperature !== undefined && {
          temperature: options.temperature,
        }),
      });

      return response;
    });
  } catch (error: any) {
    console.error("Claude API error:", error);

    // Handle specific error types
    if (error.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    if (error.status === 401) {
      throw new Error("Invalid API key. Please check your configuration.");
    }

    if (error.status === 500) {
      throw new Error("Claude API service error. Please try again later.");
    }

    throw new Error(`Claude API error: ${error.message || "Unknown error"}`);
  }
}

/**
 * Extract text content from Claude's response
 */
export function extractTextContent(message: Anthropic.Message): string {
  const textContent = message.content.find(
    (block) => block.type === "text"
  ) as Anthropic.TextBlock | undefined;

  return textContent?.text || "";
}

/**
 * Parse JSON from Claude's response
 */
export function extractJsonContent<T = any>(message: Anthropic.Message): T {
  const text = extractTextContent(message);

  // Try to find JSON in the response (Claude sometimes wraps it in markdown)
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("No JSON found in Claude response");
  }

  const jsonString = jsonMatch[1] || jsonMatch[0];

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error("Failed to parse JSON from Claude response");
  }
}

/**
 * Health check for Claude API
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await sendMessage(
      [
        {
          role: "user",
          content: "Respond with OK",
        },
      ],
      {
        maxTokens: 10,
      }
    );

    const text = extractTextContent(response);
    return text.toLowerCase().includes("ok");
  } catch (error) {
    console.error("Claude health check failed:", error);
    return false;
  }
}

export default anthropic;
