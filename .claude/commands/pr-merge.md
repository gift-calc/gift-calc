---
description: "Merge current branch PR and delete feature branch following best practices"
allowed-tools: ["bash", "read", "write"]
---

# Pull Request Merge

Merge the pull request for the current branch and delete the feature branch following GitHub best practices. This command handles the complete merge workflow safely.

## Usage

```bash
/pr-merge
```

## Quick Start

!git branch --show-current
!git status
!gh pr view

## Pre-Merge Checklist

### 1. **Branch Validation**
```bash
# Ensure we're not on master/main
!git branch --show-current | grep -v -E "^(master|main)$"

# Check if PR exists for current branch
!gh pr view --json title,state,mergeable
```

### 2. **Working Directory Check**
```bash
# Check for uncommitted changes
!git status --porcelain

# Verify clean working directory
!git diff-index --quiet HEAD --
```

### 3. **PR Readiness Check**
```bash
# Check PR status and requirements
!gh pr view --json state,mergeStateStatus,reviewDecision,commits
```

## Merge Process

### **Step 1: Validation**
```bash
# Check current branch and PR
!git branch --show-current
!gh pr view

# Verify PR is open and mergeable
!gh pr view --json state,mergeable | grep -E '"state": "OPEN".*"mergeable": "MERGEABLE"'
```

### **Step 2: Merge Strategy**
```bash
# Merge with appropriate strategy (defaults to merge commit)
!gh pr merge --merge --delete-branch
```

### **Step 3: Verification**
```bash
# Verify PR is merged
!gh pr view

# Verify local branch is deleted
!git branch --show-current

# Check if remote branch still exists (should be deleted)
!git ls-remote --heads origin $(git branch --show-current 2>/dev/null || echo "deleted")
```

### **Step 4: Cleanup**
```bash
# Switch to base branch (master/main)
!git checkout master

# Pull latest changes
!git pull origin master

# Verify clean state
!git status
```

## Merge Strategies

### **Default: Merge Commit**
```bash
# Create merge commit (preserves full history)
!gh pr merge --merge --delete-branch
```

### **Alternative: Squash Merge**
```bash
# Squash commits into single commit (cleaner history)
!gh pr merge --squash --delete-branch
```

### **Alternative: Rebase Merge**
```bash
# Rebase commits onto base branch (linear history)
!gh pr merge --rebase --delete-branch
```

## Error Handling & Recovery

### **PR Not Found**
```bash
# No PR exists for current branch
!gh pr create --title "Feature: $(git branch --show-current)" --body "Auto-generated PR"
```

### **Merge Conflicts**
```bash
# Check merge conflicts
!gh pr view --json mergeStateStatus | grep '"MERGEABLE"'

# Manual resolution required
!git fetch origin
!git merge origin/master --no-ff
```

### **Permission Issues**
```bash
# Check GitHub authentication
!gh auth status

# Verify merge permissions
!gh repo view --defaultBranch
```

## Safety Procedures

### **Backup Before Merge**
```bash
# Create tag backup of current branch state
!git tag "pre-merge-$(git branch --show-current)-$(date +%Y%m%d-%H%M%S)"

# View backup tags
!git tag -l "pre-merge-*"
```

### **Rollback Plan**
```bash
# If merge fails, restore from tag
!git checkout master
!git reset --hard "pre-merge-branch-name-date"

# Or restore branch and recreate PR
!git checkout -b branch-name "pre-merge-branch-name-date"
!git push origin branch-name --force
```

## Project Integration

### **Project Configuration**
- Base branch is typically 'master' (check CLAUDE.md)
- Uses `gh` CLI for GitHub operations
- Follows project's merge strategy preferences

## Troubleshooting

### **Common Issues**
1. **No PR found**: Create PR first or ensure branch has upstream
2. **Merge conflicts**: Resolve manually or use appropriate strategy
3. **Permission denied**: Verify GitHub access and branch protections
4. **Protected branch rules**: Ensure all requirements are met

### **Get Help**
```bash
# Get GitHub CLI help
!gh pr merge --help
!gh help pr

# Check project documentation
!cat README.md
!cat CLAUDE.md
```