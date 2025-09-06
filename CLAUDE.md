# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `gift-calc`, a CLI tool that calculates gift amounts with configurable randomness and relationship-based bias. It's published as an npm package with dual command names: `gift-calc` (primary) and `gcalc` (short alias).

## Sibling Repositories

This project has two related repositories that should be kept synchronized:

1. **Homebrew Tap**: `homebrew-gift-calc` (likely at `../homebrew-gift-calc`) - Contains the Homebrew formula for installing gift-calc via `brew tap gift-calc/homebrew-gift-calc && brew install gift-calc`
2. **Website**: `gift-calc.github.io` (likely at `../gift-calc.github.io`) - GitHub Pages site providing documentation and web interface at https://gift-calc.github.io

**IMPORTANT**: After making changes to functionality, command-line interface, or configuration, always ensure documentation is updated in:
- `README.md` in this repository
- The website documentation in the `gift-calc.github.io` repository
- Homebrew formula if installation methods or dependencies change

## Development Commands

```bash
# Local development and testing
node index.js --help                 # Test CLI locally
node index.js -b 100 -v 30 -f 7     # Test with parameters
node index.js init-config            # Test config initialization

# Package management  
npm link                             # Link for global testing
npm version patch|minor|major        # Bump version
npm publish                          # Publish to npm registry

# Testing both commands after linking
gift-calc --help
gcalc -b 50 -f 8
```

## Architecture

**Single-file CLI structure** (`index.js`):
- Pure Node.js CLI tool with no external dependencies
- All functionality contained in one executable file
- Uses native Node.js modules: `fs`, `path`, `os`, `readline`

**Key components:**
1. **Config System**: Loads/saves user defaults from `~/.config/gift-calc/.config.json`
2. **Command Parser**: Manual argument parsing with support for `init-config` command
3. **Interactive Setup**: Uses `readline` for `init-config` prompts
4. **Algorithm**: `calculateGiftAmount()` applies variation and friend-score bias

**Configuration Flow**:
- Config loaded at startup via `loadConfig()`
- Priority: CLI args > config file > built-in defaults
- `init-config` creates/updates config file interactively

**Command Structure**:
- Both `gift-calc` and `gcalc` commands point to same `index.js`
- Special handling for `init-config` as first argument
- Standard CLI options: `-b/--basevalue`, `-v/--variation`, `-f/--friend-score`

## GitHub Tool Usage

**IMPORTANT**: Always use the `gh` CLI tool for GitHub-related tasks when possible. This includes:
- Creating and managing pull requests: `gh pr create`, `gh pr view`, `gh pr merge`
- Managing issues: `gh issue create`, `gh issue list`, `gh issue close`
- Repository operations: `gh repo view`, `gh repo clone`, `gh repo create`
- GitHub Pages: `gh api repos/owner/repo/pages` for configuration
- Releases: `gh release create`, `gh release list`
- Working with GitHub Actions: `gh run list`, `gh run view`

The `gh` tool provides better integration, authentication, and error handling than manual git operations for GitHub-specific tasks.

## Git Commit Guidelines

### Conventional Commits Format
This project uses **Conventional Commits** for consistent messaging and automated semantic versioning:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types and Semantic Versioning Impact

**Core Types (trigger version bumps):**
- `feat:` - New feature (triggers **MINOR** version bump)
- `fix:` - Bug fix (triggers **PATCH** version bump)  
- `perf:` - Performance improvements (triggers **PATCH** version bump)
- `BREAKING CHANGE:` - Breaking change (triggers **MAJOR** version bump)

**Non-Release Types (no version bump):**
- `docs:` - Documentation changes only
- `style:` - Code formatting, whitespace (no logic changes)
- `refactor:` - Code refactoring (no feature/fix/perf change)
- `test:` - Test additions/modifications
- `build:` - Build system changes (webpack, npm scripts, etc.)
- `ci:` - CI/CD configuration changes (.github/workflows, etc.)
- `chore:` - Maintenance tasks (dependency updates, tooling)

### Examples

**Version Bump Examples:**
```bash
feat: add --quiet flag to suppress output          # → Minor bump (1.2.0 → 1.3.0)
fix: resolve config file parsing error             # → Patch bump (1.2.0 → 1.2.1) 
perf: optimize calculation algorithm                # → Patch bump (1.2.0 → 1.2.1)
feat!: remove deprecated --old-flag option         # → Major bump (1.2.0 → 2.0.0)
```

