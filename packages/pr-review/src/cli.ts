#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { config } from "dotenv";

// Load environment variables
config();

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
  console.log("PR Review CLI");
  console.log("=============");
  console.log(`Organization: ${argv.org}`);
  console.log(`Project: ${argv.project}`);
  console.log(`PR: ${argv.pr}`);
  console.log(`Provider: ${argv.provider}`);
  console.log(`Dry run: ${argv.dryRun}`);

  // TODO: Implement review logic
  console.log("\n[Not yet implemented]");
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
