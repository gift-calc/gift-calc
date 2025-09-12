# Professional Documentation Review for Pull Request

Conduct a comprehensive documentation review focusing on accuracy, completeness, clarity, and KISS principles. Ensure documentation is clean, simple, and most importantly, correct.

## Usage

```
/pr-docs-review <pr-number-or-url>
```

## Examples

```
/pr-docs-review 42
/pr-docs-review https://github.com/owner/repo/pull/15
/pr-docs-review #23
```

## Documentation Review Principles

**KISS-Focused Documentation Review:**
- **Simplicity First**: Documentation should be as simple as possible while being complete
- **Clear Language**: Plain English without unnecessary jargon or complexity
- **Logical Structure**: Information organized in intuitive, easy-to-follow order
- **Minimal Redundancy**: Avoid repeating information unnecessarily (DRY principle)
- **User-Focused**: Written for the intended audience's knowledge level
- **Correct Above All**: Accuracy is paramount - wrong documentation is worse than none

## Implementation

### Phase 1: PR and Documentation Analysis
1. **Fetch PR Details**
   - Use `gh pr view $ARGUMENTS` to get comprehensive PR information
   - Parse PR title, description, and changed files
   - Download PR diff using `gh pr diff $ARGUMENTS`
   - Identify all documentation files (*.md, *.rst, *.txt, docs/, etc.)

2. **Documentation Discovery**
   - Locate documentation files (README, docs/, *.md, *.rst, *.txt, etc.)
   - Identify which code changes require documentation updates
   - Map documentation to corresponding functionality
   - Check for new files that need documentation

### Phase 2: Content Quality Assessment
1. **Accuracy Verification**
   - **Technical Correctness**: All code examples, commands, and procedures work
   - **Up-to-Date Information**: Documentation reflects current functionality
   - **Correct Links**: All URLs and references are valid and working
   - **Version Consistency**: Version numbers and compatibility info are current
   - **Example Validation**: All examples can be executed successfully

2. **Completeness Analysis**
   - **Coverage**: All new/changed functionality is documented
   - **Prerequisites**: Required dependencies and setup steps included
   - **Use Cases**: Common scenarios and workflows covered
   - **Configuration**: All options and parameters explained
   - **Troubleshooting**: Common issues and solutions provided

3. **Clarity & KISS Evaluation**
   - **Plain Language**: Clear, simple language without unnecessary complexity
   - **Logical Flow**: Information presented in intuitive order
   - **Consistent Terminology**: Same terms used consistently throughout
   - **Appropriate Detail**: Right level of detail for target audience
   - **Scannable Structure**: Headings, bullets, and formatting aid readability

### Phase 3: Structure and Format Review
1. **Markdown Quality**
   - **Proper Formatting**: Correct use of headings, lists, code blocks
   - **Consistent Style**: Uniform formatting across all documentation
   - **Table Structure**: Well-formatted tables with clear headers
   - **Code Syntax**: Proper syntax highlighting and language specification
   - **Link Format**: Consistent link styles and proper anchor text

2. **Organization Assessment**
   - **Heading Hierarchy**: Logical H1, H2, H3 structure
   - **Table of Contents**: Navigation aids for long documents
   - **Section Length**: Appropriately sized sections for readability
   - **Cross-References**: Proper linking between related sections
   - **File Organization**: Logical placement within documentation structure

### Phase 4: User Experience Evaluation
1. **Accessibility & Usability**
   - **Getting Started**: Clear onboarding for new users
   - **Quick Reference**: Easy access to common tasks
   - **Search-Friendly**: Good headings and keywords for findability
   - **Mobile-Friendly**: Readable on various devices and screen sizes
   - **Example Quality**: Realistic, practical examples users can follow

2. **Maintenance Considerations**
   - **Update Requirements**: Clear process for keeping documentation current
   - **Version Control**: Proper tracking of documentation changes
   - **Ownership**: Clear responsibility for documentation maintenance
   - **Review Schedule**: Regular review and update processes

