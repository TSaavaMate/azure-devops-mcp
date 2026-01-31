# PR Review CLI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone CLI tool (`@azure-devops/pr-review`) that reviews PRs using AI and posts comments to Azure DevOps.

**Architecture:** Monorepo with shared `core` package for Azure DevOps API, `mcp-server` (existing), and new `pr-review` CLI. LLM adapters abstract provider differences. Config supports env vars and JSON files.

**Tech Stack:** TypeScript, pnpm workspaces, yargs (CLI), zod (validation), Anthropic/OpenAI SDKs

---

## Phase 1: Monorepo Setup

### Task 1.1: Initialize pnpm Workspace

**Files:**

- Create: `pnpm-workspace.yaml`
- Modify: `package.json` (root)

**Step 1: Create workspace config**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
```

**Step 2: Update root package.json**

Modify `package.json` - replace entire content:

```json
{
  "name": "azure-devops-tools",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "clean": "pnpm -r clean"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  },
  "engines": {
    "node": ">=18"
  }
}
```

**Step 3: Install pnpm if needed and initialize**

Run: `npm install -g pnpm` (if not installed)
Run: `rm -rf node_modules package-lock.json`

**Step 4: Commit**

```bash
git add pnpm-workspace.yaml package.json
git commit -m "chore: initialize pnpm monorepo workspace"
```

---

### Task 1.2: Create packages directory structure

**Files:**

- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/mcp-server/` (move existing)
- Create: `packages/pr-review/package.json`
- Create: `packages/pr-review/tsconfig.json`
- Create: `packages/pr-review/src/index.ts`

**Step 1: Create directory structure**

Run:

```bash
mkdir -p packages/core/src
mkdir -p packages/mcp-server
mkdir -p packages/pr-review/src
```

**Step 2: Create core package.json**

Create `packages/core/package.json`:

```json
{
  "name": "@azure-devops/core",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "test": "jest"
  },
  "dependencies": {
    "azure-devops-node-api": "^15.1.2",
    "zod": "^3.25.63"
  },
  "devDependencies": {
    "@types/node": "^22.19.1",
    "typescript": "^5.9.3"
  }
}
```

**Step 3: Create core tsconfig.json**

Create `packages/core/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create core index.ts placeholder**

Create `packages/core/src/index.ts`:

```typescript
// Azure DevOps Core - Shared client library
export const VERSION = "1.0.0";
```

**Step 5: Create pr-review package.json**

Create `packages/pr-review/package.json`:

```json
{
  "name": "@azure-devops/pr-review",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "pr-review": "dist/cli.js"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist",
    "test": "jest"
  },
  "dependencies": {
    "@azure-devops/core": "workspace:*",
    "@anthropic-ai/sdk": "^0.39.0",
    "openai": "^4.77.0",
    "yargs": "^18.0.0",
    "zod": "^3.25.63",
    "chalk": "^5.4.1",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "@types/node": "^22.19.1",
    "@types/yargs": "^17.0.33",
    "typescript": "^5.9.3"
  }
}
```

**Step 6: Create pr-review tsconfig.json**

Create `packages/pr-review/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 7: Create pr-review index.ts placeholder**

Create `packages/pr-review/src/index.ts`:

```typescript
// PR Review CLI
export const VERSION = "1.0.0";
```

**Step 8: Commit**

```bash
git add packages/
git commit -m "chore: create monorepo package structure"
```

---

### Task 1.3: Move existing MCP server to packages

**Step 1: Move source files**

Run:

```bash
mv src packages/mcp-server/
mv test packages/mcp-server/
mv tsconfig.json packages/mcp-server/
mv jest.config.ts packages/mcp-server/
```

**Step 2: Update mcp-server package.json**

Move and modify `package.json` to `packages/mcp-server/package.json`:

Keep existing content but update name if needed. The existing package.json should work as-is after move.

Run:

```bash
mv package.json packages/mcp-server/
```

**Step 3: Install dependencies**

Run:

```bash
pnpm install
```

**Step 4: Verify MCP server still works**

Run:

```bash
cd packages/mcp-server && pnpm test
```

Expected: All 672 tests pass

**Step 5: Commit**

```bash
git add .
git commit -m "refactor: move mcp-server to packages directory"
```

---

## Phase 2: Core Package - Azure DevOps Client

### Task 2.1: Extract authentication module

**Files:**

- Create: `packages/core/src/auth.ts`
- Test: `packages/core/src/__tests__/auth.test.ts`

**Step 1: Write failing test**

Create `packages/core/src/__tests__/auth.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test`
Expected: FAIL - module not found

**Step 3: Write implementation**

Create `packages/core/src/auth.ts`:

```typescript
/**
 * Creates a PAT-based authenticator for Azure DevOps.
 * @param envVarName - Environment variable name containing the PAT (default: AZURE_DEVOPS_PAT)
 * @returns Async function that returns the PAT token
 */
export function createPatAuthenticator(envVarName: string = "AZURE_DEVOPS_PAT"): () => Promise<string> {
  return async () => {
    const token = process.env[envVarName];
    if (!token) {
      throw new Error(`Environment variable '${envVarName}' is not set or empty. ` + `Please set it with a valid Azure DevOps Personal Access Token.`);
    }
    return token;
  };
}
```

