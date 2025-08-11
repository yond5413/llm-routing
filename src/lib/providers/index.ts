/**
 * @file Defines the common interface for all LLM providers.
 */

// Based on PRD section 10
export interface LLMProvider {
  callModel(modelName: string, prompt: string, opts?: Record<string, any>): Promise<LLMResponse>;
}

export interface LLMResponse {
  text: string;
  tokens_in: number;
  tokens_out: number;
  latencyMs: number;
  rawResponse: any;
}
