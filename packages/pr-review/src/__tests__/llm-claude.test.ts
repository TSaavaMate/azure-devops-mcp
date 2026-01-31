import { describe, it, expect, vi } from "vitest";
import { ClaudeAdapter } from "../llm/claude.js";

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              issues: [
                {
                  file: "/src/test.cs",
                  line: 10,
                  severity: "HIGH",
                  category: "Naming",
                  message: "Bad name",
                  fix: "Rename it",
                },
              ],
              summary: "Review complete. BLOCK: 0 | HIGH: 1 | MEDIUM: 0",
            }),
          },
        ],
      }),
    },
  })),
}));

describe("ClaudeAdapter", () => {
  it("should parse review response", async () => {
    const adapter = new ClaudeAdapter({
      apiKey: "test-key",
      model: "claude-sonnet-4-20250514",
    });

    const result = await adapter.review({
      prMetadata: {
        id: 123,
        title: "Test PR",
        description: "Test description",
        sourceBranch: "feature/test",
        targetBranch: "main",
        author: "Test User",
      },
      diffs: [{ path: "/src/test.cs", diff: "+new line" }],
      rules: "Review rules here",
    });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe("HIGH");
    expect(result.summary).toContain("HIGH: 1");
  });
});
