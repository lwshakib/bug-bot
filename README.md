# 🤖 Autonomous Repo Management Agent

A high-throughput, enterprise-grade autonomous maintenance system designed to audit multiple repositories and resolve backlogs with surgical precision.

## 🏗️ Architecture: Dual-Agent Pipeline

The system is decoupled into two specialized modes of operation:

### 1. **The Issue Agent (Auditor)**
*   **Goal**: Performs deep, multi-repo audits to identify bugs, security vulnerabilities, and performance bottlenecks.
*   **Target**: Aims for **20–30 high-fidelity issues** per run.
*   **Strategy**: Uses a "Hop Strategy" to move between repositories if one is already clean.
*   **Run**: `npm run issue-agent`

### 2. **The PR Agent (Fixer)**
*   **Goal**: Autonomously resolves open issues by delivering surgical, validated code patches.
*   **Quality Gate**: Scans `package.json` and GitHub workflows to run project-specific validation (build, lint, typecheck) before submission.
*   **Capacity**: Processes your entire portfolio in a single session.
*   **Run**: `npm run pr-agent`

---

## 🚀 Industrial Resilience

The agent is built with multiple layers of "self-healing" logic:

| Error Type | Strategy |
| :--- | :--- |
| **429 (Rate Limit)** | Progressive backoff (1m, 4m, 5m delays). |
| **503 (Unavailable)** | 3 burst retries followed by two 1-minute wait cycles. |
| **Tool Failure** | 5 retries, then passes the error to AI for diagnostic self-correction. |
| **Session Failure** | Global failover: Wait 5m and retry the entire session once. |
| **Timeout** | Mandatory 1-hour hard limit for all sessions to prevent resource leaks. |

---

## 📊 Grand Achievement Reporting

At the end of every session, the agent delivers a **Grand Report** email including:
*   **Executive Dashboard**: High-level stats of repositories processed and work done.
*   **Detailed Registry**: Clickable links to every Issue or PR created.
*   **Resilience Log**: A list of every error the agent successfully navigated.
*   **Poetic Reflection**: A unique, AI-generated poem summarizing the spirit of the session's work.

---

## 🛠️ Configuration

All behavioral constants are centralized in \`src/constants.ts\`. You can easily tune:
*   \`MAX_TOOL_CALLS\`: Set to 200 for deep reasoning.
*   \`ISSUE_VOLUME_TARGET\`: Control the audit depth.
*   \`RETRY_DELAYS\`: Adjust the agent's patience for API limits.
*   \`DEFAULT_MODEL_ID\`: Choose the AI model for reporting and poetry.
*   \`NOTIFICATION_EMAIL\`: Your primary alert destination.

## 🔑 Environment Setup

Ensure your \`.env\` file contains:
*   \`GEMINI_API_KEY\`: For agentic reasoning.
*   \`GITHUB_TOKEN\`: For repository interaction.
*   \`RESEND_API_KEY\`: For email notifications.

---
*Autonomous Maintenance System | Built for Professional Repository Portfolio Management*