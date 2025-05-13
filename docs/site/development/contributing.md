# Contributing to Rex-ORM

Thank you for your interest in contributing to Rex-ORM! This guide will help you
get started with contributing to the project.

## Development Setup

### Prerequisites

- Deno 1.34.0 or newer
- Git
- A code editor (VS Code recommended)

### Clone the Repository

```bash
git clone https://github.com/username/rex-orm.git
cd rex-orm
```

### VS Code Setup

If you're using VS Code, add these recommended settings to your workspace:

```json
{
  "deno.enable": true,
  "deno.lint": true,
  "editor.formatOnSave": true,
  "[typescript]": { "editor.defaultFormatter": "denoland.vscode-deno" }
}
```

## Running Tests

Rex-ORM uses Deno's built-in testing framework. To run tests:

```bash
deno task test
```

To run tests with file watching:

```bash
deno task test:watch
```

To generate coverage reports:

```bash
deno task test:coverage
```

## Coding Standards

### Style Guide

Rex-ORM follows the Deno style guide:

- Use camelCase for variable and function names
- Use PascalCase for class and interface names
- Use snake_case for file names
- Use 2 spaces for indentation
- Use explicit type annotations where beneficial for readability

### Linting

To check your code for style issues:

```bash
deno task lint
```

### Formatting

To format your code according to the project's style:

```bash
deno task fmt
```

## Pull Request Process

1. Fork the repository
2. Create a new branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests and ensure they pass
5. Commit your changes (`git commit -m 'Add some feature'`)
6. Push to the branch (`git push origin feature/my-feature`)
7. Open a Pull Request

### Commit Message Format

We use conventional commits for our commit messages:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code changes that neither fix bugs nor add features
- **perf**: Performance improvements
- **test**: Adding or modifying tests
- **chore**: Changes to the build process or auxiliary tools

Example:

```
feat(query): add support for nested includes

Added support for nested includes in query builder to enable more complex queries.

Closes #123
```

## Development Workflow

### Adding a New Feature

1. Create a new branch for your feature
2. Implement the feature
3. Add tests to verify the feature works correctly
4. Update documentation to reflect the new feature
5. Submit a pull request

### Fixing a Bug

1. Create a new branch for your bugfix
2. Implement the fix
3. Add tests to verify the fix works correctly
4. Update documentation if necessary
5. Submit a pull request

## Documentation

Documentation is crucial for a project like Rex-ORM. When adding or modifying
features, please update the relevant documentation:

- Add JSDoc comments to your code
- Update README.md if necessary
- Update guide pages in the docs/site directory
- Consider adding examples to the examples directory

To generate API documentation:

```bash
deno task docs
```

## Questions and Help

If you have questions or need help with contributing, please:

- Open an issue on GitHub
- Reach out to the maintainers
- Check the existing documentation and examples

Thank you for contributing to Rex-ORM! Your help makes this project better for
everyone.
