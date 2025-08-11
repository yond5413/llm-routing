/**
 * @file OpenAI provider adapter
 */

import OpenAI from "openai";
import { env } from "@/config/env";
import { LLMProvider, LLMResponse } from ".";
import { Logger } from "@/utils/logger";

const logger = new Logger("OpenAIProvider");

class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    logger.info("OpenAI client initialized.");
  }

  async callModel(modelName: string, prompt: string, opts?: Record<string, any>): Promise<LLMResponse> {
    const startTime = Date.now();
    logger.info(`Calling model ${modelName} via OpenAI`);

    try {
      const response = await this.client.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        ...opts,
      });

      const latencyMs = Date.now() - startTime;
      const text = response.choices[0]?.message?.content ?? "";
      const tokens_in = response.usage?.prompt_tokens ?? 0;
      const tokens_out = response.usage?.completion_tokens ?? 0;

      logger.info(`Model ${modelName} call successful`, { latency: latencyMs });

      return {
        text,
        tokens_in,
        tokens_out,
        latencyMs,
        rawResponse: response,
      };
    } catch (error) {
      logger.error(`Error calling OpenAI model ${modelName}`, { error });
      throw error; // Re-throw to be handled by the caller
    }
  }
}

export const openAIProvider = new OpenAIProvider();
