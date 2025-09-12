---
argument-hint: <product-requirement-description>
description: Create a PRD and GitHub issue from product requirement
allowed-tools: Bash(gh:*)
---

# Create PRD-Based GitHub Issue

Create a Product Requirements Document (PRD) following KISS principles and post it as a GitHub issue.

## Usage

```
/create-issue <product-requirement-description>
```

## Implementation

### Phase 1: Requirement Analysis
1. **Parse Product Requirement**
   - Extract key features from `$ARGUMENTS`
   - Identify user goals and pain points
   - **Ask for clarification** if any of the following are unclear:
     - Who is the target user?
     - What specific problem does this solve?
     - What does success look like?
     - Are there any constraints or limitations?
     - What's the expected user flow?

2. **Generate PRD**
   - Keep it simple and focused
   - User-centric approach
   - Actionable requirements

### Phase 2: GitHub Issue Creation
1. **Format as GitHub Issue**
   - Use structured template
   - Include appropriate labels
   - Add clear acceptance criteria

2. **Post to Repository**
   - Use `gh issue create`
   - Apply relevant labels

## PRD Structure

```markdown
## Product Requirements Document

### Overview
**Problem**: [What problem does this solve?]
**Solution**: [What are we building?]
**Users**: [Who will use this?]

### Goals
- [Specific goal 1]
- [Specific goal 2]
- [Success metric]

### User Stories
- As a [user], I want [goal] so that [benefit]
- As a [user], I want [goal] so that [benefit]

### Requirements
**Functional**:
- [Requirement 1]
- [Requirement 2]

**Technical**:
- [Simple implementation approach]
- [Integration needs]

### Acceptance Criteria
- [ ] [Testable requirement 1]
- [ ] [Testable requirement 2]
- [ ] [Quality requirement]

### Definition of Done
- [ ] Feature implemented
- [ ] Tests passing
- [ ] Documentation updated
```

## Command Execution

1. Parse `$ARGUMENTS` for requirement details
2. **If unclear, ask user for clarification** before proceeding
3. Generate PRD using template
4. Create GitHub issue with `gh issue create`
5. Apply labels: `enhancement`, `needs-planning`
6. Display created issue URL

## Arguments

- `$ARGUMENTS`: Product requirement description