---
name: Bug Report
description: Report a bug to help us improve Gift Calculator
title: "[BUG] "
labels: ["bug"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report! Please provide as much detail as possible to help us understand and reproduce the issue.

  - type: textarea
    id: bug-description
    attributes:
      label: Bug Description
      description: A clear and concise description of what the bug is
      placeholder: Describe the bug in a few sentences
    validations:
      required: true

  - type: textarea
    id: steps-to-reproduce
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior
      placeholder: |
        1. Run command 'gift-calc ...'
        2. See error
    validations:
      required: true

  - type: textarea
    id: expected-behavior
    attributes:
      label: Expected Behavior
      description: A clear and concise description of what you expected to happen
      placeholder: What should have happened?
    validations:
      required: true

  - type: textarea
    id: actual-behavior
    attributes:
      label: Actual Behavior
      description: A clear and concise description of what actually happened
      placeholder: What actually happened?
    validations:
      required: true

  - type: textarea
    id: error-messages
    attributes:
      label: Error Messages
      description: If you encountered any error messages, please paste them here
      placeholder: Paste any error messages, stack traces, or console output
      render: shell

  - type: input
    id: gift-calc-version
    attributes:
      label: Gift Calculator Version
      description: What version of Gift Calculator are you using?
      placeholder: "Run: gift-calc --version"
    validations:
      required: true

  - type: input
    id: node-version
    attributes:
      label: Node.js Version
      description: What version of Node.js are you using?
      placeholder: "Run: node --version"
    validations:
      required: true

  - type: dropdown
    id: operating-system
    attributes:
      label: Operating System
      description: What operating system are you using?
      options:
        - macOS
        - Linux
        - Windows
        - Other
    validations:
      required: true

  - type: dropdown
    id: installation-method
    attributes:
      label: Installation Method
      description: How did you install Gift Calculator?
      options:
        - npm
        - Homebrew
        - Install script
        - Docker
        - From source
        - Other
    validations:
      required: true

  - type: textarea
    id: additional-context
    attributes:
      label: Additional Context
      description: Add any other context about the problem here
      placeholder: Any additional information that might be helpful

  - type: checkboxes
    id: terms
    attributes:
      label: Checklist
      description: Please confirm the following
      options:
        - label: I have searched existing issues to make sure this bug hasn't been reported yet
          required: true
        - label: I have provided all the requested information above
          required: true
        - label: I am able to reproduce this bug consistently
          required: false