# DevPulse 📊

> A comprehensive productivity tracker designed for developers who want to understand their coding patterns and optimize their workflow. Built with privacy and developer experience in mind.

## 🎯 Portfolio Highlights

- **Full-Stack Development**: Electron desktop app + Next.js dashboard with real-time data sync
- **Privacy-First Architecture**: Local SQLite database with HTTP server for cross-app communication
- **Modern Tech Stack**: TypeScript, React, Tailwind CSS, better-sqlite3, Electron Forge
- **Production-Ready Features**: Settings management, data export, system tray integration
- **Clean Architecture**: Monorepo structure with shared packages and proper separation of concerns

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-191970?logo=Electron&logoColor=white)](https://www.electronjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

## ✨ Features

- 🔒 **100% Private** - All data stays on your device
- 📈 **Real-time Activity Tracking** - Monitor coding time, app usage, and project work
- 🎯 **Focus Sessions** - Pomodoro-style focus tracking with break reminders
- 📊 **Rich Analytics** - Detailed insights into your productivity patterns
- 🌙 **Beautiful UI** - Clean, modern interface with dark/light modes
- 📤 **Data Export** - Export your data in CSV/JSON formats
- ⚙️ **Customizable Settings** - Personalize your tracking experience

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/rohit-mhatre/DevPulse.git
cd DevPulse

# Install dependencies
npm install

# Start the desktop app
cd apps/desktop
npm run start

# In another terminal, start the web dashboard
cd apps/dashboard
npm run dev
```

### First Run

1. **Launch Desktop App**: Run `npm run start` in `apps/desktop`
2. **Grant Permissions**: Allow screen recording permissions when prompted (macOS)
3. **Open Dashboard**: Click "Open Dashboard" in the desktop app
4. **Customize Settings**: Set your name and preferences in Settings

## 📱 Applications

### Desktop App (Electron)
- **Native activity tracking** across all applications
- **System tray integration** with quick stats
- **Privacy-focused** data collection
- **Local SQLite database** for fast, secure storage

### Web Dashboard (Next.js)
- **Real-time analytics** and productivity insights
- **Interactive charts** and data visualizations
- **Export functionality** for your data
- **Customizable settings** and preferences

## 🔒 Privacy & Security

### Data Privacy
- ✅ **100% Local**: All data stored on your device only
- ✅ **No Cloud Sync**: No external servers or accounts required
- ✅ **No Tracking**: We don't collect any telemetry or usage data
- ✅ **Open Source**: Full transparency - audit the code yourself

### Security Features
- 🔐 **Local SQLite Database**: Encrypted local storage
- 🛡️ **No Network Requests**: Except for optional GitHub integration
- 🔒 **Minimal Permissions**: Only screen recording for activity detection
- 🧹 **Clean Builds**: No analytics, trackers, or telemetry

### Optional Integrations
GitHub integration is **completely optional** and requires:
- Your explicit consent
- OAuth authentication (tokens stored locally)
- Can be disconnected at any time

## 🛠️ Development

### Project Structure
```
DevPulse/
├── apps/
│   ├── desktop/          # Electron app for activity tracking
│   └── dashboard/        # Next.js web dashboard
├── packages/
│   └── shared/          # Shared utilities and types
└── docs/               # Documentation
```

### Tech Stack
- **Desktop**: Electron + TypeScript + SQLite + Node.js HTTP Server
- **Dashboard**: Next.js 15 + React 19 + Tailwind CSS + TypeScript
- **Database**: SQLite with better-sqlite3 for local data persistence
- **Build Tools**: Webpack + Electron Forge + Turbopack
- **Architecture**: Monorepo with shared TypeScript packages

### Development Commands

```bash
# Desktop app development
cd apps/desktop
npm run start          # Start in development
npm run test          # Run tests
npm run package       # Build for distribution

# Dashboard development
cd apps/dashboard
npm run dev           # Start development server
npm run build         # Build for production
npm run lint          # Lint code

# Root commands
npm run test:all      # Run all tests
npm run lint:all      # Lint all projects
```

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

## 📊 Features Deep Dive

### Activity Tracking
- **Automatic Detection**: Tracks active applications and windows
- **Smart Classification**: Categorizes activities (coding, browsing, meetings)
- **Project Recognition**: Auto-detects coding projects from file paths
- **Time Accuracy**: Precise time tracking with idle detection

### Analytics & Insights
- **Daily/Weekly/Monthly** productivity summaries
- **Focus Time Analysis** with deep work detection
- **App Usage Patterns** and time distribution
- **Project Breakdown** with detailed time allocation

### Focus Sessions
- **Pomodoro Timer** with customizable intervals
- **Break Reminders** to maintain healthy work habits
- **Distraction Tracking** during focus sessions
- **Goal Setting** with progress tracking

### Data Export
- **Multiple Formats**: CSV, JSON export options
- **Flexible Filtering**: Date ranges, activity types
- **Complete Control**: Export all or specific data
- **Privacy Maintained**: All exports are local files

## 🤝 Contributing

Contributions are welcome! This project serves as both a functional tool and a demonstration of modern development practices.

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Implement your changes with appropriate tests
4. Ensure all checks pass
5. Submit a pull request with clear description

Please maintain the existing code quality and architectural patterns.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact & Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/rohit-mhatre/DevPulse/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/rohit-mhatre/DevPulse/discussions)
- 📧 **Direct Contact**: Available for project inquiries and collaboration

## 🗺️ Roadmap

- [ ] **Cross-platform Support**: Windows and Linux compatibility
- [ ] **Plugin Architecture**: Extensible system for custom integrations
- [ ] **Advanced Analytics**: AI-powered insights with local processing
- [ ] **Mobile Companion**: View-only mobile application

## 🎯 Project Vision

Built to address the lack of developer-focused productivity tools that respect privacy. This project demonstrates:

- **Privacy-first architecture**: All data remains local with no external dependencies
- **Developer-centric design**: Features tailored specifically for coding workflows
- **Technical excellence**: Clean architecture, robust data handling, and intuitive UX
- **Open source transparency**: Full codebase available for review and contribution

---

<div align="center">
  <p>A portfolio project demonstrating modern development practices and privacy-focused architecture</p>
  <p>
    <a href="#quick-start">Get Started</a> •
    <a href="#features">Features</a> •
    <a href="#privacy--security">Privacy</a> •
    <a href="#development">Development</a>
  </p>
</div>