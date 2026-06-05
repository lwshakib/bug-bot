/**
 * The primary email address where all agent notifications (Issues, PRs, and Failures) are sent.
 */
export const NOTIFICATION_EMAIL = "leadwithshakib@gmail.com";

/**
 * The maximum number of tool calls allowed in a single agent session.
 * High values (e.g., 200) allow for massive maintenance runs but increase token costs.
 */
export const MAX_TOOL_CALLS = 200;

/**
 * The target number of valid issues the Issue Agent aims to find per repository.
 * Setting this too high (e.g., >50) might lead to lower-quality reports.
 */
export const ISSUE_VOLUME_MIN = 20;
export const ISSUE_VOLUME_MAX = 30;

/**
 * The maximum number of Pull Requests the PR Agent can create in a single global run.
 * This prevents the agent from overwhelming your repository's CI/CD pipelines.
 */
export const MAX_PRS_PER_SESSION = 30;

/**
 * RETRY LOGIC: 429 (TOO MANY REQUESTS)
 * Progressive delays to allow API rate limits to reset.
 */
export const RETRY_429_DELAY_1 = 60000;  // 1 minute
export const RETRY_429_DELAY_2 = 120000; // 2 minutes
export const RETRY_429_DELAY_3 = 120000; // 2 minutes

/**
 * RETRY LOGIC: 503 (SERVICE UNAVAILABLE)
 * Burst retries handle temporary spikes, while long waits handle true outages.
 */
export const RETRY_503_BURST_COUNT = 3;
export const RETRY_503_BURST_DELAY = 2000; // 2 seconds
export const RETRY_503_LONG_DELAY = 60000; // 1 minute

/**
 * RETRY LOGIC: GLOBAL SESSION FAILURE
 * If a repository session crashes, we wait this long before the final attempt.
 */
export const GLOBAL_SESSION_RETRY_COUNT = 1;
export const GLOBAL_SESSION_RETRY_DELAY = 300000; // 5 minutes

/**
 * The maximum allowed duration for a single agent session (Issue or PR mode).
 * If the session exceeds this limit (e.g. 1 hour), it will be terminated and an email notification sent.
 */
export const SESSION_TIMEOUT_MS = 3600000; // 1 hour

/**
 * RETRY LOGIC: NETWORK ERRORS
 * Transient connection issues (fetch failed, ECONNABORTED, etc.)
 */
export const MAX_NETWORK_RETRIES = 5;
export const RETRY_NETWORK_DELAY = 10000; // 10 seconds

/**
 * The default AI model used for report generation, poetic summaries, and creative tasks.
 */
export const DEFAULT_MODEL_ID = "gemini-3.1-flash-lite";

/**
 * The maximum number of total context window tokens (input history + output) allowed in a session request.
 * Strict limit set at 30,000 tokens to control context overhead.
 */
export const MAX_CONTEXT_WINDOW_TOKENS = 30000;
