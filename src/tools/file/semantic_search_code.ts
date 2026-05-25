import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { existsSync, readFileSync, writeFileSync, readdirSync, lstatSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ignore from "ignore";
import { pipeline } from "@xenova/transformers";

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;
const CACHE_FILENAME = ".embeddings_cache.json";

// Source file extensions to index
const SOURCE_EXTENSIONS = /\.(ts|js|tsx|jsx|py|go|java|c|cpp|h|cs|php|rb|rs)$/i;

interface EmbeddingChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  text: string;
  vector: number[];
}

interface EmbeddingCache {
  version: number;
  chunks: EmbeddingChunk[];
}

// --- Pure math: Cosine Similarity ---
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// --- File discovery (respects .gitignore) ---
function getSourceFiles(dir: string, baseDir: string, ig: any): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const relPath = relative(baseDir, fullPath);
      if (entry === "node_modules" || entry === ".git" || entry === "dist" || ig.ignores(relPath)) continue;

      const stats = lstatSync(fullPath);
      if (stats.isSymbolicLink()) continue;

      if (stats.isDirectory()) {
        files.push(...getSourceFiles(fullPath, baseDir, ig));
      } else if (SOURCE_EXTENSIONS.test(entry)) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip unreadable directories
  }
  return files;
}

// --- Split file content into overlapping chunks ---
function chunkFile(filePath: string, content: string): { text: string; startLine: number; endLine: number }[] {
  const lines = content.split("\n");
  const chunks: { text: string; startLine: number; endLine: number }[] = [];

  let i = 0;
  while (i < lines.length) {
    const chunkLines: string[] = [];
    let charCount = 0;
    const startLine = i + 1;

    while (i < lines.length && charCount < CHUNK_SIZE) {
      chunkLines.push(lines[i]!);
      charCount += lines[i]!.length + 1;
      i++;
    }

    const text = chunkLines.join("\n");
    if (text.trim().length > 20) {
      chunks.push({ text, startLine, endLine: i });
    }

    // Overlap: step back
    const overlapLines = Math.floor(CHUNK_OVERLAP / 40);
    i = Math.max(i - overlapLines, i === lines.length ? i : i - overlapLines);
    if (chunks.length > 0 && i <= startLine) {
      // Prevent infinite loop for tiny files
      break;
    }
  }

  return chunks;
}

let extractor: any = null;
async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", EMBEDDING_MODEL);
  }
  return extractor;
}

// --- Generate embedding via local Hugging Face model ---
async function getEmbedding(text: string): Promise<number[]> {
  try {
    const ext = await getExtractor();
    const output = await ext(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  } catch (e) {
    console.error(`[SEMANTIC] Embedding failed:`, e);
    return [];
  }
}

// --- Batch embedding ---
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(t => getEmbedding(t)));
    vectors.push(...results);
  }
  return vectors;
}

// --- Load or build the embedding cache ---
async function loadOrBuildCache(repoDir: string, workRoot: string): Promise<EmbeddingCache> {
  const cachePath = join(workRoot, CACHE_FILENAME);

  // Try to load existing cache
  if (existsSync(cachePath)) {
    try {
      const cached = JSON.parse(readFileSync(cachePath, "utf8")) as EmbeddingCache;
      if (cached.version === 2 && cached.chunks.length > 0) {
        console.log(`[SEMANTIC] Loaded ${cached.chunks.length} cached embeddings from ${CACHE_FILENAME}`);
        return cached;
      }
    } catch {
      // Cache corrupted, rebuild
    }
  }

  // Build cache from scratch
  console.log("[SEMANTIC] Building embedding cache for repository...");
  const ig = ignore();
  const gitignorePath = join(repoDir, ".gitignore");
  if (existsSync(gitignorePath)) ig.add(readFileSync(gitignorePath, "utf8"));

  const sourceFiles = getSourceFiles(repoDir, repoDir, ig);
  console.log(`[SEMANTIC] Found ${sourceFiles.length} source files to index`);

  // Cap to avoid excessive API calls on huge repos
  const maxFiles = 200;
  const filesToProcess = sourceFiles.slice(0, maxFiles);
  if (sourceFiles.length > maxFiles) {
    console.log(`[SEMANTIC] Capping to ${maxFiles} files (repo has ${sourceFiles.length})`);
  }

  const allChunks: { filePath: string; startLine: number; endLine: number; text: string }[] = [];
  for (const file of filesToProcess) {
    try {
      const content = readFileSync(file, "utf8");
      const relPath = relative(repoDir, file);
      const fileChunks = chunkFile(relPath, content);
      for (const chunk of fileChunks) {
        allChunks.push({
          filePath: relPath,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          text: `// File: ${relPath}\n${chunk.text}`
        });
      }
    } catch {
      // Skip unreadable files
    }
  }

  console.log(`[SEMANTIC] Generated ${allChunks.length} code chunks. Fetching embeddings...`);

  // Get embeddings for all chunks
  const vectors = await getEmbeddings(allChunks.map(c => c.text));

  const cache: EmbeddingCache = {
    version: 2,
    chunks: allChunks.map((c, i) => ({
      filePath: c.filePath,
      startLine: c.startLine,
      endLine: c.endLine,
      text: c.text,
      vector: vectors[i] || []
    }))
  };

  // Save cache locally
  try {
    writeFileSync(cachePath, JSON.stringify(cache));
    console.log(`[SEMANTIC] Saved ${cache.chunks.length} embeddings to ${CACHE_FILENAME}`);
  } catch (e) {
    console.error(`[SEMANTIC] Failed to save cache: ${e}`);
  }

  return cache;
}

export const semanticSearchCodeTool = defineTool({
  declaration: {
    name: "semantic_search_code",
    description: "Searches for code concepts semantically across the repository using AI embeddings. Use this when you need to find code related to a concept (e.g., 'authentication error handling', 'database connection pooling') rather than an exact string match. The first call indexes the repository; subsequent calls are instant.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The concept, intent, or description to search for (e.g., 'JWT token validation logic', 'error handling in payment flow')." },
        limit: { type: Type.NUMBER, description: "Maximum number of results to return. Default: 5." }
      },
      required: ["query"]
    }
  },
  execute: async ({ query, limit }: { query: string; limit?: number }, ctx) => {
    if (!ctx.repoDir) return { status: "error", message: "No repository cloned." };
    if (!ctx.workRoot) return { status: "error", message: "No workspace root set." };

    const maxResults = limit || 5;

    try {
      // Load or build the embedding cache
      const cache = await loadOrBuildCache(ctx.repoDir, ctx.workRoot);
      if (cache.chunks.length === 0) {
        return { status: "success", message: "No source files found to index.", results: [] };
      }

      // Get query embedding
      const queryVector = await getEmbedding(query);
      if (queryVector.length === 0) {
        return { status: "error", message: "Failed to generate embedding for query." };
      }

      // Compute similarities
      const scored = cache.chunks
        .map(chunk => ({
          filePath: chunk.filePath,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          similarity: cosineSimilarity(queryVector, chunk.vector),
          snippet: chunk.text.slice(0, 500)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);

      return {
        status: "success",
        query,
        resultCount: scored.length,
        results: scored.map(r => ({
          file: r.filePath,
          lines: `${r.startLine}-${r.endLine}`,
          relevance: `${(r.similarity * 100).toFixed(1)}%`,
          snippet: r.snippet
        }))
      };
    } catch (e: any) {
      return { status: "error", message: `Semantic search failed: ${e.message}` };
    }
  }
});
