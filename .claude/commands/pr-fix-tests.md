# Fix Test Issues from PR Review

Address test review feedback by implementing test improvements based on review comments. Focuses specifically on test quality, coverage, and correctness while following KISS principles and testing best practices.

## Usage

```
/pr-fix-tests <pr-number-or-url>
```

## Examples

```
/pr-fix-tests 42
/pr-fix-tests https://github.com/owner/repo/pull/15
/pr-fix-tests #23
```

## Testing Principles

**KISS-Focused Testing:**
- **Simple Tests**: Each test has a single, clear purpose
- **Clean Structure**: Follow Arrange-Act-Assert (AAA) pattern
- **Readable Names**: Test names clearly communicate intent
- **Independent**: Tests don't depend on each other
- **Correct Validation**: Tests actually verify what they claim to test

## Scope

**Handles:**
- **Test coverage gaps** (missing critical scenarios)
- **Test structure improvements** (AAA pattern, clarity)
- **Edge case additions** (boundary conditions, error scenarios)
- **Test independence issues** (removing dependencies)
- **Assertion quality** (specific, meaningful validations)
- **Test reliability** (flaky test fixes)
- **Performance** (slow test optimizations)

**Does NOT Handle:**
- Production code logic changes
- Documentation updates
- Build configuration modifications

## Implementation

### Phase 1: Review Analysis
1. **Fetch PR Test Review Comments**
   - Get review feedback from GitHub PR
   - Filter for test-related comments only
   - Extract specific test improvement suggestions

2. **Categorize Test Issues by Priority**
   - **Critical**: Missing essential test coverage, broken tests
   - **Quality**: Structure improvements, better assertions
   - **Coverage**: Missing edge cases, error scenarios
   - **Performance**: Slow or unreliable tests

### Phase 2: Test Fix Implementation
1. **Coverage Gaps First**
   - Add missing critical test scenarios
   - Cover edge cases and boundary conditions
   - Add error handling and validation tests
   - Ensure all new functionality is tested

2. **Quality Improvements**
   - **Apply AAA Pattern**: Structure tests clearly (Arrange-Act-Assert)
   - **Improve Test Names**: Make test intent crystal clear
   - **Simplify Setup**: Remove unnecessary complexity
   - **Better Assertions**: Use specific, meaningful validations
   - **Fix Dependencies**: Make tests independent and reliable

### Phase 3: Validation and Testing
1. **Verify Test Correctness**
   - Run all tests to ensure they pass
   - Validate tests actually catch the bugs they're designed to find
   - Ensure tests are reliable and not flaky
   - Check test performance and execution time

2. **Test Quality Check**
   - Verify tests follow KISS principles
   - Ensure each test has a single purpose
   - Confirm tests are readable and maintainable

### Phase 4: Commit Changes
1. **Professional Commit**
   - Use `/commit-push` command for conventional commits
   - Group related test improvements logically

### Phase 5: PR Communication
1. **Post Summary Comment**
   - Use `gh pr comment` to post a professional comment explaining fixes
   - Summarize what test issues were addressed
   - Use professional, concise tone
   - Reference specific review feedback that was resolved

## Arguments

- `$ARGUMENTS`: GitHub PR number or URL

## Testing Best Practices Applied

1. **AAA Pattern**: Arrange (setup) - Act (execute) - Assert (verify)
2. **Single Responsibility**: One test, one behavior
3. **Descriptive Names**: Test names explain what is being tested
4. **Test Independence**: No shared state or dependencies
5. **Fast and Reliable**: Quick execution, consistent results
6. **Meaningful Assertions**: Specific validation with clear failure messages

## Success Criteria

- **All critical test coverage gaps filled**
- **Tests follow AAA pattern and KISS principles**
- **Edge cases and error scenarios properly covered**
- **Tests are independent, reliable, and fast**
- **Assertions are specific and meaningful**
- **Professional commit created via `/commit-push`**
- **Professional PR comment posted explaining fixes**