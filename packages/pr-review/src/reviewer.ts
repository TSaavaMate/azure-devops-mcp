import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { AzureDevOpsClient, PullRequestFetcher, CommentPoster, createPatAuthenticator } from "@azure-devops/core";
import { createLLMAdapter, type LLMProvider } from "./llm/index.js";
import type { ReviewResult, ReviewIssue } from "./llm/types.js";
import type { Config } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ReviewOptions {
  organization: string;
  project: string;
  repositoryId: string;
  pullRequestId: number;
  dryRun: boolean;
}

export interface ReviewOutput {
  result: ReviewResult;
  postedComments: number;
  summaryPosted: boolean;
}

export class PRReviewer {
  private config: Config;
  private client: AzureDevOpsClient;
  private fetcher: PullRequestFetcher;
  private poster: CommentPoster;

  constructor(config: Config, organization: string, project: string) {
    this.config = config;
    this.client = new AzureDevOpsClient({
      organization,
      getToken: createPatAuthenticator(),
    });
    this.fetcher = new PullRequestFetcher(this.client, project);
    this.poster = new CommentPoster(this.client, project);
  }

  async review(options: ReviewOptions): Promise<ReviewOutput> {
    // 1. Fetch PR diff
    console.log(`Fetching PR #${options.pullRequestId}...`);
    const prDiff = await this.fetcher.fetchFullDiff(options.repositoryId, options.pullRequestId);
    console.log(`Found ${prDiff.files.length} changed files`);

    // 2. Load review rules
    const rules = this.loadRules();

    // 3. Send to LLM
    console.log(`Analyzing with ${this.config.llm.provider}...`);
    const llm = createLLMAdapter(this.config.llm.provider as LLMProvider, {
      apiKey: this.config.llm.apiKey,
      model: this.config.llm.model || "claude-sonnet-4-20250514",
      endpoint: this.config.llm.endpoint,
    });

    let result: ReviewResult;
    try {
      result = await llm.review({
        prMetadata: {
          id: prDiff.pr.id,
          title: prDiff.pr.title,
          description: prDiff.pr.description,
          sourceBranch: prDiff.pr.sourceBranch,
          targetBranch: prDiff.pr.targetBranch,
          author: prDiff.pr.author.displayName,
        },
        diffs: prDiff.diffs.map((d) => ({ path: d.path, diff: d.diff })),
        rules,
        cleanCodeGuide: this.loadCleanCodeGuide(),
      });
    } catch (error) {
      throw new Error(
        `Failed to analyze PR with ${this.config.llm.provider}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // 4. Post comments (unless dry run)
    let postedComments = 0;
    let summaryPosted = false;

    if (!options.dryRun) {
      console.log("\nPosting comments...");
      for (const issue of result.issues) {
        try {
          await this.poster.postInlineComment(options.repositoryId, options.pullRequestId, {
            filePath: issue.file,
            line: issue.line,
            content: this.formatComment(issue),
          });
          postedComments++;
          console.log(`  • ${issue.severity}: ${issue.category} (${issue.file}:${issue.line})`);
        } catch (error) {
          console.error(`  ✗ Failed to post comment at ${issue.file}:${issue.line}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      try {
        await this.poster.postSummaryComment(options.repositoryId, options.pullRequestId, { content: result.summary });
        summaryPosted = true;
        console.log("📝 Summary posted.");
      } catch (error) {
        console.error(`✗ Failed to post summary comment: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log("\nDry run - would post these comments:");
      for (const issue of result.issues) {
        console.log(`  [${issue.severity}] ${issue.category} (${issue.file}:${issue.line})`);
        console.log(`    ${issue.message}`);
        console.log(`    Fix: ${issue.fix}\n`);
      }
      console.log(`Summary: ${result.summary}`);
    }

    return { result, postedComments, summaryPosted };
  }

  private loadRules(): string {
    const rulesPath = this.config.rules?.path || join(__dirname, "rules", "pr-review.md");

    if (existsSync(rulesPath)) {
      return readFileSync(rulesPath, "utf-8");
    }

    console.warn(`⚠ Rules file not found at ${rulesPath}, using default rules`);
    return "Review for code quality, security issues, and best practices.";
  }

  private loadCleanCodeGuide(): string | undefined {
    const guidePath = this.config.rules?.cleanCodeGuide || join(__dirname, "rules", "clean-code-dotnet.md");

    if (existsSync(guidePath)) {
      const content = readFileSync(guidePath, "utf-8");
      if (content.length > 20000) {
        console.warn(`⚠ Clean code guide truncated from ${content.length} to 20000 characters`);
        return content.slice(0, 20000);
      }
      return content;
    }

    return undefined;
  }

  private formatComment(issue: ReviewIssue): string {
    return `**[${issue.severity}] ${issue.category}**

> ${issue.message}

**Fix:** ${issue.fix}`;
  }
}
