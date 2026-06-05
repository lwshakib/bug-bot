import { GoogleGenAI } from "@google/genai";
import { Octokit } from "octokit";
import { Resend } from "resend";
import { geminiKey, githubToken, resendKey } from "./env.js";

export const genAI = new GoogleGenAI({ apiKey: geminiKey! });
export const octokit = githubToken ? new Octokit({ auth: githubToken }) : null;
export const resend = resendKey ? new Resend(resendKey) : null;
