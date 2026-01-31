#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { config as loadEnv } from "dotenv";
import chalk from "chalk";
import { loadConfig } from "./config.js";
import { PRReviewer } from "./reviewer.js";

// Load environment variables
loadEnv();

const argv = yargs(hideBin(process.argv))
  .scriptName("pr-review")
  .usage("Usage: $0 --org <org> --project <project> --pr <id>")
  .option("org", {
    alias: "o",
    describe: "Azure DevOps organization name",
    type: "string",
    demandOption: true,
  })
  .option("project", {
    alias: "p",
    describe: "Azure DevOps project name",
    type: "string",
    demandOption: true,
  })
  .option("pr", {
    describe: "Pull request ID",
    type: "number",
    demandOption: true,
  })
  .option("repo", {
    alias: "r",
    describe: "Repository name or ID (defaults to project name)",
    type: "string",
  })
  .option("provider", {
    describe: "LLM provider to use",
    choices: ["claude", "azure-openai", "openai"] as const,
    default: "claude" as const,
  })
  .option("model", {
    alias: "m",
    describe: "Model to use (provider-specific)",
    type: "string",
  })
  .option("dry-run", {
    describe: "Show review without posting comments",
    type: "boolean",
    default: false,
  })
  .option("config", {
    alias: "c",
    describe: "Path to config file",
    type: "string",
  })
  .help()
  .version()
  .parseSync();

async function main() {
  console.log(chalk.bold("PR Review CLI"));
  console.log(chalk.dim("=============\n"));

  try {
    // Load configuration
    const config = loadConfig({
      provider: argv.provider,
      model: argv.model,
      config: argv.config,
    });

    // Create reviewer
    const reviewer = new PRReviewer(config, argv.org, argv.project);

    // Run review
    const { result, postedComments, summaryPosted } = await reviewer.review({
      organization: argv.org,
      project: argv.project,
      repositoryId: argv.repo || argv.project,
      pullRequestId: argv.pr,
      dryRun: argv.dryRun,
    });

    // Print summary
    console.log("\n" + chalk.bold("Result:"));
    const issues = result.issues || [];
    const blockCount = issues.filter((i) => i.severity === "BLOCK").length;
    const highCount = issues.filter((i) => i.severity === "HIGH").length;
    const mediumCount = issues.filter((i) => i.severity === "MEDIUM").length;

    const blockText = blockCount > 0 ? chalk.red(`${blockCount} BLOCK`) : chalk.green("0 BLOCK");
    const highText = highCount > 0 ? chalk.yellow(`${highCount} HIGH`) : chalk.green("0 HIGH");
    const mediumText = `${mediumCount} MEDIUM`;

    console.log(`${blockText} | ${highText} | ${mediumText}`);

    if (!argv.dryRun) {
      console.log(chalk.dim(`\nPosted ${postedComments} inline comments`));
      if (summaryPosted) {
        console.log(chalk.dim("Summary comment posted"));
      }
    }

    // Exit code based on blockers
    process.exit(blockCount > 0 ? 1 : 0);
  } catch (error) {
    console.error(chalk.red("\nError:"), error instanceof Error ? error.message : error);
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(chalk.red("\nFatal Error:"), error instanceof Error ? error.message : String(error));
  process.exit(2);
});
