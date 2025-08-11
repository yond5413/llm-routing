
import { z } from 'zod';

// Schema for environment variables
const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OpenRouter API key is required'),
});

// This will throw an error if the env var is not set, which is good for failing fast.
const env = envSchema.parse(process.env);

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

interface ChatCompletionPayload {
  model: string;
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  stream?: boolean;
}

export class OpenRouter {
  private apiKey: string;

  constructor() {
    this.apiKey = env.OPENROUTER_API_KEY;
    if (this.apiKey === 'your_api_key_here' || !this.apiKey) {
      console.warn('OpenRouter API key is not configured. Please replace the placeholder in .env.local');
    }
  }

  async chatCompletion(payload: ChatCompletionPayload): Promise<{ choice: string; latency: number }> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter free tier
          'X-Title': 'LLM Router', // Required by OpenRouter free tier
        },
        body: JSON.stringify(payload),
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      const choice = data.choices[0]?.message?.content?.trim() ?? '';

      return { choice, latency };
    } catch (error) {
      console.error('Error calling OpenRouter API:', error);
      throw error;
    }
  }
}

export const openRouter = new OpenRouter();
