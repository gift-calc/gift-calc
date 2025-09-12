# Contributing to Gift Calculator

We love contributions! Gift Calculator is an open source project that thrives on community involvement. There are many ways you can help make this tool even better.

## 🐛 Report Bugs & Request Features

Found a bug or have an idea for a new feature? We want to hear about it!

- **Bug Reports**: [Create an issue](https://github.com/gift-calc/gift-calc/issues/new?template=bug_report.md) with details about the problem
- **Feature Requests**: [Submit an enhancement](https://github.com/gift-calc/gift-calc/issues/new?template=feature_request.md) with your ideas
- **Questions**: Start a [GitHub Discussion](https://github.com/gift-calc/gift-calc/discussions) for general questions

## 🔧 Contribute Code

Ready to get your hands dirty? Here's how to contribute code:

### 1. Fork the Repository

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR-USERNAME/gift-calc.git
cd gift-calc
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/awesome-new-feature
# or
git checkout -b fix/bug-description
```

### 3. Make Your Changes

- Write clean, readable code
- Follow the existing code style (2 spaces, consistent patterns)
- Add tests for new functionality where applicable
- Keep commits focused and atomic

### 4. Test Your Changes

```bash
# Test the CLI locally
node index.js --help
node index.js -b 100 -v 25 -f 8

# Link and test globally
npm link
gift-calc --help
gcalc -b 50

# Run tests
npm test
npm run test:coverage
```

### 5. Submit a Pull Request

- Push your branch to your fork
- [Create a pull request](https://github.com/gift-calc/gift-calc/compare) from your branch
- Fill out the PR template with details about your changes
- Reference any related issues (e.g., "Fixes #123")

## 📋 Code Style Guidelines

- **Indentation**: Use 2 spaces (no tabs)
- **Functions**: Keep them small and focused on one task  
- **Variables**: Use descriptive names (`friendScore` not `fs`)
- **Comments**: Add comments for complex logic, algorithms, or non-obvious code
- **Error Handling**: Provide helpful error messages with suggested fixes
- **Consistency**: Follow existing patterns in the codebase

## 📝 Development Setup

```bash
# Clone and setup
git clone https://github.com/gift-calc/gift-calc.git
cd gift-calc
npm install

# Test locally
node index.js --help
node index.js -b 100

# Link for global testing
npm link
gift-calc --help
gcalc --help

# Run tests
npm test
npm run test:coverage
npm run test:watch
```

## 🧪 Testing

We use [Vitest](https://vitest.dev/) for testing. Run different test suites:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run specific test suites
npm run test:core
npm run test:algorithm
npm run test:config
npm run test:interactive
```

## 🎉 Spread the Word

You can also contribute by:

- ⭐ **Star the repository** to show your support
- 🐦 **Share on social media** with friends and colleagues
- 📝 **Write blog posts** about how you use gift-calc
- 💬 **Mention it in developer communities** when someone needs a gift calculation tool
- 🎤 **Give talks** about the project at meetups or conferences

## 🙏 Recognition

All contributors are valued and will be:

- Listed in our contributors section
- Mentioned in release notes for significant contributions  
- Given credit in commit messages and PR descriptions
- Invited to join our community discussions

## 📞 Getting Help

Need help with contributing? Don't hesitate to:

- 💬 Join our [GitHub Discussions](https://github.com/gift-calc/gift-calc/discussions)
- 📧 Comment on existing issues for guidance
- 🔍 Look at recent PRs for examples of good contributions
- 📖 Check the [documentation](https://gift-calc.github.io)

## 🤝 Code of Conduct

Please note that this project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

## 📄 License

By contributing, you agree that your contributions will be licensed under the ISC License.

---

**Thank you for making Gift Calculator better for everyone!** 🎁