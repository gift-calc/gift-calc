# Professional Code Review for Pull Request

Conduct a comprehensive code review focusing on architecture, code structure, readability, and KISS principles. Post professional feedback as a comment on the PR.

## Usage

```
/pr-code-review <pr-number-or-url>
```

## Examples

```
/pr-code-review 42
/pr-code-review https://github.com/owner/repo/pull/15
/pr-code-review #23
```

## Review Principles

**KISS-Focused Code Review:**
- **Simplicity Assessment**: Evaluate if the solution is the simplest that works
- **Clean Code Standards**: Check for readable, self-documenting code
- **Minimal Complexity**: Identify unnecessary abstractions or over-engineering
- **Correctness**: Ensure the code works reliably and handles edge cases
- **Best Practices**: Verify adherence to common patterns and conventions
- **Maintainability**: Assess long-term code health and sustainability

## Implementation

### Phase 1: PR Analysis
1. **Fetch PR Details**
   - Use `gh pr view $ARGUMENTS` to get comprehensive PR information
   - Parse PR title, description, changed files, and linked issues
   - Download PR diff using `gh pr diff $ARGUMENTS`

2. **Context Understanding**
   - Review PR description and acceptance criteria
   - Identify the problem being solved and approach taken
   - Understand the scope and impact of changes

### Phase 2: Code Analysis
1. **Architecture Review**
   - **System Integration**: How changes fit into existing architecture
   - **Separation of Concerns**: Proper layering and module boundaries
   - **Design Patterns**: Appropriate use of established patterns
   - **Dependencies**: Minimal and appropriate dependency management
   - **Scalability Impact**: Long-term architectural health

2. **Code Structure Assessment**
   - **File Organization**: Logical structure and naming conventions
   - **Function/Class Design**: Single responsibility and appropriate size
   - **Code Duplication**: DRY principle adherence
   - **Error Handling**: Proper exception management and edge cases
   - **Performance Considerations**: Efficient algorithms and resource usage

3. **Readability & KISS Evaluation**
   - **Code Clarity**: Self-documenting code with clear intent
   - **Naming Conventions**: Descriptive and consistent naming
   - **Comment Quality**: Appropriate use of comments for complex logic
   - **Simplicity**: Absence of unnecessary complexity or clever tricks
   - **Consistency**: Alignment with existing codebase patterns

### Phase 3: Quality Assessment
1. **Security & Best Practices**
   - Security vulnerabilities assessment
   - Input validation and sanitization
   - Error message information disclosure

### Phase 4: Professional Feedback Generation
1. **Structured Review Format**
   - **Summary**: Overall assessment and key findings
   - **Strengths**: Positive aspects and good practices observed
   - **Architecture & Design**: High-level structural feedback
   - **Code Quality**: Specific improvements and suggestions
   - **KISS Compliance**: Simplicity and clarity observations
   - **Action Items**: Prioritized list of recommended changes

2. **Professional Communication**
   - Constructive and respectful tone
   - Specific, actionable feedback with examples
   - Appreciation for good practices found
   - Educational explanations for suggestions
   - Clear prioritization of feedback (critical vs. optional)

### Phase 5: Post Review Comment
1. **Format Professional Comment**
   - Use GitHub markdown formatting for clarity
   - Include code snippets where relevant
   - Structure feedback with clear sections
   - Provide constructive suggestions with reasoning

2. **Submit Review**
   - Use `gh pr review $ARGUMENTS --comment --body "review-content"`
   - Choose appropriate review type (comment/approve/request-changes)
   - Ensure review is posted as a comprehensive single comment

## Arguments

- `$ARGUMENTS`: GitHub PR number (e.g., `42`, `#42`) or full PR URL

## Review Template Structure

```markdown
## 🔍 Code Review Summary

**Overall Assessment**: [Brief summary of PR quality and readiness]

## ✅ Strengths
- [Positive observations about architecture, code quality, or approach]
- [Good practices that should be highlighted]

## 🏗️ Architecture & Design
- [High-level structural feedback]
- [Integration with existing system assessment]

## 💡 Code Quality & KISS Principles
- [Specific code improvements]
- [Simplicity and readability observations]

## 🎯 Action Items

### Critical (Must Fix)
- [Issues that block merge]

### Recommended (Should Fix)
- [Important improvements for code health]

### Optional (Nice to Have)
- [Minor suggestions for enhancement]

## 📚 Learning Notes
[Educational context or explanations for suggestions]
```

## Error Handling

- **Invalid PR**: Clear error if PR doesn't exist or isn't accessible
- **Permission Issues**: Guide user to check GitHub authentication
- **Large PRs**: Handle PRs with many files efficiently
- **Network Issues**: Graceful handling of GitHub API failures

## Integration Notes

- **GitHub CLI Integration**: Uses `gh pr view`, `gh pr diff`, and `gh pr review`
- **Professional Standards**: Constructive, educational, and respectful feedback
- **KISS Focus**: Emphasizes simplicity and clarity in all recommendations
- **Project Alignment**: Considers existing codebase patterns and conventions

## Best Practices Applied

1. **KISS Principle Focus**: Every recommendation promotes simplicity
2. **Professional Communication**: Respectful, constructive feedback
3. **Comprehensive Analysis**: Multi-layered review approach
4. **Educational Value**: Explanations that teach best practices
5. **Actionable Feedback**: Specific, implementable suggestions
6. **Positive Recognition**: Highlighting good practices and strengths
7. **Clear Prioritization**: Critical vs. optional feedback distinction
8. **Collaborative Tone**: Encouraging discussion and learning

## Success Metrics

- Review covers architecture, structure, readability, and KISS principles
- Feedback is professional, constructive, and actionable
- Review comment is well-structured and easy to follow
- Positive practices are recognized and reinforced
- Critical issues are clearly identified and explained
- Educational value is provided for improvement suggestions
- Review promotes code simplicity and maintainability
- Author receives clear guidance for addressing feedback

This command transforms code review from a perfunctory process into a valuable learning opportunity that elevates code quality while maintaining professional standards and collaborative spirit.