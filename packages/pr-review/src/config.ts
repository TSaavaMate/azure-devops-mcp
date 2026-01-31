import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const LLMProviderSchema = z.enum(["claude", "azure-openai", "openai"]);
type LLMProvider = z.infer<typeof LLMProviderSchema>;

const ConfigSchema = z.object({
  azureDevOps: z.object({
    pat: z.string().min(1, "AZURE_DEVOPS_PAT is required"),
    defaultOrg: z.string().optional(),
    defaultProject: z.string().optional(),
  }),
  llm: z.object({
    provider: LLMProviderSchema,
    apiKey: z.string().min(1, "LLM API key is required"),
    model: z.string().optional(),
    endpoint: z.string().optional(),
  }),
  rules: z
    .object({
      path: z.string().optional(),
      cleanCodeGuide: z.string().optional(),
    })
    .optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

interface CLIOverrides {
  provider?: LLMProvider;
  model?: string;
  config?: string;
}

export function loadConfig(overrides: CLIOverrides): Config {
  let fileConfig: Partial<Config> = {};

  const configPaths = [overrides.config, ".pr-review.json", join(homedir(), ".pr-review", "config.json")].filter(Boolean) as string[];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        fileConfig = JSON.parse(content);
        break;
      } catch {
        // Ignore invalid config files
      }
    }
  }

  const provider = overrides.provider || (fileConfig.llm?.provider as LLMProvider) || "claude";
  const apiKey = getApiKey(provider, fileConfig.llm?.apiKey);

  const config: Config = {
    azureDevOps: {
      pat: process.env.AZURE_DEVOPS_PAT || fileConfig.azureDevOps?.pat || "",
      defaultOrg: fileConfig.azureDevOps?.defaultOrg,
      defaultProject: fileConfig.azureDevOps?.defaultProject,
    },
    llm: {
      provider,
      apiKey,
      model: overrides.model || fileConfig.llm?.model || getDefaultModel(provider),
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || fileConfig.llm?.endpoint,
    },
    rules: fileConfig.rules,
  };

  return ConfigSchema.parse(config);
}

function getApiKey(provider: LLMProvider, fileApiKey?: string): string {
  switch (provider) {
    case "claude":
      return process.env.ANTHROPIC_API_KEY || fileApiKey || "";
    case "openai":
      return process.env.OPENAI_API_KEY || fileApiKey || "";
    case "azure-openai":
      return process.env.AZURE_OPENAI_API_KEY || fileApiKey || "";
  }
}

function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case "claude":
      return "claude-sonnet-4-20250514";
    case "openai":
      return "gpt-4o";
    case "azure-openai":
      return "gpt-4o";
  }
}
