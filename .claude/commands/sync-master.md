---
description: "Sync feature branch with master using rebase for clean history"
allowed-tools: ["bash", "read", "write"]
---

# Sync Feature Branch with Master

Safely sync the current feature branch with the latest master changes using rebase for clean, linear history. This command ensures all functionality is preserved while integrating upstream changes.

## Usage

```bash
/sync-master
```

## Quick Start

!git branch --show-current
!git status

## Pre-Sync Checklist

### 1. **Branch Validation**
```bash
# Ensure we're not on master
!git branch --show-current | grep -v master
```

### 2. **Working Directory Check**
```bash
# Check for uncommitted changes
!git status --porcelain
```

### 3. **Remote Connectivity**
```bash
# Verify remote access
!git ls-remote origin
```

## Sync Process

### **Step 1: Preparation**
```bash
# Stash any uncommitted changes
!git stash push -m "sync-master-backup-$(date +%Y%m%d-%H%M%S)"

# Fetch latest from remote
!git fetch origin master
```

### **Step 2: Analysis**
```bash
# Show commits that will be integrated
!git log --oneline master..HEAD
!git log --oneline HEAD..master
```

### **Step 3: Rebase**
```bash
# Start rebase process
!git rebase origin/master
```

### **Step 4: Conflict Resolution (if needed)**
```bash
# Check for conflicts
!git status --porcelain | grep "^UU"

# After resolving conflicts:
!git rebase --continue
```

### **Step 5: Verification**
```bash
# Run project tests (check CLAUDE.md for test command)
# Command will be determined from project configuration

# Check branch status
!git status
!git log --oneline -5
```

### **Step 6: Finalization**
```bash
# Pop stashed changes if any
!git stash pop

# Push updated branch
!git push origin HEAD --force-with-lease
```

## Conflict Resolution Guide

### **Detecting Conflicts**
```bash
# Check for merge conflicts
!git diff --name-only --diff-filter=U
!git status --porcelain | grep "^UU"
```

### **Resolving Conflicts**
1. **Open conflicted files** and look for conflict markers:
   ```
   <<<<<<< HEAD
   Your changes
   =======
   Master changes
   >>>>>>> origin/master
   ```

2. **Edit files** to resolve conflicts by keeping appropriate changes

3. **Stage resolved files**:
   ```bash
   !git add <resolved-file>
   ```

4. **Continue rebase**:
   ```bash
   !git rebase --continue
   ```

### **If Rebase Fails**
```bash
# Abort rebase and return to original state
!git rebase --abort

# Or skip problematic commit
!git rebase --skip
```

## Error Handling & Recovery

### **Network Issues**
```bash
# Check internet connection
!git ls-remote origin

# Retry failed operations
!git fetch origin master
```

### **Permission Issues**
```bash
# Check GitHub authentication
!gh auth status

# Verify push permissions (use current repository)
!gh repo view
```

### **Test Failures**
```bash
# Run project tests (check CLAUDE.md for specific test commands)
# Commands will be determined from project configuration
```

## Safety Procedures

### **Backup & Restore**
```bash
# Create backup before starting
!git stash push -m "sync-master-backup-$(date +%Y%m%d-%H%M%S)"

# View available stashes
!git stash list

# Restore if needed
!git stash pop stash@{0}
```

### **Rollback Plan**
```bash
# Reset to previous state if rebase fails
!git reset --hard ORIG_HEAD

# Or restore from backup
!git stash pop
```

## Quality Assurance

### **Pre-Sync Validation**
```bash
# Ensure tests pass before sync (check CLAUDE.md for test command)
# Command will be determined from project configuration

# Check current branch status
!git branch --show-current
!git log --oneline -5
```

### **Post-Sync Verification**
```bash
# Verify all tests pass (check CLAUDE.md for test command)
# Command will be determined from project configuration

# Check commit history
!git log --oneline -10

# Verify clean working directory
!git status
```

## Project Integration

### **Project Configuration**
- Test commands are defined in CLAUDE.md
- Build commands are defined in CLAUDE.md  
- Dependency installation commands are defined in CLAUDE.md
- Uses `gh` CLI for GitHub operations when available

### **Commit Workflow**
```bash
# After successful sync, execute /commit-push command
/commit-push
```

## Advanced Options

### **Alternative: Merge Strategy**
```bash
# If rebase is not preferred, use merge
!git merge origin/master --no-ff
```

### **Target Different Branch**
```bash
# Sync with main instead of master
!git fetch origin main
!git rebase origin/main
```

## Troubleshooting

### **Common Issues**
1. **Rebase conflicts**: Resolve manually and continue
2. **Test failures**: Fix issues before proceeding
3. **Network issues**: Check connection and retry
4. **Permission denied**: Verify GitHub access

### **Get Help**
```bash
# Get git help
!git help rebase
!git help stash

# Check project docs
!cat README.md
!cat CLAUDE.md
```