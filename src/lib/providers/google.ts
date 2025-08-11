/**
 * @file Google Gemini provider adapter
 */

import { LLMProvider, LLMResponse } from ".";
import { Logger } from "@/utils/logger";

const logger = new Logger("GoogleProvider");

class GoogleProvider implements LLMProvider {
  constructor() {
    // TODO: Initialize Google Gemini client using GOOGLE_GEMINI_API_KEY
    logger.info("Google Gemini client to be initialized.");
  }

  async callModel(modelName: string, prompt: string, opts?: Record<string, any>): Promise<LLMResponse> {
    logger.warn("Google Gemini provider is not yet implemented.");
    // TODO: Implement call to Google Gemini API
    return Promise.resolve({
      text: "",
      tokens_in: 0,
      tokens_out: 0,
      latencyMs: 0,
      rawResponse: null,
    });
  }
}

export const googleProvider = new GoogleProvider();
