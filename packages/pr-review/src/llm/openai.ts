import OpenAI from "openai";
import type { LLMAdapter, LLMAdapterConfig } from "./adapter.js";
import type { ReviewPrompt, ReviewResult } from "./types.js";

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
  "issues": [...],
  "summary": "Review complete. BLOCK: X | HIGH: X | MEDIUM: X"
}`;

export class OpenAIAdapter implements LLMAdapter {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMAdapterConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async review(prompt: ReviewPrompt): Promise<ReviewResult> {
    const userPrompt = this.buildUserPrompt(prompt);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT + "\n\n" + prompt.rules,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    return this.parseResponse(content);
  }

  private buildUserPrompt(prompt: ReviewPrompt): string {
    let userPrompt = `## PR Metadata
- ID: ${prompt.prMetadata.id}
- Title: ${prompt.prMetadata.title}
- Author: ${prompt.prMetadata.author}
- Source Branch: ${prompt.prMetadata.sourceBranch}
- Target Branch: ${prompt.prMetadata.targetBranch}

## File Diffs
`;

    for (const diff of prompt.diffs) {
      userPrompt += `\n### ${diff.path}\n\`\`\`diff\n${diff.diff}\n\`\`\`\n`;
    }

    return userPrompt;
  }

  private parseResponse(text: string): ReviewResult {
    try {
      const parsed = JSON.parse(text);
      return {
        issues: parsed.issues || [],
        summary: parsed.summary || "Review complete.",
      };
    } catch (error) {
      throw new Error(`Failed to parse OpenAI response: ${error}`);
    }
  }
}
