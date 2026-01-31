import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPatAuthenticator } from "../auth.js";

describe("createPatAuthenticator", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return token from environment variable", async () => {
    vi.stubEnv("AZURE_DEVOPS_PAT", "test-pat-token");

    const getToken = createPatAuthenticator();
    const token = await getToken();

    expect(token).toBe("test-pat-token");
  });

  it("should throw if PAT not set", async () => {
    vi.stubEnv("AZURE_DEVOPS_PAT", "");

    const getToken = createPatAuthenticator();

    await expect(getToken()).rejects.toThrow("AZURE_DEVOPS_PAT");
  });

  it("should use custom env var name", async () => {
    vi.stubEnv("MY_CUSTOM_PAT", "custom-token");

    const getToken = createPatAuthenticator("MY_CUSTOM_PAT");
    const token = await getToken();

    expect(token).toBe("custom-token");
  });
});
