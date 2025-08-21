# DevPulse Architecture

## Overview

DevPulse demonstrates a modern, privacy-first architecture using a desktop-first approach with web-based analytics. This document outlines the technical decisions and architectural patterns implemented.

## System Architecture

```
┌─────────────────┐    HTTP API    ┌─────────────────┐
│  Desktop App    │◄──────────────►│  Web Dashboard  │
│  (Electron)     │  localhost:3001 │  (Next.js)      │
└─────────────────┘                └─────────────────┘
         │                                   │
         ▼                                   ▼
┌─────────────────┐                ┌─────────────────┐
│   SQLite DB     │                │   Browser APIs  │
│  (Local Data)   │                │  (localStorage) │
└─────────────────┘                └─────────────────┘
```

## Core Components

### 1. Desktop Application (Electron)
- **Activity Monitoring**: Cross-platform window detection and tracking
- **Data Storage**: SQLite database for persistent local storage
- **HTTP Server**: Internal server for dashboard communication
- **System Integration**: Tray notifications and OS-level permissions

### 2. Web Dashboard (Next.js)
- **Real-time Analytics**: Live data visualization with 1-second refresh
- **Export System**: CSV/JSON data export functionality
- **Settings Management**: User preferences with localStorage persistence
- **Responsive Design**: Modern UI with Tailwind CSS

### 3. Shared Packages
- **Type Definitions**: Shared TypeScript interfaces and types
- **Utilities**: Common functions and helpers
- **Configuration**: Shared configuration and constants

## Key Technical Decisions

### Privacy-First Design
- **Local Data Only**: All user data remains on device
- **No External APIs**: Zero external network requests (except optional GitHub OAuth)
- **Encrypted Storage**: Sensitive data encrypted at rest
- **User Control**: Complete data ownership and export capabilities

### Cross-App Communication
- **HTTP Server**: Desktop app serves data via localhost:3001
- **CORS Configuration**: Secure cross-origin requests
- **Real-time Updates**: 1-second polling for live dashboard updates
- **Graceful Fallbacks**: Dashboard works independently when desktop app is offline

### Performance Optimizations
- **Database Indexing**: Optimized SQLite queries for large datasets
- **Caching Strategy**: Smart caching with TTL for API responses
- **Lazy Loading**: Component-based loading for better UX
- **Memory Management**: Proper cleanup and garbage collection

## Development Patterns

### Monorepo Structure
- **Workspaces**: npm workspaces for dependency management
- **Shared Code**: Common utilities and types across applications
- **Independent Builds**: Each app can be built and deployed separately

### TypeScript Integration
- **Strict Typing**: Full TypeScript coverage with strict configuration
- **Interface Sharing**: Common types between desktop and web apps
- **Build-time Validation**: Type checking in CI/CD pipeline

### Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: Cross-app communication testing
- **E2E Tests**: Full workflow testing with real data

## Security Considerations

### Data Protection
- **Minimal Permissions**: Request only necessary system permissions
- **Secure Storage**: Encrypted local database with proper file permissions
- **Memory Safety**: Secure handling of sensitive data in memory

### Network Security
- **Localhost Only**: HTTP server binds to localhost exclusively
- **CORS Restrictions**: Strict origin validation
- **No Telemetry**: Zero data collection or external tracking

## Scalability & Extensibility

### Plugin Architecture (Planned)
- **Modular Design**: Plugin system for custom integrations
- **API Contracts**: Well-defined interfaces for extensions
- **Sandboxing**: Secure plugin execution environment

### Cross-Platform Support (Planned)
- **Abstraction Layers**: Platform-agnostic core logic
- **Native Integrations**: Platform-specific optimizations
- **Consistent UX**: Unified experience across operating systems

## Technology Choices

### Frontend Stack
- **React 19**: Latest React features and performance improvements
- **Next.js 15**: Modern React framework with Turbopack
- **Tailwind CSS**: Utility-first styling for rapid development
- **Radix UI**: Accessible component primitives

### Backend Stack
- **Electron**: Cross-platform desktop application framework
- **better-sqlite3**: High-performance SQLite driver
- **Node.js HTTP**: Built-in HTTP server for API communication
- **TypeScript**: Type safety and developer experience

### Build Tools
- **Webpack**: Module bundling and optimization
- **Electron Forge**: Application packaging and distribution
- **ESLint/Prettier**: Code quality and formatting
- **Vitest**: Modern testing framework

This architecture demonstrates modern development practices while maintaining simplicity and focusing on user privacy and performance.