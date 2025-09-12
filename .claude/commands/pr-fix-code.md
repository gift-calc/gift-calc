# Fix Code and Architecture Issues from PR Review

Address code and architecture review feedback by implementing fixes based on review comments. Focuses specifically on code logic, structure, and architectural improvements while excluding documentation and tests.

## Usage

```
/pr-fix-code <pr-number-or-url>
```

## Examples

```
/pr-fix-code 42
/pr-fix-code https://github.com/owner/repo/pull/15
/pr-fix-code #23
```

## Scope

**Handles:**
- Code logic and algorithm improvements
- Architecture and design pattern fixes
- Performance optimizations
- Security vulnerabilities
- Code structure and organization
- Naming conventions and readability
- Error handling improvements
- CI/CD configuration fixes

**Does NOT Handle:**
- Documentation updates
- Test additions or modifications

## Implementation

### Phase 1: Review Analysis
1. **Fetch PR Review Comments**
   - Get review feedback from GitHub PR
   - Filter for code and architecture-related comments only
   - Extract file-specific and line-specific feedback

2. **Categorize Code Issues**
   - **Critical**: Security vulnerabilities, breaking logic
   - **Architecture**: Design patterns, structure improvements
   - **Performance**: Optimization opportunities
   - **Quality**: Readability, naming, error handling
   - **CI/CD**: Build and deployment configuration issues

### Phase 2: Fix Implementation
1. **Process Each Code Issue**
   - Read affected files
   - Implement specific fixes addressing review comments
   - Maintain existing code patterns and conventions
   - Follow KISS principles for simplicity and clarity

2. **Apply Fixes Systematically**
   - Address one logical fix at a time
   - Preserve functionality while improving code
   - Follow existing project conventions
   - Ensure changes address specific review feedback

### Phase 3: Validation and Commit
1. **Verify Code Quality**
   - Run project tests if available
   - Ensure no regressions introduced
   - Validate that fixes address review concerns

2. **Commit Changes**
   - Use `/commit-push` command to handle proper conventional commits
   - Automatically stages changes and pushes to remote

## Arguments

- `$ARGUMENTS`: GitHub PR number or URL

## Success Criteria

- All code and architecture review comments addressed
- Code quality improved without over-engineering
- Changes maintain project conventions
- Professional commit created via `/commit-push`