import { z } from "zod";
import { Logger } from "@/utils/logger";

const logger = new Logger("Config:Env");

// Schema for environment variables based on PRD
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  OPENAI_API_KEY: z.string().min(1),
  GOOGLE_GEMINI_API_KEY: z.string().min(1),
  OPENAI_DEFAULT_MODEL: z.string().default("gpt-5-mini"),
  DEFAULT_LATENCY_BUDGET_MS: z.coerce.number().default(1000),
  METADATA_STORE: z.string().default("./metadata/requests.json"),
});

// Function to validate environment variables
const validateEnv = () => {
  try {
    logger.info("Validating environment variables");
    const parsed = envSchema.parse(process.env);
    logger.info("Environment variables validated successfully");
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join("."));
      logger.error("Invalid environment variables", { error: { missingVars } });
      throw new Error(
        `❌ Invalid environment variables: ${missingVars.join(
          ", "
        )}. Please check your .env file. You may need to create a .env.local file based on .env.example.`
      );
    }
    throw error;
  }
};

export const env = validateEnv();
