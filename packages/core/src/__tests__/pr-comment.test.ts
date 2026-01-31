import { describe, it, expect, vi } from "vitest";
import { CommentPoster } from "../pr/comment.js";

describe("CommentPoster", () => {
  it("should be constructable", () => {
    const mockClient = {
      getConnection: vi.fn(),
      orgUrl: "https://dev.azure.com/test",
    };

    const poster = new CommentPoster(mockClient as any, "TestProject");
    expect(poster).toBeDefined();
  });
});
