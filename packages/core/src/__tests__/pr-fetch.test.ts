import { describe, it, expect, vi } from "vitest";
import { PullRequestFetcher } from "../pr/fetch.js";

// Mock the azure-devops-node-api
vi.mock("azure-devops-node-api", () => ({
  WebApi: vi.fn(),
  getBearerHandler: vi.fn(),
}));

describe("PullRequestFetcher", () => {
  it("should be constructable", () => {
    const mockClient = {
      getConnection: vi.fn(),
      orgUrl: "https://dev.azure.com/test",
    };

    const fetcher = new PullRequestFetcher(mockClient as any, "TestProject");
    expect(fetcher).toBeDefined();
  });
});
