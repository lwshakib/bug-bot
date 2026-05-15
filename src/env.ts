import "dotenv/config";

export const isProduction = process.env["NODE_ENV"] === "production";
export const geminiKey = process.env["GEMINI_API_KEY"];
export const githubToken = process.env["GITHUB_TOKEN"];
export const resendKey = process.env["RESEND_API_KEY"];

if (!geminiKey) throw new Error("Missing GEMINI_API_KEY");
if (isProduction && !githubToken) throw new Error("Missing GITHUB_TOKEN");
if (isProduction && !resendKey) throw new Error("Missing RESEND_API_KEY");
