import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadConfig, type Config } from "../config.js";

describe("loadConfig", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("should load config from environment variables", () => {
    vi.stubEnv("AZURE_DEVOPS_PAT", "test-pat");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");

    const config = loadConfig({});

    expect(config.azureDevOps.pat).toBe("test-pat");
    expect(config.llm.provider).toBe("claude");
    expect(config.llm.apiKey).toBe("sk-ant-test");
  });

  it("should use CLI overrides", () => {
    vi.stubEnv("AZURE_DEVOPS_PAT", "test-pat");
    vi.stubEnv("OPENAI_API_KEY", "sk-openai-test");

    const config = loadConfig({
      provider: "openai",
      model: "gpt-4o",
    });

    expect(config.llm.provider).toBe("openai");
    expect(config.llm.model).toBe("gpt-4o");
    expect(config.llm.apiKey).toBe("sk-openai-test");
  });

  it("should throw if PAT not configured", () => {
    vi.stubEnv("AZURE_DEVOPS_PAT", "");

    expect(() => loadConfig({})).toThrow("AZURE_DEVOPS_PAT");
  });
});
