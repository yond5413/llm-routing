
import { TaskCategory } from "./classification";
import { openAIProvider } from "./providers/openai";
import { googleProvider } from "./providers/google";
import { LLMResponse } from "./providers";
import { Logger } from "@/utils/logger";

const logger = new Logger("Routing");

// --- Types based on PRD ---
type Priority = "cost" | "latency" | "quality";

interface RouteParams {
  prompt: string;
  task_type: TaskCategory;
  priority: Priority;
  latency_budget_ms?: number;
  task_type_override?: TaskCategory;
  classification_confidence?: number;
}

interface ModelCandidate {
  name: string;
  provider: "openai" | "google";
  est_quality: number; // 1-10 scale
  est_cost_per_1k_tokens: number; // in USD
  latency_est: number; // in ms
  fallback: string | null;
}

// --- Routing Table based on PRD section 3 & 7 ---
// Placeholder values for est_quality, est_cost, and latency_est
const routingTable: Record<TaskCategory, ModelCandidate[]> = {
  "Code Generation": [
    { name: "gpt-5-pro", provider: "openai", est_quality: 10, est_cost_per_1k_tokens: 0.03, latency_est: 1500, fallback: "gpt-5" },
    { name: "gemini-2.5-pro", provider: "google", est_quality: 10, est_cost_per_1k_tokens: 0.03, latency_est: 1400, fallback: "gemini-2.5-flash" },
    { name: "gpt-5", provider: "openai", est_quality: 9, est_cost_per_1k_tokens: 0.015, latency_est: 1200, fallback: "gpt-5-mini" },
  ],
  "Text Summarization": [
    { name: "gemini-2.5-flash", provider: "google", est_quality: 8, est_cost_per_1k_tokens: 0.002, latency_est: 500, fallback: "gemini-2.0-flash" },
    { name: "gpt-5-mini", provider: "openai", est_quality: 8, est_cost_per_1k_tokens: 0.003, latency_est: 600, fallback: "gpt-4o" },
  ],
  "Question Answering": [
    { name: "gpt-5-pro", provider: "openai", est_quality: 10, est_cost_per_1k_tokens: 0.03, latency_est: 1500, fallback: "gpt-5" },
    { name: "gemini-2.5-pro", provider: "google", est_quality: 10, est_cost_per_1k_tokens: 0.03, latency_est: 1400, fallback: "gemini-2.5-flash" },
  ],
  "Creative Writing": [
    { name: "gpt-5-pro", provider: "openai", est_quality: 10, est_cost_per_1k_tokens: 0.03, latency_est: 1500, fallback: "gpt-5" },
  ],
  "Other": [
    { name: "gpt-5-nano", provider: "openai", est_quality: 6, est_cost_per_1k_tokens: 0.001, latency_est: 300, fallback: null },
    { name: "gemini-2.5-flash-lite", provider: "google", est_quality: 6, est_cost_per_1k_tokens: 0.001, latency_est: 250, fallback: null },
  ],
};

// --- Core Routing Logic based on PRD section 7 ---
export async function routeAndExecute(params: RouteParams): Promise<LLMResponse> {
  const { prompt, task_type, priority, latency_budget_ms } = params;
  logger.info(`Routing request for task: ${task_type}, priority: ${priority}`);

  let candidates = routingTable[task_type] || routingTable["Other"];

  // 1. Filter by latency budget if provided
  if (latency_budget_ms) {
    candidates = candidates.filter(c => c.latency_est <= latency_budget_ms);
    if (candidates.length === 0) {
      logger.warn(`No candidates meet the latency budget of ${latency_budget_ms}ms. Considering all models for the task.`);
      candidates = routingTable[task_type] || routingTable["Other"]; // Reset if none match
    }
  }

  // 2. Select the best candidate based on priority
  let selectedModel: ModelCandidate | undefined;

  if (priority === "quality") {
    selectedModel = candidates.reduce((prev, curr) => (prev.est_quality > curr.est_quality ? prev : curr));
  } else if (priority === "latency") {
    selectedModel = candidates.reduce((prev, curr) => (prev.latency_est < curr.latency_est ? prev : curr));
  } else { // "cost"
    selectedModel = candidates.reduce((prev, curr) => {
      const prevScore = prev.est_quality / prev.est_cost_per_1k_tokens;
      const currScore = curr.est_quality / curr.est_cost_per_1k_tokens;
      return prevScore > currScore ? prev : curr;
    });
  }

  if (!selectedModel) {
    logger.error("Could not select a model. Defaulting to fallback.");
    selectedModel = routingTable["Other"][0];
  }

  logger.info(`Selected model: ${selectedModel.name} from ${selectedModel.provider}`);

  // 3. Execute the call
  const provider = selectedModel.provider === "openai" ? openAIProvider : googleProvider;
  try {
    const result = await provider.callModel(selectedModel.name, prompt);
    return result;
  } catch (error) {
    logger.error(`Initial model call failed for ${selectedModel.name}.`, { error });
    if (selectedModel.fallback) {
      logger.info(`Attempting fallback to ${selectedModel.fallback}`);
      const fallbackProvider = selectedModel.provider === "openai" ? openAIProvider : googleProvider; // Assuming fallback is from the same provider for now
      return fallbackProvider.callModel(selectedModel.fallback, prompt);
    }
    throw new Error("Model execution failed and no fallback was available.");
  }
}
