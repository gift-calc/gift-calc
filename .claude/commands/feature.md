# Create a new feature branch and switch to it

Create a new feature branch from master with a well-crafted name based on the feature description.

## Usage

```
/feature <feature-description>
```

## Examples

```
/feature add budget support
/feature implement user authentication
/feature create dark mode toggle
```

## Implementation

1. Switch to master branch and ensure it's up to date
2. Analyze the feature description to create a suitable branch name
3. Ask for confirmation of the proposed branch name
4. Create and switch to the new feature branch

## Arguments

- `$ARGUMENTS`: The feature description (required)

## Notes

- Feature branches are created from master by default
- The LLM will help craft a descriptive and conventional branch name
- User confirmation is required before creating the branch
- Branch names follow the pattern: `feature/<descriptive-name>`