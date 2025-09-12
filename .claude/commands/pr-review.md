---
description: Launch three specialized sub-agents to execute parallel PR reviews for current branch
---

# Comprehensive Pull Request Review

Launch three specialized sub-agents in parallel to execute the existing PR review commands: `/pr-review-code`, `/pr-review-docs`, and `/pr-review-tests`.

## Usage

```
/pr-review
```

## Implementation

I'll launch three specialized sub-agents to execute the existing review commands in parallel:

**Agent 1: Code Review**
Execute `/pr-review-code` - focuses on architecture, structure, readability, and KISS principles.

**Agent 2: Documentation Review** 
Execute `/pr-review-docs` - analyzes accuracy, completeness, clarity, and user experience.

**Agent 3: Test Review**
Execute `/pr-review-tests` - evaluates coverage, quality, edge cases, and reliability.

First, I'll check if there's an active PR for the current branch and get its details, then launch the three specialized sub-agents to execute their review commands in parallel.

**Error Handling:**
- If no PR exists for the current branch, I'll provide a clear error message
- If multiple PRs are found, I'll ask for clarification
- All sub-agents will use the same PR information from the current branch