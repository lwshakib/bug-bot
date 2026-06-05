# Contributing to Bug-Bot

Thank you for your interest in contributing to Bug-Bot! This document provides guidelines and instructions for setting up the project locally, making changes, and submitting contributions.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v22 or higher recommended)
- `npm` (packaged with Node.js)

### Setup Instructions
1. Clone this repository:
   ```bash
   git clone https://github.com/lwshakib/bug-bot.git
   cd bug-bot
   ```
2. Enable Corepack (to support yarn/pnpm if needed):
   ```bash
   corepack enable
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy the environment template and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY`, `GITHUB_TOKEN`, and `RESEND_API_KEY` to the `.env` file.

## 🛠️ Development & Commands

### Compilation
Bug-Bot is written in TypeScript. Compile it using:
```bash
npm run build
```

### Running the Agents
You can execute either mode of the agent locally:
* **Issue Agent (Static Audit):**
  ```bash
  npm run issue-agent
  ```
* **PR Agent (Automatic Fixes):**
  ```bash
  npm run pr-agent
  ```

## 📜 Code Style Guidelines
- **TypeScript & ESM:** Use TypeScript ESM syntax. All imports of local modules must include the `.js` extension (e.g., `import { runBugAgent } from "./ai.js"`).
- **Strict Checks:** Keep typescript compiler options strict. Do not bypass type safety unless absolutely necessary.
- **Asynchronous Safe Actions:** For long-running CLI tools or processes, use `start_background_command` to prevent execution timeouts.

## 📥 Submitting Pull Requests
1. Create a new feature/bugfix branch.
2. Implement your changes.
3. Verify that the project builds successfully (`npm run build`).
4. Submit a Pull Request targeting the `main` branch. Ensure you follow the provided PR template.
