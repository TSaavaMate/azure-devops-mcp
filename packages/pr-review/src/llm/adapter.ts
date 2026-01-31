import type { ReviewPrompt, ReviewResult } from "./types.js";

export interface LLMAdapter {
  review(prompt: ReviewPrompt): Promise<ReviewResult>;
}

export interface LLMAdapterConfig {
  apiKey: string;
  model: string;
  endpoint?: string;
}
