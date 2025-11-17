# Contributing to x402 BNB

Thank you for your interest in contributing to x402 BNB! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `pnpm install`
4. Create a feature branch: `git checkout -b feature/your-feature`

## Development Setup

### Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher
- Git

### Building

```bash
# Build all packages
pnpm build

# Build specific package
cd packages/core
pnpm build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for specific package
cd packages/core
pnpm test
```

### Linting

```bash
# Lint all packages
pnpm lint

# Format code
pnpm format
```

## Code Style

- **Language**: All code, comments, and documentation must be in English
- **No vendor-specific references**: Avoid referencing specific companies or vendors in code
- **TypeScript**: Use TypeScript for all source files
- **Formatting**: Use Prettier (configured via `.prettierrc`)
- **Linting**: Follow ESLint rules (configured via `.eslintrc.json`)

### Naming Conventions

- Use camelCase for variables and functions
- Use PascalCase for types, interfaces, and classes
- Use SCREAMING_SNAKE_CASE for constants
- Use descriptive names that convey meaning

### Comments and Documentation

- Add JSDoc comments for all public APIs
- Include examples in documentation where helpful
- Keep comments concise and clear
- Document complex logic with inline comments

## Commit Guidelines

We follow conventional commits:

```
type(scope): subject

body

footer
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks

### Examples

```
feat(core): add batch payment support

Implement batch payment creation and signing with multiple
recipients and tokens.

Closes #123
```

```
fix(middleware-express): correct header parsing

Fix issue where X-PAYMENT header wasn't properly decoded
when containing special characters.
```

## Pull Request Process

1. **Update documentation**: Include relevant documentation updates
2. **Add tests**: Ensure new features have test coverage
3. **Pass CI**: All tests and linting must pass
4. **Describe changes**: Provide clear PR description
5. **Link issues**: Reference related issues in PR description

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

Description of testing performed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests passing
- [ ] No linting errors
```

## Adding New Features

When adding new features:

1. **Discuss first**: Open an issue to discuss significant features
2. **Design doc**: For major features, create a design document
3. **Backward compatibility**: Maintain backward compatibility when possible
4. **Documentation**: Update relevant documentation
5. **Examples**: Add examples demonstrating usage

## Package Structure

When working with packages:

- `packages/core` - Core SDK functionality
- `packages/middleware-express` - Express middleware
- `packages/middleware-hono` - Hono middleware
- `packages/facilitator` - Facilitator service
- `examples/` - Example implementations

## Testing Guidelines

- Write unit tests for all new functions
- Include integration tests for major features
- Test edge cases and error conditions
- Mock external dependencies appropriately
- Aim for >80% code coverage

## Documentation

- Update README files for affected packages
- Add JSDoc comments to public APIs
- Include code examples in documentation
- Keep documentation in sync with code changes

## Questions or Issues?

- Open an issue for bugs or feature requests
- Join our community discussions
- Check existing issues before creating new ones

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Follow GitHub's Community Guidelines

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.

## Acknowledgments

Thank you for contributing to x402 BNB and helping build the future of gasless, programmable payments!

---

This project is inspired by the [x402 protocol](https://github.com/coinbase/x402). We appreciate all contributors to the original project and the broader web3 community.