**Step 4: Update core index.ts**

Update `packages/core/src/index.ts`:

```typescript
export { createPatAuthenticator } from "./auth.js";
```

**Step 5: Add vitest to core package**

Update `packages/core/package.json` devDependencies:

```json
{
  "devDependencies": {
    "@types/node": "^22.19.1",
    "typescript": "^5.9.3",
    "vitest": "^3.0.0"
  }
}
```

Add test script:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

**Step 6: Run test to verify it passes**

Run: `cd packages/core && pnpm install && pnpm test`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add PAT authentication module"
```

---

### Task 2.2: Create Azure DevOps client wrapper

**Files:**

- Create: `packages/core/src/client.ts`
- Test: `packages/core/src/__tests__/client.test.ts`

**Step 1: Write failing test**

Create `packages/core/src/__tests__/client.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test`
Expected: FAIL

**Step 3: Write implementation**

Create `packages/core/src/client.ts`:

```typescript
import { WebApi, getBearerHandler } from "azure-devops-node-api";

export interface AzureDevOpsClientOptions {
  organization: string;
  getToken: () => Promise<string>;
}

export class AzureDevOpsClient {
  public readonly orgUrl: string;
  private readonly getToken: () => Promise<string>;
  private connection: WebApi | null = null;

  constructor(options: AzureDevOpsClientOptions) {
    if (!options.organization) {
      throw new Error("Organization name is required");
    }
    this.orgUrl = `https://dev.azure.com/${options.organization}`;
    this.getToken = options.getToken;
  }

  async getConnection(): Promise<WebApi> {
    if (!this.connection) {
      const token = await this.getToken();
      const authHandler = getBearerHandler(token);
      this.connection = new WebApi(this.orgUrl, authHandler);
    }
    return this.connection;
  }
}
```

**Step 4: Update core index.ts**

```typescript
export { createPatAuthenticator } from "./auth.js";
export { AzureDevOpsClient, type AzureDevOpsClientOptions } from "./client.js";
```

**Step 5: Run test to verify it passes**

Run: `cd packages/core && pnpm test`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add Azure DevOps client wrapper"
```

---

### Task 2.3: Add PR fetching functionality

**Files:**

- Create: `packages/core/src/pr/types.ts`
- Create: `packages/core/src/pr/fetch.ts`
- Test: `packages/core/src/__tests__/pr-fetch.test.ts`

**Step 1: Create types**

Create `packages/core/src/pr/types.ts`:

```typescript
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
```

**Step 2: Write failing test**

Create `packages/core/src/__tests__/pr-fetch.test.ts`:

```typescript
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
```

**Step 3: Run test to verify it fails**

Run: `cd packages/core && pnpm test`
Expected: FAIL

**Step 4: Write implementation**

Create `packages/core/src/pr/fetch.ts`:

```typescript
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
    // Azure DevOps VersionControlChangeType enum values
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
    // Simple unified diff format
    const originalLines = original.split("\n");
    const modifiedLines = modified.split("\n");

    let diff = `--- a${filePath}\n+++ b${filePath}\n`;

    // Simple line-by-line diff (production should use proper diff library)
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    let hunkStart = -1;
    let hunk = "";

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
```

**Step 5: Update exports**

Update `packages/core/src/index.ts`:

```typescript
export { createPatAuthenticator } from "./auth.js";
export { AzureDevOpsClient, type AzureDevOpsClientOptions } from "./client.js";
export { PullRequestFetcher } from "./pr/fetch.js";
export type { PullRequestInfo, FileChange, FileDiff, PullRequestDiff } from "./pr/types.js";
```

**Step 6: Run test**

Run: `cd packages/core && pnpm test`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add PR fetching functionality"
```

---

### Task 2.4: Add comment posting functionality

**Files:**

- Create: `packages/core/src/pr/comment.ts`
- Test: `packages/core/src/__tests__/pr-comment.test.ts`

**Step 1: Write failing test**

Create `packages/core/src/__tests__/pr-comment.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test`
Expected: FAIL

**Step 3: Write implementation**

Create `packages/core/src/pr/comment.ts`:

```typescript
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
```

**Step 4: Update exports**

Update `packages/core/src/index.ts`:

```typescript
export { createPatAuthenticator } from "./auth.js";
export { AzureDevOpsClient, type AzureDevOpsClientOptions } from "./client.js";
export { PullRequestFetcher } from "./pr/fetch.js";
export { CommentPoster, type InlineComment, type SummaryComment } from "./pr/comment.js";
export type { PullRequestInfo, FileChange, FileDiff, PullRequestDiff } from "./pr/types.js";
```

**Step 5: Run test**

Run: `cd packages/core && pnpm test`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add PR comment posting functionality"
```

---

## Phase 3: PR Review CLI - Basic Structure

### Task 3.1: Create CLI entry point

**Files:**

