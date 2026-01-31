import { AzureDevOpsClient } from "../client.js";
import { CommentThreadStatus } from "azure-devops-node-api/interfaces/GitInterfaces.js";

export interface InlineComment {
  filePath: string;
  line: number;
  content: string;
  status?: "active" | "closed";
}

export interface SummaryComment {
  content: string;
}

export class CommentPoster {
  constructor(
    private client: AzureDevOpsClient,
    private project: string
  ) {}

  async postInlineComment(repositoryId: string, pullRequestId: number, comment: InlineComment): Promise<number> {
    const connection = await this.client.getConnection();
    const gitApi = await connection.getGitApi();

    const normalizedPath = comment.filePath.startsWith("/") ? comment.filePath : `/${comment.filePath}`;

    const thread = await gitApi.createThread(
      {
        comments: [{ content: comment.content }],
        threadContext: {
          filePath: normalizedPath,
          rightFileStart: { line: comment.line, offset: 1 },
          rightFileEnd: { line: comment.line, offset: 1 },
        },
        status: comment.status === "closed" ? CommentThreadStatus.Closed : CommentThreadStatus.Active,
      },
      repositoryId,
      pullRequestId,
      this.project
    );

    return thread.id!;
  }

  async postSummaryComment(repositoryId: string, pullRequestId: number, comment: SummaryComment): Promise<number> {
    const connection = await this.client.getConnection();
    const gitApi = await connection.getGitApi();

    const thread = await gitApi.createThread(
      {
        comments: [{ content: comment.content }],
        status: CommentThreadStatus.Closed,
      },
      repositoryId,
      pullRequestId,
      this.project
    );

    return thread.id!;
  }

  async postMultipleComments(repositoryId: string, pullRequestId: number, inlineComments: InlineComment[], summaryComment?: SummaryComment): Promise<{ inlineIds: number[]; summaryId?: number }> {
    const inlineIds: number[] = [];

    for (const comment of inlineComments) {
      const id = await this.postInlineComment(repositoryId, pullRequestId, comment);
      inlineIds.push(id);
    }

    let summaryId: number | undefined;
    if (summaryComment) {
      summaryId = await this.postSummaryComment(repositoryId, pullRequestId, summaryComment);
    }

    return { inlineIds, summaryId };
  }
}
