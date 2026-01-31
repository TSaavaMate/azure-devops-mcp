// Azure DevOps Core - Shared client library
export const VERSION = "1.0.0";

export { createPatAuthenticator } from "./auth.js";
export { AzureDevOpsClient, type AzureDevOpsClientOptions } from "./client.js";
export { CommentPoster, type InlineComment, type SummaryComment } from "./pr/comment.js";
export { PullRequestFetcher } from "./pr/fetch.js";
export type { PullRequestInfo, FileChange, FileDiff, PullRequestDiff } from "./pr/types.js";