- Create: `packages/pr-review/src/cli.ts`
- Test: Manual test

**Step 1: Write CLI entry point**

Create `packages/pr-review/src/cli.ts`:

```typescript
#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { config } from "dotenv";

// Load environment variables
config();

const argv = yargs(hideBin(process.argv))
  .scriptName("pr-review")
  .usage("Usage: $0 --org <org> --project <project> --pr <id>")
  .option("org", {
    alias: "o",
    describe: "Azure DevOps organization name",
    type: "string",
    demandOption: true,
  })
  .option("project", {
    alias: "p",
    describe: "Azure DevOps project name",
    type: "string",
    demandOption: true,
  })
  .option("pr", {
    describe: "Pull request ID",
    type: "number",
    demandOption: true,
  })
  .option("repo", {
    alias: "r",
    describe: "Repository name or ID (defaults to project name)",
    type: "string",
  })
  .option("provider", {
    describe: "LLM provider to use",
    choices: ["claude", "azure-openai", "openai"] as const,
    default: "claude" as const,
  })
  .option("model", {
    alias: "m",
    describe: "Model to use (provider-specific)",
    type: "string",
  })
  .option("dry-run", {
    describe: "Show review without posting comments",
    type: "boolean",
    default: false,
  })
  .option("config", {
    alias: "c",
    describe: "Path to config file",
    type: "string",
  })
  .help()
  .version()
  .parseSync();

async function main() {
  console.log("PR Review CLI");
  console.log("=============");
  console.log(`Organization: ${argv.org}`);
  console.log(`Project: ${argv.project}`);
  console.log(`PR: ${argv.pr}`);
  console.log(`Provider: ${argv.provider}`);
  console.log(`Dry run: ${argv.dryRun}`);

  // TODO: Implement review logic
  console.log("\n[Not yet implemented]");
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
```

**Step 2: Build and test**

Run:

```bash
cd packages/pr-review
pnpm install
pnpm build
node dist/cli.js --org test --project test --pr 123
```

Expected: Shows CLI output with parameters

**Step 3: Commit**

```bash
git add packages/pr-review/
git commit -m "feat(pr-review): add CLI entry point with argument parsing"
```

---

### Task 3.2: Create config loader

**Files:**

- Create: `packages/pr-review/src/config.ts`
- Test: `packages/pr-review/src/__tests__/config.test.ts`

**Step 1: Write failing test**

Create `packages/pr-review/src/__tests__/config.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd packages/pr-review && pnpm test`
Expected: FAIL

**Step 3: Write implementation**

Create `packages/pr-review/src/config.ts`:

```typescript
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const LLMProviderSchema = z.enum(["claude", "azure-openai", "openai"]);
type LLMProvider = z.infer<typeof LLMProviderSchema>;

const ConfigSchema = z.object({
  azureDevOps: z.object({
    pat: z.string().min(1, "AZURE_DEVOPS_PAT is required"),
    defaultOrg: z.string().optional(),
    defaultProject: z.string().optional(),
  }),
  llm: z.object({
    provider: LLMProviderSchema,
    apiKey: z.string().min(1, "LLM API key is required"),
    model: z.string().optional(),
    endpoint: z.string().optional(), // For Azure OpenAI
  }),
  rules: z
    .object({
      path: z.string().optional(),
      cleanCodeGuide: z.string().optional(),
    })
    .optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

interface CLIOverrides {
  provider?: LLMProvider;
  model?: string;
  config?: string;
}

export function loadConfig(overrides: CLIOverrides): Config {
  // Try to load config file
  let fileConfig: Partial<Config> = {};

  const configPaths = [overrides.config, ".pr-review.json", join(homedir(), ".pr-review", "config.json")].filter(Boolean) as string[];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        fileConfig = JSON.parse(content);
        break;
      } catch {
        // Ignore invalid config files
      }
    }
  }

  // Determine LLM provider
  const provider = overrides.provider || (fileConfig.llm?.provider as LLMProvider) || "claude";

  // Get API key based on provider
  const apiKey = getApiKey(provider, fileConfig.llm?.apiKey);

  // Build config
  const config: Config = {
    azureDevOps: {
      pat: process.env.AZURE_DEVOPS_PAT || fileConfig.azureDevOps?.pat || "",
      defaultOrg: fileConfig.azureDevOps?.defaultOrg,
      defaultProject: fileConfig.azureDevOps?.defaultProject,
    },
    llm: {
      provider,
      apiKey,
      model: overrides.model || fileConfig.llm?.model || getDefaultModel(provider),
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || fileConfig.llm?.endpoint,
    },
    rules: fileConfig.rules,
  };

  // Validate
  return ConfigSchema.parse(config);
}

function getApiKey(provider: LLMProvider, fileApiKey?: string): string {
  switch (provider) {
    case "claude":
      return process.env.ANTHROPIC_API_KEY || fileApiKey || "";
    case "openai":
      return process.env.OPENAI_API_KEY || fileApiKey || "";
    case "azure-openai":
      return process.env.AZURE_OPENAI_API_KEY || fileApiKey || "";
  }
}

function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case "claude":
      return "claude-sonnet-4-20250514";
    case "openai":
      return "gpt-4o";
    case "azure-openai":
      return "gpt-4o";
  }
}
```

