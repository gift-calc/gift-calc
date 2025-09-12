---
description: Launch three specialized sub-agents to execute parallel PR reviews
argument-hint: <pr-number-or-url>
---

# Comprehensive Pull Request Review

Launch three specialized sub-agents in parallel to execute the existing PR review commands: `/pr-code-review`, `/pr-docs-review`, and `/pr-tests-review`.

## Usage

```
/pr-review <pr-number-or-url>
```

## Examples

```
/pr-review 42
/pr-review https://github.com/owner/repo/pull/15
/pr-review #23
```

## Implementation

I'll launch three specialized sub-agents to execute the existing review commands in parallel:

**Agent 1: Code Review**
Execute `/pr-code-review $ARGUMENTS` - focuses on architecture, structure, readability, and KISS principles.

**Agent 2: Documentation Review** 
Execute `/pr-docs-review $ARGUMENTS` - analyzes accuracy, completeness, clarity, and user experience.

**Agent 3: Test Review**
Execute `/pr-tests-review $ARGUMENTS` - evaluates coverage, quality, edge cases, and reliability.

Each sub-agent will independently execute their specialized review command and post professional feedback as separate GitHub comments on the PR.

Starting parallel review execution now...