### Phase 5: Professional Feedback Generation
1. **Structured Review Format**
   - **Summary**: Overall documentation quality assessment
   - **Strengths**: Good documentation practices observed
   - **Accuracy Issues**: Technical errors and outdated information
   - **Completeness Gaps**: Missing documentation for functionality
   - **Clarity Improvements**: Language and structure suggestions
   - **Action Items**: Prioritized recommendations for improvement

2. **Professional Communication**
   - Constructive and educational tone
   - Specific examples of improvements needed
   - Recognition of good documentation practices
   - Clear explanations for suggested changes
   - Prioritized feedback (critical vs. recommended)

### Phase 6: Post Review Comment
1. **Format Professional Comment**
   - Use GitHub markdown with clear sections
   - Include specific examples and suggestions
   - Provide corrected examples where helpful
   - Link to relevant documentation standards

2. **Submit Review**
   - Use `gh pr review $ARGUMENTS --comment --body "review-content"`
   - Choose appropriate review type based on documentation quality
   - Post comprehensive feedback as single structured comment

## Arguments

- `$ARGUMENTS`: GitHub PR number (e.g., `42`, `#42`) or full PR URL

## Documentation Review Template Structure

```markdown
## 📚 Documentation Review Summary

**Overall Assessment**: [Brief summary of documentation quality and completeness]

## ✅ Documentation Strengths
- [Good documentation practices observed]
- [Well-structured content worth highlighting]

## 🎯 Accuracy & Correctness
- **Technical Accuracy**: [Verification of code examples and procedures]
- **Current Information**: [Assessment of up-to-date content]
- **Link Validation**: [Status of external references and links]

## 📋 Completeness Analysis
- **Feature Coverage**: [New functionality documentation status]
- **Missing Sections**: [Gaps in documentation coverage]
- **Use Case Coverage**: [Assessment of scenario documentation]

## 🔍 Clarity & KISS Principles
- **Language Quality**: [Plain language and simplicity assessment]
- **Structure**: [Organization and logical flow feedback]
- **User Experience**: [Ease of understanding and following]

## 🎯 Required Improvements

### Critical (Must Fix)
- [Essential documentation errors or omissions]

### Recommended (Should Fix)
- [Important clarity and completeness improvements]

### Optional (Nice to Have)
- [Minor enhancements for better user experience]

## 📝 Specific Suggestions
[Detailed recommendations with examples and corrections]
```

## Error Handling

- **Invalid PR**: Clear error if PR doesn't exist or isn't accessible
- **No Documentation**: Guidance when PR lacks documentation files
- **Permission Issues**: Help with GitHub authentication
- **Large Documentation Sets**: Efficient handling of extensive docs

## Integration Notes

- **GitHub CLI Integration**: Uses `gh pr view`, `gh pr diff`, and `gh pr review`
- **Format Agnostic**: Works with Markdown, reStructuredText, and other formats
- **KISS Focus**: Emphasizes simple, clear documentation design
- **Accuracy Priority**: Correctness takes precedence over style

## Best Practices Applied

1. **KISS Principle Focus**: Promotes simple, clear documentation
2. **Accuracy First**: Ensures technical correctness above all else
3. **Completeness Assessment**: Verifies comprehensive coverage
4. **User-Centered Review**: Focuses on reader experience and usability
5. **Professional Communication**: Educational and constructive feedback
6. **Structure Evaluation**: Ensures logical organization and flow
7. **Clear Prioritization**: Critical vs. optional improvements
8. **Actionable Feedback**: Specific, implementable suggestions

## Success Metrics

- All new/changed functionality is properly documented
- Documentation follows KISS principles with clear, simple language
- Technical accuracy is verified and errors are identified
- Content is complete and covers necessary use cases
- Structure and formatting enhance readability
- User experience is considered and optimized
- Critical documentation issues are clearly identified
- Feedback is professional, educational, and actionable

This command transforms documentation review from a superficial check into a comprehensive quality assessment that ensures accurate, complete, and user-friendly documentation following KISS principles.