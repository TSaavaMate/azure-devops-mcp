import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import chalk from "chalk";

const DEFAULT_CONFIG = {
  azureDevOps: {
    pat: "${AZURE_DEVOPS_PAT}",
    defaultOrg: "",
    defaultProject: "",
  },
  llm: {
    provider: "claude",
    model: "claude-sonnet-4-20250514",
  },
  rules: {
    path: "./rules/pr-review.md",
    cleanCodeGuide: "./rules/clean-code-dotnet.md",
  },
};

export function initConfig(location: "local" | "global" = "global"): void {
  let configPath: string;
  let configDir: string;

  if (location === "local") {
    configDir = process.cwd();
    configPath = join(configDir, ".pr-review.json");
  } else {
    configDir = join(homedir(), ".pr-review");
    configPath = join(configDir, "config.json");
  }

  if (existsSync(configPath)) {
    console.log(chalk.yellow(`Config already exists at ${configPath}`));
    return;
  }

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  console.log(chalk.green(`Created config at ${configPath}`));
  console.log(chalk.dim("\nNext steps:"));
  console.log("1. Set AZURE_DEVOPS_PAT environment variable");
  console.log("2. Set your LLM API key (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)");
  console.log("3. Update defaultOrg and defaultProject in config");
}
