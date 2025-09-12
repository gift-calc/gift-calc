---
description: "Fix lint errors and warnings across programming languages"
allowed-tools: ["bash", "read", "write", "edit", "multiedit", "grep", "glob", "todowrite"]
---

# Fix Lint Errors

Systematically detect, analyze, and fix lint errors and warnings across all programming languages. This command works with any linter by using project-specific lint commands defined in CLAUDE.md and applying safe, targeted fixes while preserving code functionality.

## Usage

```bash
/fix-lint
```

## Systematic Approach

### **Step 1: Detect Lint Configuration**
- Search for common lint configuration files
- Check CLAUDE.md for defined lint commands
- Identify available linters in the project

### **Step 2: Run Linter and Identify Issues**
- Execute lint commands defined in CLAUDE.md
- Collect all lint errors and warnings with their severity levels
- Group issues by type: formatting, style, potential bugs, unused code

### **Step 3: Classify and Prioritize Issues**

#### **Safe Fixes (High Priority)**
- Code formatting (indentation, spacing, line endings)
- Import sorting and organization
- Unused imports/variables (safe to remove)
- Quoting consistency
- Trailing whitespace removal

#### **Potential Bug Fixes (Medium Priority)**
- Undefined variables
- Type mismatches (when type information available)
- Unused function parameters
- Dead code elimination

#### **Style Improvements (Low Priority)**
- Naming conventions
- Code structure improvements
- Documentation improvements

### **Step 4: Apply Fixes Systematically**

#### **Safe Automated Fixes**
- **Formatting**: Apply consistent indentation, spacing, and line breaks
- **Imports**: Sort and organize imports, remove unused imports
- **Variables**: Remove unused variables and imports
- **Whitespace**: Remove trailing whitespace, fix line endings
- **Quotes**: Standardize quote usage when project convention is clear

#### **Manual Review Required**
- **Logic issues**: Any change that could affect behavior
- **API changes**: Changes to function signatures or interfaces
- **Configuration**: Changes to build or runtime configuration
- **Documentation**: Comments or documentation that might be intentionally absent

### **Step 5: Validation**
- Re-run lint commands from CLAUDE.md to verify fixes
- Run project tests to ensure no functionality was broken
- Check for any new issues introduced by the fixes

## Safety Principles

### **Never Break Functionality**
- **Priority 1**: Preserve existing behavior
- **Priority 2**: Improve code quality
- **Priority 3**: Enhance code style

### **Conservative Approach**
- Apply only changes that are clearly safe
- When in doubt, leave the code as-is
- Follow existing project patterns strictly
- Preserve comments and documentation

### **Incremental Application**
- Fix one issue at a time
- Validate each fix before proceeding

## Best Practices

### **Project Conventions**
- Follow existing code style exactly
- Preserve intentional formatting choices
- Respect `.gitignore` and other ignore files
- Don't override explicit configuration

### **Safety Checks**
- Always run tests after applying fixes
- Verify no functionality is changed
- Check git diff to review all changes
- Ensure fixes don't introduce new warnings

### **Error Handling**
- Skip files that can't be parsed
- Handle linter execution errors gracefully
- Log issues that can't be automatically fixed
- Provide clear feedback on what was fixed

## Success Criteria

**Command completion requires:**

✅ **All safe lint errors fixed**: Formatting, unused imports, style issues resolved  
✅ **No functionality broken**: All tests pass and behavior preserved  
✅ **Clean code state**: Linter reports zero errors or only safe warnings  
✅ **Consistent style**: Code follows project conventions and patterns  
✅ **Minimal changes**: Only necessary fixes applied, no over-engineering  
✅ **Proper validation**: Linter and tests confirm successful fixes  

## Notes

- This command prioritizes safety over completeness - it's better to leave a minor issue than risk breaking functionality
- When lint rules conflict, follow project-specific configuration over general best practices
- Some lint issues may require human judgment - these will be noted but not automatically fixed
- The command works best with well-configured linters that provide clear error messages and suggestions
- Always refer to CLAUDE.md for project-specific lint commands and validation procedures