/**
 * @file API route for executing a routed prompt.
 * Corresponds to the PRD's /api/routeTask endpoint.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyPrompt } from "@/lib/classification";
import { routeAndExecute } from "@/lib/routing";
import { Logger } from "@/utils/logger";

const logger = new Logger("API:Execute");

const executeRequestSchema = z.object({
  prompt: z.string(),
  priority: z.enum(["cost", "latency", "quality"]).default("quality"),
  latencyBudgetMs: z.number().optional(),
});

export async function POST(request: Request) {
  logger.info("Received request to /api/execute");
  try {
    const json = await request.json();
    const { prompt, priority, latencyBudgetMs } = executeRequestSchema.parse(json);

    // 1. Classify the prompt
    const task_type = await classifyPrompt(prompt);
    logger.info(`Prompt classified as: ${task_type}`);

    // 2. Route and execute
    const result = await routeAndExecute({
      prompt,
      task_type,
      priority,
      latency_budget_ms: latencyBudgetMs,
    });

    // 3. Return the result
    return NextResponse.json(result);

  } catch (error) {
    logger.error("Error in /api/execute", { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
