#!/bin/bash

# Install git hooks for development
# Run this script after cloning the repository

echo "Installing git hooks..."

# Copy pre-push hook
cp scripts/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push

echo "✅ Git hooks installed successfully"
echo "Tests will now run automatically before pushing to master"