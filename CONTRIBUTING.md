# Contributing to CRM Atlas

Thank you for your interest in contributing to CRM Atlas! 🎉

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/netingweb/atlas-headless-crm/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. Check if the feature has already been suggested
2. Create an issue with:
   - Clear description of the feature
   - Use case and benefits
   - Possible implementation approach (if you have ideas)

### Pull Requests

1. **Fork the repository**
2. **Create a branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**:
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
4. **Run quality checks**:
   ```bash
   pnpm lint:fix
   pnpm typecheck
   pnpm test
   pnpm build
   ```
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
   - Use clear, descriptive commit messages
   - Follow conventional commits format if possible
6. **Push to your fork**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**:
   - Provide a clear description
   - Reference related issues
   - Wait for review and feedback

## Development Setup

See [README.md](README.md) for complete setup instructions.

Quick setup:

```bash
pnpm install
cp .env.example .env
pnpm docker:up
pnpm seed
pnpm dev
```

## Code Style

- Use TypeScript strict mode
- Follow ESLint rules (run `pnpm lint:fix`)
- Use Prettier for formatting (run `pnpm format`)
- Write meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

## Testing

- Write tests for new features
- Ensure all tests pass: `pnpm test`
- Aim for good test coverage
- Test both success and error cases

## Documentation

- Update README.md if adding new features
- Add JSDoc comments for public APIs
- Update relevant guide files in `docs/guides/`
- Keep code examples up-to-date

## Project Structure

- `apps/` - Applications (API, Indexer, Workflow, MCP)
- `packages/` - Shared packages
- `config/` - JSON configurations
- `docs/` - Documentation
- `scripts/` - Utility scripts

## Questions?

Feel free to open an issue for questions or reach out to the maintainer.

Thank you for contributing! 🙏
