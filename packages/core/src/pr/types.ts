export interface PullRequestInfo {
  id: number;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  author: {
    displayName: string;
    email: string;
  };
  createdDate: Date;
  status: string;
  repositoryId: string;
  projectName: string;
}

export interface FileChange {
  path: string;
  changeType: "add" | "edit" | "delete" | "rename";
  originalPath?: string;
}

export interface FileDiff {
  path: string;
  diff: string;
  originalPath?: string;
}

export interface PullRequestDiff {
  pr: PullRequestInfo;
  files: FileChange[];
  diffs: FileDiff[];
}
