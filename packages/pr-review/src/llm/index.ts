import type { LLMAdapter, LLMAdapterConfig } from "./adapter.js";
import { ClaudeAdapter } from "./claude.js";
import { OpenAIAdapter } from "./openai.js";
import { AzureOpenAIAdapter } from "./azure-openai.js";

export type LLMProvider = "claude" | "openai" | "azure-openai";

export function createLLMAdapter(provider: LLMProvider, config: LLMAdapterConfig): LLMAdapter {
  switch (provider) {
    case "claude":
      return new ClaudeAdapter(config);
    case "openai":
      return new OpenAIAdapter(config);
    case "azure-openai":
      return new AzureOpenAIAdapter(config);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export type { LLMAdapter, LLMAdapterConfig } from "./adapter.js";
export type { ReviewPrompt, ReviewResult, ReviewIssue, Severity } from "./types.js";
