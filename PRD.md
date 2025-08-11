Thought for 4 seconds
PRD — LLM Routing & Benchmarking (GPT-5 vs Gemini-2.5) — Coding-Agent Focus
Version: 1.1
Owner: [Your Name]
Last updated: 2025-08-11

Purpose: a developer-friendly, copy-paste PRD that a coding agent or SWE can use to start implementing a Next.js-based LLM router and benchmark harness that compares OpenAI GPT-5 variants with Google Gemini-2.5 family. Emphasis on code-generation workflows and making routing decisions that balance quality / cost / latency.

1 — Summary / Objectives
Build an MVP routing service that:

Classifies incoming prompts into task types (code, summarization, QA, other).

Routes code prompts to candidate high-quality models (GPT-5 family, Gemini-2.5 family) or cheaper fallbacks based on user priority.

Records metadata (latency, tokens, cost estimate, model used) locally for analysis.

Provide a Next.js web UI for manual prompt testing + a benchmark runner (HumanEval, MBPP, CNN/DailyMail, SQuAD).

Produce evaluation reports (Pass@k, ROUGE, F1/EM) and a routing policy tuned to maximize quality per $.

2 — Scope (what this PRD covers)
In scope (Phase 1):

Local small LLM for task classification (phi-3-mini / MiniLM / LLaMA-family small).

Provider integration layer for OpenAI and Google (manual API keys you manage).

Routing logic and a configurable priority (cost / latency / quality).

Benchmarks: HumanEval, MBPP (for code), CNN/DailyMail (summarization), SQuAD v2 (QA).

Local metadata store (JSON or SQLite via Prisma).

Next.js frontend to run prompts and view metrics.

Out of scope (Phase 1):

Production-grade autoscaling, enterprise billing, or multi-tenant concerns.

Training/fine-tuning heavy models (future phase).

Replacing OpenRouter / provider aggregation (this comes later).

3 — Key Models (to include in comparisons)
Use these specific model names when wiring provider calls and tests.

OpenAI (GPT-5 family & supporting models)

gpt-5-pro — flagship high-capability (use for “quality” routes)

gpt-5 — default large; high-capability

gpt-5-mini — medium tradeoff

gpt-5-nano — cheap/fast fallback

gpt-4.1 / gpt-4o family — comparative baselines

gpt-3.5-turbo — classification / lowest-cost fallback (if supported)

Google (Gemini-2.5 family)

gemini-2.5-pro — top reasoning/coding

gemini-2.5-pro-vision — multimodal if needed

gemini-2.5-flash — low-latency high-quality

gemini-2.5-flash-lite — lower-cost fast variant

gemini-2.0-flash — backwards-compatible baseline

Note: use provider SDK/api names exactly as published; abstract via adapters so names can change without breaking code.

4 — Success Metrics
Quality (code): Pass@1, Pass@10 on HumanEval & MBPP. Target: within X% of top-tier baseline while keeping cost < Y.

Quality (other): ROUGE-L for summarization; Exact Match & F1 for SQuAD.

Cost: $ per successful solved prompt (aggregate). Target: < 30% cost of “always use highest model” baseline.

Latency: P50/P95 latency per model type.

Escalation Rate: % of requests escalated from cheap → expensive model.

Coverage: % prompts answered within user latency budget.

5 — Data model / local metadata schema
Store locally in metadata/requests.sqlite or metadata/requests.json with fields:

json
Copy
Edit
{
  "id": "uuid",
  "user_id": "optional",
  "prompt": "...",
  "task_type": "code_generation|summarization|qa|other",
  "classifier_confidence": 0.0,
  "model_requested": "gpt-5",
  "model_used": "gpt-5-pro",
  "provider": "openai|google",
  "tokens_in": 123,
  "tokens_out": 456,
  "estimated_cost_usd": 0.0123,
  "latency_ms": 450,
  "result_summary": "...",    // short string or metrics reference
  "human_score": null,        // optional manual eval
  "created_at": "ISO timestamp"
}
6 — High-level architecture & components
swift
Copy
Edit
Next.js (App Router)
 ├─ /app/page.tsx (UI)
 ├─ /app/api/classify/route.ts  // runs local small LLM
 ├─ /app/api/routeTask/route.ts // core router => selects provider & model
 └─ lib/
     ├─ router.ts               // routing logic + policy
     ├─ providers/
     │   ├─ openai.ts
     │   └─ google_gemini.ts
     ├─ classifier/              // small local model interface
     └─ storage.ts               // local metadata (JSON/Prisma)
scripts/
 ├─ run-benchmark.js            // runs datasets & logs results
benchmarks/
 ├─ humaneval/
 ├─ mbpp/
 └─ cnn_dailymail/
7 — Routing logic (detailed enough for coder)
Inputs: prompt, optional task_type_override, priority ∈ {cost,latency,quality}, latency_budget_ms

Pre-steps:

Run local classifier → returns (task_type, confidence).

If task_type_override provided, use it.

Routing decision (pseudocode):

ts
Copy
Edit
// routing table populated from benchmark metrics (est_q and est_cost)
candidates = routingTable[task_type]  // list of models with metadata

