# Contributing to Bug-Bot

Thank you for your interest in contributing to Bug-Bot! This project is built as an autonomous bug-hunting and vulnerability remediation agent, and we welcome contributions to make it more robust, efficient, and capable.

This document details the step-by-step contribution workflow—from forking the repository, setting up your environment, coding style guidelines, to submitting a Pull Request (PR).

---

## 🛠️ Step-by-Step Contribution Workflow

### 1. Fork the Repository
Start by creating your own personal copy of the codebase. Navigate to the [Bug-Bot repository on GitHub](https://github.com/lwshakib/bug-bot) and click the **Fork** button in the top-right corner.

### 2. Clone Your Fork
Clone your newly forked repository to your local development machine:
```bash
git clone https://github.com/<your-username>/bug-bot.git
cd bug-bot
```
*(Replace `<your-username>` with your actual GitHub username.)*

### 3. Configure the Upstream Remote
Configure a connection to the original ("upstream") repository to sync changes and pull the latest updates:
```bash
git remote add upstream https://github.com/lwshakib/bug-bot.git
```
Verify your configured remotes:
```bash
git remote -v
```
You should see both `origin` (pointing to your fork) and `upstream` (pointing to the original repo).

### 4. Syncing with Upstream
Before making any changes, always make sure your local repository is up to date with the upstream repository:
```bash
# Checkout the main branch
git checkout main

# Fetch the latest changes from upstream
git fetch upstream

# Merge the upstream changes into your local main branch
git merge upstream/main
```

### 5. Local Environment Setup & Installation
Ensure you have [Node.js](https://nodejs.org/) (v22 or higher recommended) and `npm` installed.

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Copy the environment configuration**:
   ```bash
   cp .env.example .env
   ```
3. **Configure API Keys**: Open the newly created `.env` file and fill in your credentials:
   - `GEMINI_API_KEY`: Key for Gemini model execution.
   - `GITHUB_TOKEN`: GitHub Personal Access Token (PAT) with `repo` scope.
   - `RESEND_API_KEY`: Key for email reporting using Resend.

---

## 🌿 Branching Strategy

Create a new local branch for your work. Keep your branches focused and separate for different bugfixes or features:
```bash
git checkout -b <branch-type>/<short-descriptive-name>
```

### Naming Conventions:
- For new features: `feature/add-offline-indexing`
- For bug fixes: `bugfix/issue-42-rate-limit-crash`
- For documentation updates: `docs/improve-contributing-guide`

---

## 📜 Code Style & Development Guidelines

To maintain code quality and compatibility, please adhere to these rules:

1. **TypeScript & ESM Modules**:
   - The project uses TypeScript compile target with ESM (`type: "module"` in `package.json`).
   - **Important**: When writing imports for local files, you **MUST** include the `.js` extension (e.g., use `import { runPRFix } from "./utils/git.js";` instead of `"./utils/git"`).
2. **Strict Compiler Standards**:
   - Keep typescript compiler options strict (do not use `any` unless absolutely necessary, and avoid ignoring compiler warnings).
3. **Async / Background Tasks**:
   - If writing new commands or workflows that are long-running, make sure they run as asynchronous tasks safely to prevent execution timeouts.

### Local Verification
Always verify that your code compiles successfully without errors before submitting it:
```bash
npm run build
```
You can run locally to verify the behavior of the agents:
*   **Run the Issue Agent**: `npm run issue-agent`
*   **Run the PR Agent**: `npm run pr-agent`

---

## 📤 Committing and Pushing Changes

1. **Stage your changes**:
   ```bash
   git add .
   ```
2. **Commit with a clear, descriptive message**:
   ```bash
   git commit -m "feat: add local cache for AST outline extraction"
   ```
   *Try to follow basic conventional commit conventions (feat, fix, docs, refactor, style, test).*
3. **Push the branch to your GitHub fork**:
   ```bash
   git push -u origin <branch-name>
   ```

---

## 📥 Submitting a Pull Request (PR)

1. Navigate to your fork on GitHub. You should see a prompt to **Compare & pull request** for your pushed branch.
2. Select the base repository as `lwshakib/bug-bot` and the base branch as `main`.
3. Provide a clear title and description detailing:
   - What issue is being resolved (use `Fixes #<issue-number>` to automatically link and close the issue).
   - What approach you took to solve the problem.
   - Any manual or automated tests you performed.
4. Complete the checklist in our [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).

### 🔍 Code Review & Merging
Once submitted:
- Automated workflows will run to verify that the project builds correctly.
- Project maintainers will review your code, leave feedback, or request changes if necessary.
- After approval, your pull request will be merged into the main repository!
