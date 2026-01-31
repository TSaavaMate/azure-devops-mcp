import { AzureDevOpsClient } from "../client.js";
import type { PullRequestInfo, FileChange, FileDiff, PullRequestDiff } from "./types.js";

export class PullRequestFetcher {
  constructor(
    private client: AzureDevOpsClient,
    private project: string
  ) {}

  async fetchPullRequest(repositoryId: string, pullRequestId: number): Promise<PullRequestInfo> {
    const connection = await this.client.getConnection();
    const gitApi = await connection.getGitApi();

    const pr = await gitApi.getPullRequest(repositoryId, pullRequestId);

    return {
      id: pr.pullRequestId!,
      title: pr.title || "",
      description: pr.description || "",
      sourceBranch: pr.sourceRefName?.replace("refs/heads/", "") || "",
      targetBranch: pr.targetRefName?.replace("refs/heads/", "") || "",
      author: {
        displayName: pr.createdBy?.displayName || "",
        email: pr.createdBy?.uniqueName || "",
      },
      createdDate: pr.creationDate || new Date(),
      status: String(pr.status),
      repositoryId: pr.repository?.id || repositoryId,
      projectName: pr.repository?.project?.name || this.project,
    };
  }

  async fetchChangedFiles(repositoryId: string, pullRequestId: number): Promise<FileChange[]> {
    const connection = await this.client.getConnection();
    const gitApi = await connection.getGitApi();

    const iterations = await gitApi.getPullRequestIterations(repositoryId, pullRequestId);
    if (!iterations || iterations.length === 0) {
      return [];
    }

    const latestIteration = iterations[iterations.length - 1];
    const changes = await gitApi.getPullRequestIterationChanges(repositoryId, pullRequestId, latestIteration.id!);

    return (changes?.changeEntries || []).map((entry) => ({
      path: entry.item?.path || "",
      changeType: this.mapChangeType(entry.changeType),
      originalPath: entry.originalPath,
    }));
  }

  async fetchFileDiff(repositoryId: string, filePath: string, originalObjectId?: string, modifiedObjectId?: string): Promise<string> {
    const connection = await this.client.getConnection();
    const gitApi = await connection.getGitApi();

    let originalContent = "";
    let modifiedContent = "";

    if (originalObjectId) {
      try {
        const blob = await gitApi.getBlobContent(repositoryId, originalObjectId, this.project, true);
        originalContent = await this.streamToString(blob);
      } catch {
        originalContent = "";
      }
    }

    if (modifiedObjectId) {
      try {
        const blob = await gitApi.getBlobContent(repositoryId, modifiedObjectId, this.project, true);
        modifiedContent = await this.streamToString(blob);
      } catch {
        modifiedContent = "";
      }
    }

    return this.createUnifiedDiff(filePath, originalContent, modifiedContent);
  }

  async fetchFullDiff(repositoryId: string, pullRequestId: number): Promise<PullRequestDiff> {
    const pr = await this.fetchPullRequest(repositoryId, pullRequestId);
    const files = await this.fetchChangedFiles(repositoryId, pullRequestId);

    const connection = await this.client.getConnection();
    const gitApi = await connection.getGitApi();

    const iterations = await gitApi.getPullRequestIterations(repositoryId, pullRequestId);
    const latestIteration = iterations?.[iterations.length - 1];

    const diffs: FileDiff[] = [];

    if (latestIteration) {
      const changes = await gitApi.getPullRequestIterationChanges(repositoryId, pullRequestId, latestIteration.id!);

      for (const entry of changes?.changeEntries || []) {
        if (entry.item?.path && !entry.item.isFolder) {
          const diff = await this.fetchFileDiff(repositoryId, entry.item.path, entry.item.originalObjectId, entry.item.objectId);
          diffs.push({
            path: entry.item.path,
            diff,
            originalPath: entry.originalPath,
          });
        }
      }
    }

    return { pr, files, diffs };
  }

  private mapChangeType(changeType: number | undefined): FileChange["changeType"] {
    switch (changeType) {
      case 1:
        return "add";
      case 2:
        return "edit";
      case 16:
        return "delete";
      case 8:
        return "rename";
      default:
        return "edit";
    }
  }

  private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  private createUnifiedDiff(filePath: string, original: string, modified: string): string {
    const originalLines = original.split("\n");
    const modifiedLines = modified.split("\n");

    let diff = `--- a${filePath}\n+++ b${filePath}\n`;

    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    let hunkStart = -1;

    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i];
      const modLine = modifiedLines[i];

      if (origLine !== modLine) {
        if (hunkStart === -1) {
          hunkStart = i;
          diff += `@@ -${i + 1},${originalLines.length} +${i + 1},${modifiedLines.length} @@\n`;
        }
        if (origLine !== undefined) {
          diff += `-${origLine}\n`;
        }
        if (modLine !== undefined) {
          diff += `+${modLine}\n`;
        }
      } else if (origLine !== undefined) {
        diff += ` ${origLine}\n`;
      }
    }

    return diff;
  }
}
