# Fix Documentation Issues from PR Review

Address documentation review feedback by implementing fixes based on review comments. Focuses specifically on documentation improvements with **correctness as the highest priority**.

## Usage

```
/pr-fix-docs
```

## Core Principle: Correctness First

**Documentation accuracy is paramount** - incorrect documentation is worse than no documentation. Every fix must be verified for technical correctness before implementation.

## Scope

**Handles:**
- **Technical accuracy corrections** (highest priority)
- **Factual error fixes** (commands, examples, procedures)
- **Link validation and correction**
- **Version and compatibility information updates**
- Completeness improvements (missing sections)
- Clarity and language enhancements
- Structure and formatting fixes
- Example verification and correction

**Does NOT Handle:**
- Code logic changes
- Test modifications
- Build configuration updates

## Implementation

### Phase 1: Review Analysis
1. **Fetch PR Documentation Review Comments**
   - Get review feedback from GitHub PR for current branch
   - If no PR exists, show error and exit
   - Filter for documentation-related comments only
   - **Prioritize accuracy and correctness issues first**

2. **Categorize Documentation Issues by Priority**
   - **Critical**: Technical inaccuracies, wrong commands, broken examples
   - **High**: Missing essential information, broken links
   - **Medium**: Completeness gaps, unclear explanations
   - **Low**: Formatting, minor language improvements

### Phase 2: Correctness-First Fix Implementation
1. **Verify Before Fixing**
   - **Test all commands and examples** before documenting them
   - **Validate technical accuracy** of all information
   - **Check current functionality** to ensure documentation matches reality
   - **Verify links and references** work correctly

2. **Apply Fixes with Validation**
   - Fix technical errors first, then clarity issues
   - Ensure every example can be executed successfully
   - Validate that procedures actually work as documented
   - Maintain consistent and accurate terminology

### Phase 3: Quality Assurance and Commit
1. **Double-Check Correctness**
   - Re-verify all technical information is accurate
   - Test examples and commands one final time
   - Ensure no new inaccuracies were introduced

2. **Commit and Push Changes**
   - Execute `/commit-push` command for professional conventional commits

### Phase 4: PR Communication
1. **Post Summary Comment**
   - Use `gh pr comment` to post a professional comment explaining fixes
   - Summarize what documentation issues were addressed
   - Use professional, concise tone
   - Reference specific review feedback that was resolved

## Arguments

- `$CURRENT_BRANCH_PR`: GitHub PR number for current branch (detected automatically)

## Success Criteria

- **All technical inaccuracies corrected and verified**
- **All examples tested and confirmed working**
- **All links validated and functional**
- **Documentation review comments addressed**
- **Clear, correct, and simple documentation maintained**
- **Professional commit created and pushed via `/commit-push` command**
- **Professional PR comment posted explaining fixes**