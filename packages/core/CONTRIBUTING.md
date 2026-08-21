# Contributing to Optima APM

Thank you for your interest in contributing to **Optima APM**! We welcome bug fixes, feature proposals, documentation updates, and performance improvements.

This document provides a set of guidelines and instructions for setting up your local development environment and contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Monorepo Architecture](#monorepo-architecture)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Project Workflow & Commands](#project-workflow--commands)
- [Development Guidelines](#development-guidelines)
- [Submitting a Pull Request](#submitting-a-pull-request)

---

## Code of Conduct

Please be respectful, constructive, and collaborative in all communications, issues, and Pull Requests.

---

## Monorepo Architecture

This project is structured as a **Monorepo** using **npm workspaces**:

```
├── packages/
│   └── core/          # Telemetry engine, interceptors, and WebSocket adapters (apm-optima/core)
│   └── dashboard/     # Next.js React Dashboard (exported statically into apm-optima/core)
├── apps/              # Integration & demo application (Express & NestJS)
```

- **`apm-optima/core`**: The published npm package containing the telemetry engine.
- **`packages/dashboard`**: A Next.js application that gets exported statically (`output: 'export'`) and bundled into `apm-optima/core`.
- **`apps`**: A local environment used to test `apm-optima/core` changes in real time.

---

## Prerequisites

Ensure you have the following installed locally:

- **Node.js**: `>= 20.0.0` (LTS version recommended)
- **npm**: `>= 10.0.0` (Native support for npm workspaces)
- **Git**: `>= 2.x`

---

## Local Development Setup

Follow these steps to clone and run the repository locally:

### 1. Clone the Repository

```bash
git clone https://github.com/Nosalis1/Optima.git
cd Optima
```

### 2. Install Dependencies

Install all dependencies across the entire monorepo with a single command from the root directory:
```bash
npm install
```

### 3. Build the Packages

Build all packages in order (this compiles the Next.js static dashboard and builds `apm-optima/core`):
```bash
npm run build
```

---

## Project Workflow & Commands

You can run workspace tasks from the root directory using central npm scripts:

### Build Commands

| Command | Description |
| :--- | :--- |
| `npm run build` | Builds the Dashboard first, then compiles `apm-optima/core`. |
| `npm run build:dashboard` | Statically exports the Next.js Dashboard into `apps/dashboard/out`. |
| `npm run build:core` | Compiles TypeScript code for `apm-optima/core`. |
| `npm run clean` | Cleans `dist`, `.next`, and build artifacts across all packages. |

### Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev:dashboard` | Runs Next.js Dashboard in dev/watch mode (`localhost:3001`). |
| `npm run dev:core` | Runs TypeScript watch mode for `apm-optima/core`. |
| `npm run dev:express` | Launches the Express integration demo. |
| `npm run dev:nest` | Launches the NestJS integration demo. |
| `npm test` | Runs test suites inside `apm-optima/core`. |

---

## Development Guidelines

**Working with Core and Dashboard**

1. **Dashboard Changes:** Any UI changes inside `packages/dashboard` need to be statically exported before being served via `apm-optima/core`.
2. **Local Linking:** Thanks to `npm workspaces`, `example-app` automatically links to `apm-optima/core` in real time without needing `npm link`.
3. **TypeScript:** Ensure all packages compile without errors (`npm run build`) before submitting changes.

---

## Submitting a Pull Request

1. **Fork & Branch:** Create a fork of the repository and create a new feature branch:
```bash
git checkout -b feat/your-feature-name
```
2. **Commit Changes:** Write clear, concise commit messages following conventions:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `refactor`: Code improvements without functional changes
3. **Push & Open PR:** Push your branch to GitHub and open a Pull Request against the `main` branch. Provide a clear summary of your changes in the PR description.

---

## Need Help?

If you run into issues or have questions, feel free to open a [GitHub Issue](https://github.com/Nosalis1/Optima/issues) or reach out through discussions.