**Step 4: Add vitest to pr-review package**

Update `packages/pr-review/package.json`:

```json
{
  "devDependencies": {
    "@types/node": "^22.19.1",
    "@types/yargs": "^17.0.33",
    "typescript": "^5.9.3",
    "vitest": "^3.0.0"
  },
  "scripts": {
    "test": "vitest run"
  }
}
```

**Step 5: Run test**

Run: `cd packages/pr-review && pnpm install && pnpm test`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/pr-review/
git commit -m "feat(pr-review): add config loader with env var and file support"
```

---

## Phase 4: LLM Adapters

### Task 4.1: Create LLM adapter interface

**Files:**

- Create: `packages/pr-review/src/llm/types.ts`
- Create: `packages/pr-review/src/llm/adapter.ts`

**Step 1: Create types**

Create `packages/pr-review/src/llm/types.ts`:

```typescript
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
```

**Step 2: Create adapter interface**

Create `packages/pr-review/src/llm/adapter.ts`:

```typescript
import type { ReviewPrompt, ReviewResult } from "./types.js";

export interface LLMAdapter {
  review(prompt: ReviewPrompt): Promise<ReviewResult>;
}

export interface LLMAdapterConfig {
  apiKey: string;
  model: string;
  endpoint?: string;
}
```

**Step 3: Commit**

```bash
git add packages/pr-review/src/llm/
git commit -m "feat(pr-review): add LLM adapter interface and types"
```

---

### Task 4.2: Implement Claude adapter

**Files:**

- Create: `packages/pr-review/src/llm/claude.ts`
- Test: `packages/pr-review/src/__tests__/llm-claude.test.ts`

**Step 1: Write failing test**

Create `packages/pr-review/src/__tests__/llm-claude.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { ClaudeAdapter } from "../llm/claude.js";

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              issues: [
                {
                  file: "/src/test.cs",
                  line: 10,
                  severity: "HIGH",
                  category: "Naming",
                  message: "Bad name",
                  fix: "Rename it",
                },
              ],
              summary: "Review complete. BLOCK: 0 | HIGH: 1 | MEDIUM: 0",
            }),
          },
        ],
      }),
    },
  })),
}));

