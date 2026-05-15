import { GoogleGenAI } from "@google/genai";
import { Octokit } from "octokit";
import { geminiKey, githubToken } from "./env.js";

export const genAI = new GoogleGenAI({ apiKey: geminiKey! });
export const octokit = githubToken ? new Octokit({ auth: githubToken }) : null;
