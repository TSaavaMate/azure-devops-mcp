# @azure-devops/pr-review

AI-powered PR review CLI for Azure DevOps.

## Installation

```bash
npm install -g @azure-devops/pr-review
# or
npx @azure-devops/pr-review --help
```

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

# Specify repository (if different from project name)
pr-review --org myorg --project MyProject --repo MyRepo --pr 123
```

## Configuration

Config file locations (checked in order):

1. Path specified via `--config` option
2. `.pr-review.json` (current directory)
3. `~/.pr-review/config.json` (home directory)

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
  },
  "rules": {
    "path": "./rules/pr-review.md",
    "cleanCodeGuide": "./rules/clean-code-dotnet.md"
  }
}
```

## LLM Providers

| Provider | API Key Env Var | Default Model |
|----------|-----------------|---------------|
| claude | `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514 |
| openai | `OPENAI_API_KEY` | gpt-4o |
| azure-openai | `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT` | gpt-4o |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Review complete, no blocking issues |
| 1 | Review complete, blocking issues found |
| 2 | Error occurred |

## Custom Review Rules

You can provide custom review rules by creating a markdown file and referencing it in the config:

```json
{
  "rules": {
    "path": "./my-team-rules.md"
  }
}
```

The rules file should contain guidelines for the AI reviewer to follow when analyzing code.