if (priority == "quality") {
  // candidate with highest est_quality that meets latency_budget
  m = argmax(candidates.filter(l_m <= latency_budget), est_q)
} else if (priority == "latency") {
  m = argmin(candidates, latency_est)
} else { // cost
  // maximize quality / cost ratio subject to latency
  m = argmax(candidates.filter(l_m <= latency_budget), est_q / est_cost)
}

// Two-pass check
if (classification_confidence < CONF_THRESH) {
  // Option: do cheap pass with fallback model to get quick answer & quality proxy
  cheap = fallbackModelFor(task_type)
  cheapResult = callModel(cheap)
  if (cheapResult.quality_estimate >= PASS_SCORE) return cheapResult
  // else escalate to chosen m
}

result = callModel(m)
log(metadata)
return result
Notes:

est_q (expected quality) and est_cost are derived from offline benchmarks and rolling telemetry. Use exponential smoothing.

Token cost estimation: use tiktoken or provider tokenizers to estimate tokens before calling.

When provider quota/exception occurs, fallback to next cheaper model; mark model_used accordingly.

8 — Benchmarking plan (technical)
Datasets & metrics:

HumanEval + MBPP → run prompt → execute returned code in isolated container/sandbox → compute Pass@k.

CNN/DailyMail → ROUGE-1/2/L.

SQuAD v2 → Exact Match (EM) & F1.

Additional: random sample of real user prompts for manual scoring.

Runner

Script: scripts/run-benchmark.js or TS that:

Loads dataset (HF datasets or local copies).

For each example, calls selected models via provider adapters (OpenAI + Gemini).

Saves raw responses + token counts + latency.

Post-processes to compute metrics (use rouge libs, code execution harness for code tasks).

Store results under benchmarks/results/{model}.{dataset}.json.

Compute Pass@k

For code tasks, run N completions per prompt (e.g., 10), execute tests, compute pass rate.

9 — API endpoints (Next.js) — signatures
POST /api/classify
Body: { prompt: string }
Response: { task_type: string, confidence: number }

POST /api/routeTask
Body: { prompt: string, priority?: "cost"|"latency"|"quality", latencyBudgetMs?: number }
Response: { modelRequested, provider, modelUsed, response, tokensIn, tokensOut, latencyMs, estimatedCostUsd }

GET /api/reports
Response: aggregated metrics, escalation rate, cost per task type.

10 — Provider adapters (implementation details)
Each adapter must implement callModel(modelName, prompt, opts) and return { text, tokens_in, tokens_out, latencyMs, rawResponse }.

OpenAI adapter: use official OpenAI SDK; handle model names: gpt-5-pro, gpt-5, gpt-5-mini, gpt-4.1, gpt-4o.

Use response.streaming when available for UI responsiveness.

Google Gemini adapter: use Google Cloud/Vertex AI or Gemini API endpoints; models: gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite.

Add retry/backoff and quota-aware logic.

11 — Cost & token estimation approach
Use tiktoken or provider tokenizer to estimate tokens from prompt + estimated response length.

Multiply by provider $/1k tokens (configurable per provider/model).

Add small overhead factor (1.1) to be conservative.

12 — Local dev / env variables
env
Copy
Edit
OPENAI_API_KEY=
GOOGLE_GEMINI_API_KEY=
OPENAI_DEFAULT_MODEL=gpt-5-mini
DEFAULT_LATENCY_BUDGET_MS=1000
METADATA_STORE=./metadata/requests.json
13 — Testing, security, and safety
Sandbox code execution for HumanEval/MBPP in containerized environment (no network, limited CPU/time).

Content moderation: run model outputs through moderation endpoints (OpenAI moderation API or custom safety checks).

Rate limiting & request size caps at API route level.

Secrets in .env.local only; do not commit.

14 — Deliverables & milestones (2–3 week sprint)
Week 0–1:

Create Next.js app scaffold, provider adapters, classifier endpoint (local model).

Implement POST /api/routeTask with simple routing table and OpenAI + Gemini adapters.

Local metadata store & results viewer.

Week 2:

Implement benchmark runner for HumanEval (code pipeline, sandbox execution).

Run initial benchmark across chosen GPT/Gemini models; produce report.

Add decision logic using est_q / est_cost and configure thresholds.

Week 3 (stretch):

Expand benchmarking to CNN/DailyMail and SQuAD.

Add caching/semantic cache (Redis) and automatic fallback on quota.

Package routing function as NPM module (export classifyPrompt + routePrompt).

15 — NPM packaging notes (bonus)
Create packages/router that exports:

classifyPrompt(prompt) — calls the small local classifier.

routePrompt(prompt, { priority, latencyBudget }) — returns a plan and optionally executes.

Keep credentials out of package. Package should accept provider client instances injected by the integrator.

16 — Actionable next step (what I can produce now)
Pick one and I’ll generate it immediately:

Next.js starter repo skeleton (TS) with OpenAI + Gemini adapters + local classifier stub.

router.ts implementation (TypeScript) including decision function & pseudocode turned into runnable code.

Benchmark runner script for HumanEval (with safe execution harness outline).