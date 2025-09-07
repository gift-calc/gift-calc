# Commit and push changes with proper conventional commits

Analyze current changes and create an appropriate conventional commit message, then commit and push to remote.

## Usage

```
/commit
```

## Implementation

1. **Check git status** to see staged and unstaged changes
2. **Analyze the changes** to determine the appropriate commit type
3. **Suggest commit message** following Conventional Commits standards
4. **Ask for confirmation** of the suggested commit type and message
5. **Stage all changes** (including unstaged files and untracked files if appropriate) and create commit
6. **Push to remote** repository

## Commit Types (Semantic Versioning)

### Core Types (trigger version bumps):
- `feat:` - New feature (triggers **MINOR** version bump)
- `fix:` - Bug fixes and minor improvements (triggers **PATCH** version bump)  
- `perf:` - Performance improvements (triggers **PATCH** version bump)
- `feat!:` or `BREAKING CHANGE:` - Breaking change (triggers **MAJOR** version bump)

### Non-Release Types (no version bump):
- `docs:` - Documentation changes only
- `style:` - Code formatting, whitespace (no logic changes)
- `refactor:` - Code refactoring (no feature/fix/perf change)
- `test:` - Test additions/modifications
- `build:` - Build system changes (webpack, npm scripts, etc.)
- `ci:` - CI/CD configuration changes (.github/workflows, etc.)
- `chore:` - Maintenance tasks (dependency updates, tooling)

## Important Guidelines

**Choose the Right Commit Type:**
- **Does this change affect the published library functionality?**
  - If YES → Use `feat:`, `fix:`, or `perf:` (triggers version bump)
  - If NO → Use `docs:`, `test:`, `ci:`, `chore:`, `style:`, or `refactor:` (no version bump)

**Fix Type Includes:**
- Bug fixes that affect end users
- Minor improvements that don't qualify as features
- Small enhancements to existing functionality

**Common Mistakes to Avoid:**
- ❌ `fix: update GitHub Actions Node.js version` → Should be: `ci:`
- ❌ `fix: add missing tests for edge cases` → Should be: `test:`  
- ❌ `fix: update README installation instructions` → Should be: `docs:`
- ❌ `fix: update dependencies to latest versions` → Should be: `chore:`

**Critical Rules:**
- All commit messages MUST be clean and professional
- NEVER include AI attribution, Claude references, or generated content mentions
- Commit messages should appear as if written by a human developer
- Use `fix:` for actual bugs and minor improvements that affect end users
- Don't use `fix:` for tests, documentation, or CI issues

## Notes

- Uses `gh` CLI tool for GitHub operations when possible
- Follows semantic versioning conventions for automated versioning
- Commits are pushed to the current branch
- The LLM will analyze changes and suggest appropriate commit message format