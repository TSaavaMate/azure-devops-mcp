import { describe, it, expect, vi } from "vitest";
import { AzureDevOpsClient } from "../client.js";

describe("AzureDevOpsClient", () => {
  it("should construct with org URL", () => {
    const client = new AzureDevOpsClient({
      organization: "myorg",
      getToken: async () => "test-token",
    });

    expect(client.orgUrl).toBe("https://dev.azure.com/myorg");
  });

  it("should validate organization name", () => {
    expect(() => {
      new AzureDevOpsClient({
        organization: "",
        getToken: async () => "token",
      });
    }).toThrow("Organization name is required");
  });
});
