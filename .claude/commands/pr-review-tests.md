# Professional Test Review for Pull Request

Conduct a comprehensive test review focusing on test coverage, quality, edge cases, and KISS principles. Ensure tests are simple, clean, and correctly validate the solution.

## Usage

```
/pr-review-tests
```

## Test Review Principles

**KISS-Focused Test Review:**
- **Simple Tests**: Each test should have a single, clear purpose
- **Clean Structure**: Tests follow Arrange-Act-Assert (AAA) pattern
- **Readable**: Test names and structure clearly communicate intent
- **Independent**: Tests don't depend on each other or external state
- **Minimal Complexity**: Avoid over-engineered test setups or clever tricks
- **Correct Validation**: Tests actually verify what they claim to test

## Implementation

### Phase 1: PR and Test Analysis
1. **Fetch PR Details**
   - Use `gh pr view --json number,title,url,body` to get PR information for current branch
   - If no PR exists, show error and exit
   - Download PR diff using `gh pr diff`
   - Identify test files and production code changes

2. **Test Discovery**
   - Locate all test files in the PR using common patterns (test/, spec/, *test*, *spec*, etc.)
   - Identify which production code changes have corresponding tests
   - Map test files to the functionality they're testing

### Phase 2: Test Quality Assessment
1. **Test Structure & KISS Evaluation**
   - **AAA Pattern**: Arrange-Act-Assert structure adherence
   - **Test Naming**: Descriptive names that explain what's being tested
   - **Single Purpose**: Each test focuses on one specific behavior
   - **Test Organization**: Logical grouping and describe blocks
   - **Setup Simplicity**: Minimal, clear test setup without complexity

2. **Test Coverage Analysis**
   - **Functionality Coverage**: All new/changed code paths tested
   - **Edge Cases**: Boundary conditions and error scenarios covered
   - **Happy Path**: Normal operation scenarios tested
   - **Error Handling**: Exception and failure cases validated
   - **Input Validation**: Various input types and ranges tested

3. **Test Independence & Reliability**
   - **No Dependencies**: Tests don't rely on other tests or external state
   - **Deterministic**: Tests produce consistent results
   - **Fast Execution**: Tests run quickly without unnecessary delays
   - **Clean Environment**: Tests clean up after themselves
   - **Isolated**: Tests don't affect global state or other tests

### Phase 3: Validation Correctness
1. **Assertion Quality**
   - **Specific Assertions**: Tests check exact expected outcomes
   - **Meaningful Messages**: Clear failure messages for debugging
   - **Complete Validation**: All relevant aspects of behavior verified
   - **Appropriate Matchers**: Right assertion types for the validation

2. **Test Data & Scenarios**
   - **Representative Data**: Test data reflects real-world usage
   - **Edge Cases**: Minimum/maximum values, empty inputs, null handling
   - **Error Scenarios**: Invalid inputs and failure conditions
   - **Business Logic**: Core functionality thoroughly validated

### Phase 4: Professional Feedback Generation
1. **Structured Review Format**
   - **Summary**: Overall test quality and coverage assessment
   - **Strengths**: Good testing practices observed
   - **Coverage Analysis**: Missing test scenarios and gaps
   - **Test Quality**: Structure, readability, and KISS compliance
   - **Edge Cases**: Unhandled boundary conditions and error scenarios
   - **Action Items**: Prioritized recommendations for improvement

2. **Professional Communication**
   - Constructive and educational tone
   - Specific examples of test improvements needed
   - Recognition of good testing practices
   - Clear explanations for suggested changes
   - Prioritized feedback (critical vs. recommended)

### Phase 5: Post Review Comment
1. **Format Professional Comment**
   - Use GitHub markdown with clear sections
   - Include code examples where helpful
   - Provide specific test case suggestions
   - Link test gaps to specific functionality

2. **Submit Review**
   - Use `gh pr review --comment --body "review-content"` with PR number from current branch
   - Choose appropriate review type based on test completeness
   - Post comprehensive feedback as single structured comment

## Arguments

- `$CURRENT_BRANCH_PR`: GitHub PR number for current branch (detected automatically)

## Test Review Template Structure

```markdown
## 🧪 Test Review Summary

**Overall Assessment**: [Brief summary of test quality and completeness]

## ✅ Testing Strengths
- [Good testing practices observed]
- [Well-structured tests worth highlighting]

## 📊 Coverage Analysis
- **Functionality Coverage**: [Assessment of feature coverage]
- **Edge Cases**: [Boundary conditions and error scenarios]
- **Test Completeness**: [Overall coverage adequacy]

## 🔧 Test Quality & KISS Principles
- **Structure**: [AAA pattern and organization feedback]
- **Simplicity**: [Test complexity and clarity assessment]  
- **Independence**: [Test isolation and reliability]

## 🎯 Missing Test Scenarios

### Critical (Must Add)
- [Essential test cases missing]

### Recommended (Should Add)  
- [Important edge cases to cover]

### Optional (Nice to Have)
- [Additional scenarios for robustness]

## 📚 Test Improvement Suggestions
[Specific recommendations for better test structure and coverage]
```

## Error Handling

- **No PR for current branch**: Clear error if no PR exists for the current branch
- **No Tests**: Guidance when PR lacks test files entirely
- **Permission Issues**: Help with GitHub authentication
- **Large Test Suites**: Efficient handling of extensive test files

## Integration Notes

- **GitHub CLI Integration**: Uses `gh pr view`, `gh pr diff`, and `gh pr review`
- **Test Framework Agnostic**: Works with various testing frameworks
- **KISS Focus**: Emphasizes simple, clean test design
- **Quality Over Coverage**: Prioritizes meaningful tests over metrics

## Best Practices Applied

1. **KISS Principle Focus**: Promotes simple, readable test design
2. **Comprehensive Coverage**: Ensures critical scenarios are tested  
3. **Quality Assessment**: Evaluates test effectiveness, not just presence
4. **Professional Communication**: Educational and constructive feedback
5. **Edge Case Focus**: Emphasizes boundary and error condition testing
6. **Test Independence**: Ensures reliable, maintainable test suites
7. **Clear Prioritization**: Critical vs. optional test improvements
8. **Actionable Feedback**: Specific, implementable suggestions

## Success Metrics

- All new/changed functionality has appropriate test coverage
- Tests follow KISS principles with clear, simple structure
- Edge cases and error scenarios are adequately covered
- Tests are independent, reliable, and maintainable
- Missing critical test scenarios are clearly identified
- Feedback is professional, educational, and actionable
- Test quality improvements are prioritized and explained
- Review promotes sustainable testing practices

This command transforms test review from a superficial coverage check into a comprehensive quality assessment that ensures robust, maintainable, and effective test suites following KISS principles.