**No Version Bump Examples:**
```bash
docs: update README with new installation steps    # → No release
test: add tests for config validation               # → No release  
ci: update GitHub Actions workflow                  # → No release
chore: update dependencies to latest versions       # → No release
style: fix code formatting and indentation         # → No release
refactor: reorganize utility functions              # → No release
```

**Breaking Changes:** Add `!` after type or include `BREAKING CHANGE:` in footer.

### ⚠️ Important: Choose the Right Commit Type

**Ask yourself: "Does this change affect the published library functionality?"**

- **If YES** → Use `feat:`, `fix:`, or `perf:` (triggers version bump)
- **If NO** → Use `docs:`, `test:`, `ci:`, `chore:`, `style:`, or `refactor:` (no version bump)

**Common Mistakes to Avoid:**
```bash
# ❌ WRONG - These don't change library functionality:
fix: update GitHub Actions Node.js version        # Should be: ci:
fix: add missing tests for edge cases             # Should be: test:  
fix: update README installation instructions      # Should be: docs:
fix: update dependencies to latest versions       # Should be: chore:

# ✅ CORRECT - These DO change library functionality:
fix: resolve config file parsing error            # Actual bug fix
feat: add --quiet flag to suppress output         # New feature
perf: optimize calculation algorithm               # Performance improvement
```

**Key Rule:** Only use `fix:` for actual bugs that affect end users of the library, not for fixing tests, documentation, or CI issues.

### Setup Pre-commit Validation

```bash
# Install pre-commit hooks (requires Python)
pip install pre-commit
pre-commit install --hook-type commit-msg

# Interactive commit helper
npm run commit
```

**IMPORTANT**: Keep all commit messages clean and professional. No AI attribution or generated content references.

## Publishing Process

### Automated Publishing Workflow
The project uses **semantic-release** for fully automated publishing via GitHub Actions on pushes to master:

1. **Make Changes**: Edit code using conventional commits
2. **Push to Master**: GitHub Action automatically:
   - Runs tests
   - Executes `semantic-release` which handles all publishing logic
   - **semantic-release automatically**:
     - Analyzes commit messages for version determination
     - Bumps version using semantic versioning (`major`, `minor`, or `patch`) 
     - Generates and updates `CHANGELOG.md`
     - Creates git tag and commits back to repository
     - Publishes to npm registry with provenance
     - Creates GitHub release with release notes
   - Updates Homebrew formula (if new version published)
   - Syncs core logic to website (if core files changed)

### semantic-release Configuration
**Powered by `semantic-release`** - the industry-standard tool with 2M+ weekly downloads:
- Configuration in `.releaserc.json`
- Plugins: commit-analyzer, release-notes-generator, changelog, npm, github, git

**Semantic Version Determination**:
- `feat:` commits → **Minor** version bump (new features)
- `fix:`, `perf:` commits → **Patch** version bump (bug fixes, improvements)  
- `BREAKING CHANGE` or `!` suffix → **Major** version bump (breaking changes)
- `docs:`, `test:`, `ci:`, `chore:`, `style:`, `refactor:` → **No version bump**
- Uses Angular Commit Message Conventions by default

**Workflow Features**:
- ✅ **Battle-tested**: Used by thousands of open source projects
- ✅ **Automated changelog**: Generates CHANGELOG.md from commits
- ✅ **npm provenance**: Enhanced supply-chain security
- ✅ **GitHub releases**: Automatic release creation with notes
- ✅ **Zero configuration**: Works out-of-the-box with conventional commits
- ✅ **Test locally**: `scripts/test-workflow.sh` (requires GitHub token for full test)

**Key Benefits**: 
- Industry-standard semantic versioning approach
- Automatic changelog and release notes generation
- Enhanced security with npm package provenance  
- Robust error handling and rollback by semantic-release
- Less custom code to maintain

### Manual Version Control
For special cases, you can still manually control versions:
```bash
npm version patch|minor|major  # Manual version bump
git push origin master --tags  # Trigger automated publishing
```

### Package Contents
Published package includes: `index.js`, `.config-example.json`, `README.md`, `gift-calc.1`, `LICENSE` as defined in the `files` field.

## Important Implementation Details

- **Config Path**: `~/.config/gift-calc/.config.json` (created automatically)
- **Algorithm**: Friend score creates bias by adjusting random variation probability
- **Error Handling**: Graceful fallback to defaults if config file is corrupted
- **Help System**: Comprehensive help with examples for both command names
- **Version Compatibility**: Requires Node.js >= 14.0.0