# PR Review CLI Tool - Design Document

**Date:** 2026-01-31
**Status:** Approved

## Overview

A standalone CLI tool that automates PR code reviews using AI. It fetches PR diffs from Azure DevOps, analyzes them using configurable LLM providers, and posts inline comments with a summary.

### Goals

1. **CLI tool** for PR review with PAT authentication
2. **Configurable LLM** providers (Claude, Azure OpenAI, OpenAI)
3. **Custom review rules** from existing `pr-review.md` and `clean-code-dotnet.md`
4. **Inline comments** + summary comment on PRs
5. **Shareable** - teammates can install via npm/npx

### Future (Out of Scope for MVP)

- Azure DevOps pipeline automation (trigger on PR creation)
- Browser-based authentication
- Web UI

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     pr-review CLI                        │
├─────────────────────────────────────────────────────────┤
│  CLI Parser (yargs)                                      │
│    ↓                                                     │
│  Config Loader (PAT, LLM settings, review rules)         │
│    ↓                                                     │
│  Azure DevOps Client (fetch PR, diff, post comments)     │
│    ↓                                                     │
│  LLM Adapter (Claude | Azure OpenAI | OpenAI)            │
│    ↓                                                     │
│  Comment Poster (inline threads + summary)               │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure (Monorepo)

```
azure-devops-mcp-fork/
├── packages/
│   ├── core/                    # Shared Azure DevOps client
│   │   ├── src/
│   │   │   ├── client.ts        # Azure DevOps API wrapper
│   │   │   ├── auth.ts          # PAT authentication
│   │   │   ├── types.ts         # Shared types
│   │   │   └── pr/
│   │   │       ├── fetch.ts     # Fetch PR, iterations, diffs
│   │   │       └── comment.ts   # Post comments
│   │   └── package.json         # @azure-devops/core
│   │
│   ├── mcp-server/              # Existing MCP server (moved)
│   │   ├── src/
│   │   └── package.json         # @azure-devops/mcp
│   │
│   └── pr-review/               # NEW: CLI tool
│       ├── src/
│       │   ├── cli.ts           # CLI entry point
│       │   ├── config.ts        # Config loader
│       │   ├── llm/
│       │   │   ├── adapter.ts   # LLM interface
│       │   │   ├── claude.ts
│       │   │   ├── azure-openai.ts
│       │   │   └── openai.ts
│       │   ├── reviewer.ts      # Main review logic
│       │   └── rules/
│       │       ├── pr-review.md
│       │       └── clean-code-dotnet.md
│       └── package.json         # @azure-devops/pr-review
│
├── package.json                 # Workspace root
└── pnpm-workspace.yaml
```

---

## Configuration

### Config File

Location: `~/.pr-review/config.json` or project-level `.pr-review.json`

```json
{
  "azureDevOps": {
    "pat": "${AZURE_DEVOPS_PAT}",
    "defaultOrg": "credobank",
    "defaultProject": "CSSOldApi"
  },
  "llm": {
    "provider": "claude",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "model": "claude-sonnet-4-20250514"
  },
  "rules": {
    "path": "./rules/pr-review.md",
    "cleanCodeGuide": "./rules/clean-code-dotnet.md"
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AZURE_DEVOPS_PAT` | Azure DevOps Personal Access Token |
| `ANTHROPIC_API_KEY` | Claude API key |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL |
| `OPENAI_API_KEY` | OpenAI API key |

### CLI Usage

```bash
# Basic usage
pr-review --org credobank --project CSSOldApi --pr 28310

# With overrides
pr-review --pr 28310 --provider azure-openai --model gpt-4o

# Dry run (show comments without posting)
pr-review --pr 28310 --dry-run

# Initialize config
pr-review init
```

---

## Execution Flow

```
1. Parse CLI args + load config
       ↓
2. Authenticate to Azure DevOps (PAT)
       ↓
3. Fetch PR metadata (title, branch, author)
       ↓
4. Fetch PR iterations → get latest iteration
       ↓
5. Fetch changed files list
       ↓
6. For each changed file:
   → Fetch file diff (unified diff format)
       ↓
7. Build LLM prompt:
   - System: review rules (pr-review.md)
   - Context: clean-code-dotnet.md (summarized)
   - User: PR metadata + all diffs
       ↓
8. Send to LLM → get structured response
       ↓
9. Parse response → extract issues with:
   - file, line, severity, message, fix
       ↓
10. Post inline comments (one thread per issue)
       ↓
11. Post summary comment with counts
       ↓
12. Exit with code based on BLOCK count
```

