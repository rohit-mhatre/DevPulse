# Contributing to DevPulse

Thank you for your interest in contributing to DevPulse! This guide will help you get started.

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/rohit-mhatre/DevPulse.git
   cd DevPulse
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development**
   ```bash
   # Terminal 1: Desktop app
   cd apps/desktop
   npm run start
   
   # Terminal 2: Dashboard
   cd apps/dashboard
   npm run dev
   ```

## Project Structure

```
DevPulse/
├── apps/
│   ├── desktop/          # Electron app
│   └── dashboard/        # Next.js dashboard
├── packages/
│   └── shared/          # Shared utilities
└── docs/               # Documentation
```

## Code Standards

- **TypeScript**: All new code should be written in TypeScript
- **ESLint**: Follow the existing ESLint configuration
- **Testing**: Add tests for new features when applicable
- **Privacy**: Maintain the local-first, privacy-focused architecture

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, descriptive commits
3. Test your changes thoroughly
4. Update documentation if necessary
5. Submit a pull request with a clear description

## Types of Contributions

- **Bug fixes**: Always welcome
- **Feature improvements**: Discuss in issues first
- **Documentation**: Help improve clarity and completeness
- **Testing**: Add or improve test coverage

## Questions?

Open an issue for discussion or questions about contributing.