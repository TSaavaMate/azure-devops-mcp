export type Severity = "BLOCK" | "HIGH" | "MEDIUM";

export interface ReviewIssue {
  file: string;
  line: number;
  severity: Severity;
  category: string;
  message: string;
  fix: string;
}

export interface ReviewResult {
  issues: ReviewIssue[];
  summary: string;
}

export interface ReviewPrompt {
  prMetadata: {
    id: number;
    title: string;
    description: string;
    sourceBranch: string;
    targetBranch: string;
    author: string;
  };
  diffs: Array<{
    path: string;
    diff: string;
  }>;
  rules: string;
  cleanCodeGuide?: string;
}
