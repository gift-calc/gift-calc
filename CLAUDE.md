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

**Core Types:**
- `feat:` - New feature (triggers **MINOR** version bump)
- `fix:` - Bug fix (triggers **PATCH** version bump)  
- `BREAKING CHANGE:` - Breaking change (triggers **MAJOR** version bump)

**Additional Types:**
- `docs:` - Documentation changes
- `style:` - Code formatting (no logic changes)
- `refactor:` - Code refactoring (no feature/fix)
- `perf:` - Performance improvements
- `test:` - Test additions/modifications
- `build:` - Build system changes
- `ci:` - CI/CD configuration changes
- `chore:` - Maintenance tasks

### Examples

```bash
feat: add --quiet flag to suppress output
fix: resolve config file parsing error
docs: update README with new installation steps
feat!: remove deprecated --old-flag option
```

**Breaking Changes:** Add `!` after type or include `BREAKING CHANGE:` in footer.

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
The project uses **automated publishing** via GitHub Actions on pushes to master:

1. **Make Changes**: Edit code using conventional commits
2. **Push to Master**: GitHub Action automatically:
   - Runs tests
   - Detects core changes since last published version
   - Bumps version automatically (`npm version patch`)
   - Creates git tag on master branch
   - Publishes to npm registry
   - Updates Homebrew formula
   - Syncs core logic to website

### Change Detection Logic
Publishing is triggered when changes are detected in core files since the **last published git tag**:
- `index.js` (main CLI file)
- `src/` directory (if present)
- `package.json` (excluding version-only changes)

**Key Benefit**: Fixes accumulated over multiple commits are published together, even if individual commits only contain test fixes.

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