### Exit Codes

- `0` - No blockers found
- `1` - BLOCK issues found (useful for pipeline gates)

---

## LLM Integration

### Prompt Structure

```
┌─────────────────────────────────────────┐
│ SYSTEM PROMPT                           │
│ - Your role: Senior Principal Engineer  │
│ - Review rules (pr-review.md content)   │
│ - Output format (JSON for parsing)      │
└─────────────────────────────────────────┘
           +
┌─────────────────────────────────────────┐
│ USER PROMPT                             │
│ - PR metadata (title, branch, author)   │
│ - File diffs (unified diff format)      │
│ - Clean code guidelines (condensed)     │
└─────────────────────────────────────────┘
```

### LLM Response Format

```json
{
  "issues": [
    {
      "file": "/src/Controller.cs",
      "line": 42,
      "severity": "BLOCK",
      "category": "Architecture",
      "message": "Your roast here...",
      "fix": "Move to service layer"
    }
  ],
  "summary": "Review complete. BLOCK: 1 | HIGH: 2 | MEDIUM: 3"
}
```

### TypeScript Interfaces

```typescript
interface LLMAdapter {
  review(prompt: ReviewPrompt): Promise<ReviewResult>;
}

interface ReviewResult {
  issues: Issue[];
  summary: string;
}

interface Issue {
  file: string;
  line: number;
  severity: 'BLOCK' | 'HIGH' | 'MEDIUM';
  category: string;
  message: string;  // The witty roast
  fix: string;      // The actual fix
}
```

---

## Installation & Usage

### For Teammates

```bash
# Install globally
npm install -g @azure-devops/pr-review

# Or run directly with npx
npx @azure-devops/pr-review --org credobank --project CSSOldApi --pr 28310
```

### First-Time Setup

```bash
# Set environment variables
export AZURE_DEVOPS_PAT="your-pat-here"
export ANTHROPIC_API_KEY="sk-ant-..."

# Optional: create config file
pr-review init
```

### Example Output

```
$ pr-review --pr 28310

🔍 Fetching PR #28310...
📂 Found 3 changed files
🤖 Analyzing with Claude...

Posted 5 comments:
  • BLOCK: Architecture (UserController.cs:42)
  • HIGH: Naming (LoanService.cs:15)
  • MEDIUM: Clean Code (Utils.cs:88)
  ...

📝 Summary posted.

Result: 1 BLOCK | 2 HIGH | 2 MEDIUM
Exit code: 1 (blockers found)
```

---

## Implementation Steps

### Phase 1: Monorepo Setup
1. Initialize pnpm workspace
2. Create `packages/core/` with shared Azure DevOps client
3. Move existing MCP server code to `packages/mcp-server/`
4. Verify existing functionality still works

### Phase 2: Core Package
1. Extract Azure DevOps client from MCP server
2. Implement PAT authentication
3. Implement PR fetch (metadata, iterations, diffs)
4. Implement comment posting (threads, replies)

### Phase 3: PR Review CLI
1. Create `packages/pr-review/` structure
2. Implement CLI parser with yargs
3. Implement config loader
4. Copy and adapt review rules

### Phase 4: LLM Adapters
1. Define adapter interface
2. Implement Claude adapter
3. Implement Azure OpenAI adapter
4. Implement OpenAI adapter

### Phase 5: Review Logic
1. Build prompt from PR data + rules
2. Parse LLM response
3. Post comments to Azure DevOps
4. Generate summary

### Phase 6: Polish
1. Add `--dry-run` mode
2. Add `pr-review init` command
3. Error handling and logging
4. Documentation

---

## Dependencies

### Core Package
- `azure-devops-node-api` - Azure DevOps REST API client
- `zod` - Schema validation

### PR Review CLI
- `yargs` - CLI argument parsing
- `@anthropic-ai/sdk` - Claude API
- `openai` - OpenAI API
- `@azure/openai` - Azure OpenAI API
- `dotenv` - Environment variable loading
- `chalk` - Terminal colors
