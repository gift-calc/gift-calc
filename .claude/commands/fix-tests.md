---
description: "Analyze and fix failing tests using systematic root cause analysis"
allowed-tools: ["bash", "read", "write", "edit", "multiedit", "grep", "glob", "todowrite"]
---

# Fix Tests

Systematically analyze failing tests, determine root causes, and implement clean, correct fixes following KISS principles. This command works across all programming languages and test frameworks by prioritizing understanding over implementation details.

## Usage

```bash
/fix-tests
```

## Systematic Approach

### **Step 1: Execute Tests and Identify Failures**
- Run the project's test suite using commands defined in CLAUDE.md
- Gather detailed failure information and error messages
- Document which specific tests are failing and why

### **Step 2: Root Cause Analysis**

**CRITICAL: Determine the source of failure before proceeding**

#### **A) Business Logic Issues**
- Core functionality produces incorrect results
- Algorithm implementation errors
- Missing edge case handling
- Logic errors in the implementation

#### **B) Test Implementation Issues**  
- Incorrect test assertions or expectations
- Wrong expected values in test cases
- Flaky or unreliable test conditions
- Outdated test assumptions
- Missing or incorrect test setup

#### **C) Environmental Issues**
- Configuration problems
- Missing dependencies or setup
- Platform or environment-specific issues
- Timing or concurrency problems

### **Step 3: Decision Framework**

**Before implementing any fix, determine:**

1. **What is the expected behavior?**
   - Review project documentation and requirements
   - Examine related working tests and functionality
   - Understand the business logic requirements

2. **Is the test correct?**
   - Does the test accurately reflect the intended functionality?
   - Are the test assertions logical and appropriate?
   - Is the test setup and execution correct?

3. **Is the implementation correct?**
   - Does the code produce the expected results?
   - Are there unhandled edge cases or scenarios?
   - Is the business logic sound and complete?

### **Step 4: User Consultation (When Required)**

**⚠️ STOP and ask the user when:**
- The root cause is ambiguous or unclear
- Test expectations conflict with implementation behavior
- Multiple valid interpretations exist
- Business requirements are unclear

**Example consultation questions:**
- "The test expects X but the code produces Y. Which behavior is correct?"
- "This test seems to contradict the documented behavior. Should we update the test or the implementation?"
- "Multiple interpretations are possible. What is the intended behavior?"

### **Step 5: Implement Fixes**

#### **For Business Logic Fixes:**
- Locate the failing implementation code
- Understand the expected behavior from tests and documentation
- Implement minimal changes following existing patterns
- Ensure the fix addresses the root cause, not just symptoms

#### **For Test Implementation Fixes:**
- Review the failing test code
- Compare with similar working tests for patterns
- Update test assertions to match correct expected behavior
- Ensure test setup and teardown are appropriate

### **Step 6: Validation**
- Run the specific fixed tests using commands from CLAUDE.md
- Execute the full test suite using commands from CLAUDE.md
- Verify test coverage remains adequate using coverage commands from CLAUDE.md
- Confirm all related functionality still works correctly

## Quality Principles

### **KISS (Keep It Simple, Stupid)**
- Choose the simplest solution that correctly solves the problem
- Make minimal changes necessary to fix the issue
- Ensure fixes are clear and easy to understand
- Avoid introducing unnecessary complexity

### **Best Practices**
- **Single Responsibility**: Each fix addresses one specific issue
- **Backwards Compatibility**: Preserve existing functionality contracts
- **Consistency**: Follow existing code patterns and conventions
- **Clarity**: Write clear, self-documenting code

## Safety Procedures

### **Before Making Changes**
- Create backup of current state
- Document the current failure state
- Understand the scope of changes needed

### **Incremental Progress**
- Fix one test failure at a time
- Validate each fix before proceeding to the next
- Commit successful fixes individually
- Roll back if new issues are introduced

### **Validation Requirements**
- All tests must pass before completion
- No regressions in previously working functionality
- Code quality standards maintained
- Performance impact evaluated

## Success Criteria

**Command completion requires:**

✅ **All tests passing**: Complete test suite execution with zero failures  
✅ **Root cause identified**: Clear understanding of why each test failed  
✅ **Appropriate fixes implemented**: Correct solutions for business logic or test issues  
✅ **No regressions introduced**: All previously passing functionality preserved  
✅ **Clean, maintainable code**: Fixes follow project conventions and KISS principles  
✅ **User consultation completed**: Ambiguous cases discussed and resolved with user input  

## Notes

- This command prioritizes understanding problems thoroughly before implementing solutions
- When the root cause is unclear, always consult with the user before proceeding
- Focus on correctness over speed - proper analysis prevents incorrect fixes
- Maintain existing project patterns and conventions throughout the fix process
- Use incremental approach to ensure each fix is validated before moving to the next issue