describe("ClaudeAdapter", () => {
  it("should parse review response", async () => {
    const adapter = new ClaudeAdapter({
      apiKey: "test-key",
      model: "claude-sonnet-4-20250514",
    });

    const result = await adapter.review({
      prMetadata: {
        id: 123,
        title: "Test PR",
        description: "Test description",
        sourceBranch: "feature/test",
        targetBranch: "main",
        author: "Test User",
      },
      diffs: [{ path: "/src/test.cs", diff: "+new line" }],
      rules: "Review rules here",
    });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe("HIGH");
    expect(result.summary).toContain("HIGH: 1");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/pr-review && pnpm test`
Expected: FAIL

**Step 3: Write implementation**

Create `packages/pr-review/src/llm/claude.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { LLMAdapter, LLMAdapterConfig } from "./adapter.js";
import type { ReviewPrompt, ReviewResult, ReviewIssue } from "./types.js";

const SYSTEM_PROMPT = `You are a Senior Principal Engineer conducting a code review. You are direct, blunt, and pragmatic.

Your task is to review the PR diff and identify issues. For each issue, provide:
- file: The file path
- line: The line number where the issue occurs
- severity: BLOCK (must fix before merge), HIGH (should fix), or MEDIUM (nice to fix)
- category: Type of issue (Security, Architecture, Naming, Performance, Clean Code, etc.)
- message: A witty, memorable comment about the issue
- fix: The specific action to fix the issue

IMPORTANT: Return your response as valid JSON in this exact format:
{
  "issues": [
    {
      "file": "/path/to/file.cs",
      "line": 42,
      "severity": "HIGH",
      "category": "Naming",
      "message": "Your creative roast here",
      "fix": "The actual fix they need"
    }
  ],
  "summary": "Review complete. BLOCK: X | HIGH: X | MEDIUM: X"
}

If there are no issues, return:
{
  "issues": [],
  "summary": "Ship it! Clean code detected."
}`;

export class ClaudeAdapter implements LLMAdapter {
  private client: Anthropic;
  private model: string;

  constructor(config: LLMAdapterConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async review(prompt: ReviewPrompt): Promise<ReviewResult> {
    const userPrompt = this.buildUserPrompt(prompt);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT + "\n\n" + prompt.rules,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    return this.parseResponse(content.text);
  }

  private buildUserPrompt(prompt: ReviewPrompt): string {
    let userPrompt = `## PR Metadata
- ID: ${prompt.prMetadata.id}
- Title: ${prompt.prMetadata.title}
- Author: ${prompt.prMetadata.author}
- Source Branch: ${prompt.prMetadata.sourceBranch}
- Target Branch: ${prompt.prMetadata.targetBranch}
- Description: ${prompt.prMetadata.description || "No description"}

## File Diffs
`;

    for (const diff of prompt.diffs) {
      userPrompt += `\n### ${diff.path}\n\`\`\`diff\n${diff.diff}\n\`\`\`\n`;
    }

    if (prompt.cleanCodeGuide) {
      userPrompt += `\n## Clean Code Guidelines Reference\n${prompt.cleanCodeGuide.slice(0, 10000)}\n`;
    }

    return userPrompt;
  }

  private parseResponse(text: string): ReviewResult {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from Claude response");
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        issues: parsed.issues || [],
        summary: parsed.summary || "Review complete.",
      };
    } catch (error) {
      throw new Error(`Failed to parse Claude response: ${error}`);
    }
  }
}
```

**Step 4: Run test**

Run: `cd packages/pr-review && pnpm test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/pr-review/
git commit -m "feat(pr-review): implement Claude LLM adapter"
```

---

### Task 4.3: Implement OpenAI adapter

**Files:**

- Create: `packages/pr-review/src/llm/openai.ts`
- Test: `packages/pr-review/src/__tests__/llm-openai.test.ts`

**Step 1: Write implementation**

Create `packages/pr-review/src/llm/openai.ts`:

```typescript
import OpenAI from "openai";
import type { LLMAdapter, LLMAdapterConfig } from "./adapter.js";
import type { ReviewPrompt, ReviewResult } from "./types.js";

const SYSTEM_PROMPT = `You are a Senior Principal Engineer conducting a code review. You are direct, blunt, and pragmatic.

Your task is to review the PR diff and identify issues. For each issue, provide:
- file: The file path
- line: The line number where the issue occurs
- severity: BLOCK (must fix before merge), HIGH (should fix), or MEDIUM (nice to fix)
- category: Type of issue (Security, Architecture, Naming, Performance, Clean Code, etc.)
- message: A witty, memorable comment about the issue
- fix: The specific action to fix the issue

IMPORTANT: Return your response as valid JSON in this exact format:
{
  "issues": [...],
  "summary": "Review complete. BLOCK: X | HIGH: X | MEDIUM: X"
}`;

export class OpenAIAdapter implements LLMAdapter {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMAdapterConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async review(prompt: ReviewPrompt): Promise<ReviewResult> {
    const userPrompt = this.buildUserPrompt(prompt);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT + "\n\n" + prompt.rules,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    return this.parseResponse(content);
  }

  private buildUserPrompt(prompt: ReviewPrompt): string {
    let userPrompt = `## PR Metadata
- ID: ${prompt.prMetadata.id}
- Title: ${prompt.prMetadata.title}
- Author: ${prompt.prMetadata.author}
- Source Branch: ${prompt.prMetadata.sourceBranch}
- Target Branch: ${prompt.prMetadata.targetBranch}

## File Diffs
`;

    for (const diff of prompt.diffs) {
      userPrompt += `\n### ${diff.path}\n\`\`\`diff\n${diff.diff}\n\`\`\`\n`;
    }

    return userPrompt;
  }

  private parseResponse(text: string): ReviewResult {
    try {
      const parsed = JSON.parse(text);
      return {
        issues: parsed.issues || [],
        summary: parsed.summary || "Review complete.",
      };
    } catch (error) {
      throw new Error(`Failed to parse OpenAI response: ${error}`);
    }
  }
}
```

**Step 2: Create Azure OpenAI adapter**

Create `packages/pr-review/src/llm/azure-openai.ts`:

```typescript
import { AzureOpenAI } from "openai";
import type { LLMAdapter, LLMAdapterConfig } from "./adapter.js";
import type { ReviewPrompt, ReviewResult } from "./types.js";

const SYSTEM_PROMPT = `You are a Senior Principal Engineer conducting a code review...`; // Same as OpenAI

export class AzureOpenAIAdapter implements LLMAdapter {
  private client: AzureOpenAI;
  private model: string;

  constructor(config: LLMAdapterConfig) {
    if (!config.endpoint) {
      throw new Error("Azure OpenAI endpoint is required");
    }
    this.client = new AzureOpenAI({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      apiVersion: "2024-02-15-preview",
    });
    this.model = config.model;
  }

  async review(prompt: ReviewPrompt): Promise<ReviewResult> {
    // Same implementation as OpenAI adapter
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\n\n" + prompt.rules },
        { role: "user", content: this.buildUserPrompt(prompt) },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Azure OpenAI");
    }

    return JSON.parse(content);
  }

  private buildUserPrompt(prompt: ReviewPrompt): string {
    // Same as OpenAI adapter
    let userPrompt = `## PR Metadata\n...`;
    for (const diff of prompt.diffs) {
      userPrompt += `\n### ${diff.path}\n\`\`\`diff\n${diff.diff}\n\`\`\`\n`;
    }
    return userPrompt;
  }
}
```

**Step 3: Create adapter factory**

Create `packages/pr-review/src/llm/index.ts`:

```typescript
import type { LLMAdapter, LLMAdapterConfig } from "./adapter.js";
import { ClaudeAdapter } from "./claude.js";
import { OpenAIAdapter } from "./openai.js";
import { AzureOpenAIAdapter } from "./azure-openai.js";

export type LLMProvider = "claude" | "openai" | "azure-openai";

export function createLLMAdapter(provider: LLMProvider, config: LLMAdapterConfig): LLMAdapter {
  switch (provider) {
    case "claude":
      return new ClaudeAdapter(config);
    case "openai":
      return new OpenAIAdapter(config);
    case "azure-openai":
      return new AzureOpenAIAdapter(config);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export type { LLMAdapter, LLMAdapterConfig } from "./adapter.js";
export type { ReviewPrompt, ReviewResult, ReviewIssue, Severity } from "./types.js";
```

**Step 4: Commit**

```bash
git add packages/pr-review/src/llm/
git commit -m "feat(pr-review): add OpenAI and Azure OpenAI adapters with factory"
```

---

## Phase 5: Main Review Logic

### Task 5.1: Create reviewer module

**Files:**

- Create: `packages/pr-review/src/reviewer.ts`
- Test: `packages/pr-review/src/__tests__/reviewer.test.ts`

**Step 1: Write implementation**

Create `packages/pr-review/src/reviewer.ts`:

```typescript
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { AzureDevOpsClient, PullRequestFetcher, CommentPoster, createPatAuthenticator } from "@azure-devops/core";
import { createLLMAdapter, type LLMProvider, type ReviewResult } from "./llm/index.js";
import type { Config } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ReviewOptions {
  organization: string;
  project: string;
  repositoryId: string;
  pullRequestId: number;
  dryRun: boolean;
}

export interface ReviewOutput {
  result: ReviewResult;
  postedComments: number;
  summaryPosted: boolean;
}

export class PRReviewer {
  private config: Config;
  private client: AzureDevOpsClient;
  private fetcher: PullRequestFetcher;
  private poster: CommentPoster;

  constructor(config: Config, project: string) {
    this.config = config;
    this.client = new AzureDevOpsClient({
      organization: config.azureDevOps.defaultOrg || "",
      getToken: createPatAuthenticator(),
    });
    this.fetcher = new PullRequestFetcher(this.client, project);
    this.poster = new CommentPoster(this.client, project);
  }

  async review(options: ReviewOptions): Promise<ReviewOutput> {
    // 1. Fetch PR diff
    console.log(`🔍 Fetching PR #${options.pullRequestId}...`);
    const prDiff = await this.fetcher.fetchFullDiff(options.repositoryId, options.pullRequestId);
    console.log(`📂 Found ${prDiff.files.length} changed files`);

    // 2. Load review rules
    const rules = this.loadRules();

    // 3. Send to LLM
    console.log(`🤖 Analyzing with ${this.config.llm.provider}...`);
    const llm = createLLMAdapter(this.config.llm.provider as LLMProvider, {
      apiKey: this.config.llm.apiKey,
      model: this.config.llm.model || "claude-sonnet-4-20250514",
      endpoint: this.config.llm.endpoint,
    });

    const result = await llm.review({
      prMetadata: {
        id: prDiff.pr.id,
        title: prDiff.pr.title,
        description: prDiff.pr.description,
        sourceBranch: prDiff.pr.sourceBranch,
        targetBranch: prDiff.pr.targetBranch,
        author: prDiff.pr.author.displayName,
      },
      diffs: prDiff.diffs.map((d) => ({ path: d.path, diff: d.diff })),
      rules,
      cleanCodeGuide: this.loadCleanCodeGuide(),
    });

    // 4. Post comments (unless dry run)
    let postedComments = 0;
    let summaryPosted = false;

    if (!options.dryRun) {
      console.log("\n📝 Posting comments...");
      for (const issue of result.issues) {
        await this.poster.postInlineComment(options.repositoryId, options.pullRequestId, {
          filePath: issue.file,
          line: issue.line,
          content: this.formatComment(issue),
        });
        postedComments++;
        console.log(`  • ${issue.severity}: ${issue.category} (${issue.file}:${issue.line})`);
      }

      await this.poster.postSummaryComment(options.repositoryId, options.pullRequestId, { content: result.summary });
      summaryPosted = true;
      console.log("📝 Summary posted.");
    } else {
      console.log("\n🔍 Dry run - would post these comments:");
      for (const issue of result.issues) {
        console.log(`  • ${issue.severity}: ${issue.category} (${issue.file}:${issue.line})`);
        console.log(`    ${issue.message}`);
        console.log(`    Fix: ${issue.fix}\n`);
      }
      console.log(`Summary: ${result.summary}`);
    }

    return { result, postedComments, summaryPosted };
  }

  private loadRules(): string {
    const rulesPath = this.config.rules?.path || join(__dirname, "rules", "pr-review.md");

    if (existsSync(rulesPath)) {
      return readFileSync(rulesPath, "utf-8");
    }

    return "Review for code quality, security issues, and best practices.";
  }

  private loadCleanCodeGuide(): string | undefined {
    const guidePath = this.config.rules?.cleanCodeGuide || join(__dirname, "rules", "clean-code-dotnet.md");

    if (existsSync(guidePath)) {
      // Truncate to avoid token limits
      return readFileSync(guidePath, "utf-8").slice(0, 20000);
    }

    return undefined;
  }

  private formatComment(issue: { severity: string; category: string; message: string; fix: string }): string {
    return `**[${issue.severity}] ${issue.category}**

> ${issue.message}

→ **Fix:** ${issue.fix}`;
  }
}
```

**Step 2: Commit**

```bash
git add packages/pr-review/src/reviewer.ts
git commit -m "feat(pr-review): add main reviewer module"
```

---

### Task 5.2: Wire up CLI

**Files:**

- Modify: `packages/pr-review/src/cli.ts`

**Step 1: Update CLI to use reviewer**

Update `packages/pr-review/src/cli.ts`:

```typescript
#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { config as loadEnv } from "dotenv";
import chalk from "chalk";
import { loadConfig } from "./config.js";
import { PRReviewer } from "./reviewer.js";

// Load environment variables
loadEnv();

const argv = yargs(hideBin(process.argv))
  .scriptName("pr-review")
  .usage("Usage: $0 --org <org> --project <project> --pr <id>")
  .option("org", {
    alias: "o",
    describe: "Azure DevOps organization name",
    type: "string",
    demandOption: true,
  })
  .option("project", {
    alias: "p",
    describe: "Azure DevOps project name",
    type: "string",
    demandOption: true,
  })
  .option("pr", {
    describe: "Pull request ID",
    type: "number",
    demandOption: true,
  })
  .option("repo", {
    alias: "r",
    describe: "Repository name or ID (defaults to project name)",
    type: "string",
  })
  .option("provider", {
    describe: "LLM provider to use",
    choices: ["claude", "azure-openai", "openai"] as const,
    default: "claude" as const,
  })
  .option("model", {
    alias: "m",
    describe: "Model to use (provider-specific)",
    type: "string",
  })
  .option("dry-run", {
    describe: "Show review without posting comments",
    type: "boolean",
    default: false,
  })
  .option("config", {
    alias: "c",
    describe: "Path to config file",
    type: "string",
  })
  .help()
  .version()
  .parseSync();

async function main() {
  console.log(chalk.bold("PR Review CLI"));
  console.log(chalk.dim("=============\n"));

  try {
    // Load configuration
    const config = loadConfig({
      provider: argv.provider,
      model: argv.model,
      config: argv.config,
    });

    // Override org from CLI
    config.azureDevOps.defaultOrg = argv.org;

    // Create reviewer
    const reviewer = new PRReviewer(config, argv.project);

    // Run review
    const { result, postedComments, summaryPosted } = await reviewer.review({
      organization: argv.org,
      project: argv.project,
      repositoryId: argv.repo || argv.project,
      pullRequestId: argv.pr,
      dryRun: argv.dryRun,
    });

    // Print summary
    console.log("\n" + chalk.bold("Result:"));
    const blockCount = result.issues.filter((i) => i.severity === "BLOCK").length;
    const highCount = result.issues.filter((i) => i.severity === "HIGH").length;
    const mediumCount = result.issues.filter((i) => i.severity === "MEDIUM").length;

    const blockText = blockCount > 0 ? chalk.red(`${blockCount} BLOCK`) : chalk.green("0 BLOCK");
    const highText = highCount > 0 ? chalk.yellow(`${highCount} HIGH`) : chalk.green("0 HIGH");
    const mediumText = `${mediumCount} MEDIUM`;

    console.log(`${blockText} | ${highText} | ${mediumText}`);

    if (!argv.dryRun) {
      console.log(chalk.dim(`\nPosted ${postedComments} inline comments`));
      if (summaryPosted) {
        console.log(chalk.dim("Summary comment posted"));
      }
    }

    // Exit code based on blockers
    process.exit(blockCount > 0 ? 1 : 0);
  } catch (error) {
    console.error(chalk.red("\nError:"), error instanceof Error ? error.message : error);
    process.exit(2);
  }
}

main();
```

**Step 2: Commit**

```bash
git add packages/pr-review/src/cli.ts
git commit -m "feat(pr-review): wire up CLI with reviewer module"
```

---

### Task 5.3: Add review rules

**Files:**

- Create: `packages/pr-review/src/rules/pr-review.md`
- Create: `packages/pr-review/src/rules/clean-code-dotnet.md`

**Step 1: Copy rules from user's existing files**

Run:

```bash
mkdir -p packages/pr-review/src/rules
cp /Users/matetsaava/RiderProjects/credo/PR-Reviewer/.cursor/rules/pr-review.mdc packages/pr-review/src/rules/pr-review.md
cp /Users/matetsaava/RiderProjects/credo/PR-Reviewer/.cursor/docs/clean-code-dotnet.md packages/pr-review/src/rules/clean-code-dotnet.md
```

**Step 2: Commit**

```bash
git add packages/pr-review/src/rules/
git commit -m "feat(pr-review): add review rules and clean code guide"
```

---

## Phase 6: Polish and Testing

### Task 6.1: Add init command

**Files:**

- Create: `packages/pr-review/src/commands/init.ts`

**Step 1: Create init command**

Create `packages/pr-review/src/commands/init.ts`:

```typescript
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import chalk from "chalk";

const DEFAULT_CONFIG = {
  azureDevOps: {
    pat: "${AZURE_DEVOPS_PAT}",
    defaultOrg: "",
    defaultProject: "",
  },
  llm: {
    provider: "claude",
    model: "claude-sonnet-4-20250514",
  },
  rules: {
    path: "./rules/pr-review.md",
    cleanCodeGuide: "./rules/clean-code-dotnet.md",
  },
};

export function initConfig(location: "local" | "global" = "global"): void {
  let configPath: string;
  let configDir: string;

  if (location === "local") {
    configDir = process.cwd();
    configPath = join(configDir, ".pr-review.json");
  } else {
    configDir = join(homedir(), ".pr-review");
    configPath = join(configDir, "config.json");
  }

  if (existsSync(configPath)) {
    console.log(chalk.yellow(`Config already exists at ${configPath}`));
    return;
  }

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  console.log(chalk.green(`Created config at ${configPath}`));
  console.log(chalk.dim("\nNext steps:"));
  console.log("1. Set AZURE_DEVOPS_PAT environment variable");
  console.log("2. Set your LLM API key (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)");
  console.log("3. Update defaultOrg and defaultProject in config");
}
```

**Step 2: Update CLI to support init command**

Update `packages/pr-review/src/cli.ts` to add init subcommand (add before parseSync):

```typescript
  .command("init", "Initialize configuration file", (yargs) => {
    return yargs.option("local", {
      describe: "Create config in current directory instead of home",
      type: "boolean",
      default: false,
    });
  }, (argv) => {
    const { initConfig } = await import("./commands/init.js");
    initConfig(argv.local ? "local" : "global");
    process.exit(0);
  })
```

**Step 3: Commit**

```bash
git add packages/pr-review/
git commit -m "feat(pr-review): add init command for config setup"
```

---

### Task 6.2: Build and test end-to-end

**Step 1: Build all packages**

Run:

```bash
pnpm install
pnpm build
```

**Step 2: Test CLI help**

Run:

```bash
node packages/pr-review/dist/cli.js --help
```

Expected: Shows usage information

**Step 3: Test with dry run (requires env vars)**

Run:

```bash
export AZURE_DEVOPS_PAT="your-pat"
export ANTHROPIC_API_KEY="your-key"
node packages/pr-review/dist/cli.js --org credobank --project CSSOldApi --pr 28310 --dry-run
```

Expected: Fetches PR and shows what would be posted

**Step 4: Commit any fixes**

```bash
git add .
git commit -m "chore: fix build issues and polish CLI"
```

---

### Task 6.3: Update root README

**Files:**

- Create: `packages/pr-review/README.md`

**Step 1: Create package README**

Create `packages/pr-review/README.md`:

````markdown
# @azure-devops/pr-review

AI-powered PR review CLI for Azure DevOps.

## Installation

```bash
npm install -g @azure-devops/pr-review
# or
npx @azure-devops/pr-review --help
```
````

## Setup

1. Set environment variables:

```bash
export AZURE_DEVOPS_PAT="your-personal-access-token"
export ANTHROPIC_API_KEY="sk-ant-..."  # or OPENAI_API_KEY
```

2. (Optional) Create config file:

```bash
pr-review init
```

## Usage

```bash
# Basic usage
pr-review --org myorg --project MyProject --pr 123

# With specific LLM provider
pr-review --org myorg --project MyProject --pr 123 --provider openai --model gpt-4o

# Dry run (show review without posting)
pr-review --org myorg --project MyProject --pr 123 --dry-run
```

## Configuration

Config file locations (checked in order):

1. `.pr-review.json` (current directory)
2. `~/.pr-review/config.json` (home directory)

Example config:

```json
{
  "azureDevOps": {
    "defaultOrg": "myorg",
    "defaultProject": "MyProject"
  },
  "llm": {
    "provider": "claude",
    "model": "claude-sonnet-4-20250514"
  }
}
```

## Exit Codes

- `0` - No blocking issues found
- `1` - Blocking issues found
- `2` - Error occurred

````

**Step 2: Commit**

```bash
git add packages/pr-review/README.md
git commit -m "docs(pr-review): add README with usage instructions"
````

---

## Summary

After completing all tasks, you will have:

1. **Monorepo structure** with pnpm workspaces
2. **@azure-devops/core** - Shared Azure DevOps client library
3. **@azure-devops/mcp** - Existing MCP server (moved)
4. **@azure-devops/pr-review** - New CLI tool with:
   - PAT authentication
   - Configurable LLM providers (Claude, OpenAI, Azure OpenAI)
   - Custom review rules
   - Inline comments + summary posting
   - Dry run mode
   - Exit codes for CI/CD integration

Total estimated tasks: 18 tasks across 6 phases.
