import Anthropic from "@anthropic-ai/sdk";
import type { LLMAdapter, LLMAdapterConfig } from "./adapter.js";
import type { ReviewPrompt, ReviewResult, ReviewIssue } from "./types.js";

const SYSTEM_PROMPT = `You are a Senior Principal Engineer conducting a code review. You are direct, blunt, and pragmatic.

Your task is to review the PR diff and identify issues. For each issue, provide:
- file: The file path
- line: The line number where the issue occurs
- severity: BLOCK (must fix before merge), HIGH (should fix), or MEDIUM (nice to fix)
- category: Type of issue (Security, Architecture, Naming, Performance, Clean Code, etc.)
- message: A witty, memorable comment about the issue
- fix: The specific action to fix the issue

IMPORTANT: Return your response as valid JSON in this exact format:
{
  "issues": [
    {
      "file": "/path/to/file.cs",
      "line": 42,
      "severity": "HIGH",
      "category": "Naming",
      "message": "Your creative roast here",
      "fix": "The actual fix they need"
    }
  ],
  "summary": "Review complete. BLOCK: X | HIGH: X | MEDIUM: X"
}

If there are no issues, return:
{
  "issues": [],
  "summary": "Ship it! Clean code detected."
}`;

export class ClaudeAdapter implements LLMAdapter {
  private client: Anthropic;
  private model: string;

  constructor(config: LLMAdapterConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async review(prompt: ReviewPrompt): Promise<ReviewResult> {
    const userPrompt = this.buildUserPrompt(prompt);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT + "\n\n" + prompt.rules,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    return this.parseResponse(content.text);
  }

  private buildUserPrompt(prompt: ReviewPrompt): string {
    let userPrompt = `## PR Metadata
- ID: ${prompt.prMetadata.id}
- Title: ${prompt.prMetadata.title}
- Author: ${prompt.prMetadata.author}
- Source Branch: ${prompt.prMetadata.sourceBranch}
- Target Branch: ${prompt.prMetadata.targetBranch}
- Description: ${prompt.prMetadata.description || "No description"}

## File Diffs
`;

    for (const diff of prompt.diffs) {
      userPrompt += `\n### ${diff.path}\n\`\`\`diff\n${diff.diff}\n\`\`\`\n`;
    }

    if (prompt.cleanCodeGuide) {
      userPrompt += `\n## Clean Code Guidelines Reference\n${prompt.cleanCodeGuide.slice(0, 10000)}\n`;
    }

    return userPrompt;
  }

  private parseResponse(text: string): ReviewResult {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from Claude response");
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        issues: parsed.issues || [],
        summary: parsed.summary || "Review complete.",
      };
    } catch (error) {
      throw new Error(`Failed to parse Claude response: ${error}`);
    }
  }
}
