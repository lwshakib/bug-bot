import { Type } from "@google/genai";
import { defineTool } from "../utils.js";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";

interface CodeSymbol {
  kind: string;
  name: string;
  line: number;
  endLine: number;
  exported: boolean;
  children?: CodeSymbol[];
  signature?: string;
}

function extractSymbols(sourceFile: ts.SourceFile): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];

  function getLineNumber(node: ts.Node): number {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  }

  function getEndLineNumber(node: ts.Node): number {
    return sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  }

  function isExported(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
  }

  function getFunctionSignature(node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction): string {
    const params = node.parameters.map(p => {
      const name = p.name.getText(sourceFile);
      const type = p.type ? `: ${p.type.getText(sourceFile)}` : "";
      return `${name}${type}`;
    }).join(", ");
    const returnType = node.type ? `: ${node.type.getText(sourceFile)}` : "";
    return `(${params})${returnType}`;
  }

  function visit(node: ts.Node, parent?: CodeSymbol[]) {
    const target = parent || symbols;

    // Import declarations
    if (ts.isImportDeclaration(node)) {
      const moduleSpec = node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, "");
      target.push({
        kind: "import",
        name: moduleSpec,
        line: getLineNumber(node),
        endLine: getEndLineNumber(node),
        exported: false
      });
      return;
    }

    // Class declarations
    if (ts.isClassDeclaration(node) && node.name) {
      const classSymbol: CodeSymbol = {
        kind: "class",
        name: node.name.text,
        line: getLineNumber(node),
        endLine: getEndLineNumber(node),
        exported: isExported(node),
        children: []
      };
      // Extract methods and properties
      node.members.forEach(member => {
        if (ts.isMethodDeclaration(member) && member.name) {
          classSymbol.children!.push({
            kind: "method",
            name: member.name.getText(sourceFile),
            line: getLineNumber(member),
            endLine: getEndLineNumber(member),
            exported: false,
            signature: getFunctionSignature(member)
          });
        } else if (ts.isPropertyDeclaration(member) && member.name) {
          classSymbol.children!.push({
            kind: "property",
            name: member.name.getText(sourceFile),
            line: getLineNumber(member),
            endLine: getEndLineNumber(member),
            exported: false
          });
        } else if (ts.isConstructorDeclaration(member)) {
          classSymbol.children!.push({
            kind: "constructor",
            name: "constructor",
            line: getLineNumber(member),
            endLine: getEndLineNumber(member),
            exported: false
          });
        }
      });
      target.push(classSymbol);
      return;
    }

    // Function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      target.push({
        kind: "function",
        name: node.name.text,
        line: getLineNumber(node),
        endLine: getEndLineNumber(node),
        exported: isExported(node),
        signature: getFunctionSignature(node)
      });
      return;
    }

    // Variable declarations (catch exported arrow functions and constants)
    if (ts.isVariableStatement(node)) {
      const exported = isExported(node);
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const init = decl.initializer;
          if (init && ts.isArrowFunction(init)) {
            target.push({
              kind: "function",
              name: decl.name.text,
              line: getLineNumber(node),
              endLine: getEndLineNumber(node),
              exported,
              signature: getFunctionSignature(init)
            });
          } else if (init && ts.isFunctionExpression(init)) {
            target.push({
              kind: "function",
              name: decl.name.text,
              line: getLineNumber(node),
              endLine: getEndLineNumber(node),
              exported,
              signature: getFunctionSignature(init as any)
            });
          } else {
            target.push({
              kind: "variable",
              name: decl.name.text,
              line: getLineNumber(node),
              endLine: getEndLineNumber(node),
              exported
            });
          }
        }
      }
      return;
    }

    // Interface declarations
    if (ts.isInterfaceDeclaration(node)) {
      const ifaceSymbol: CodeSymbol = {
        kind: "interface",
        name: node.name.text,
        line: getLineNumber(node),
        endLine: getEndLineNumber(node),
        exported: isExported(node),
        children: []
      };
      node.members.forEach(member => {
        if (ts.isPropertySignature(member) && member.name) {
          ifaceSymbol.children!.push({
            kind: "property",
            name: member.name.getText(sourceFile),
            line: getLineNumber(member),
            endLine: getEndLineNumber(member),
            exported: false
          });
        } else if (ts.isMethodSignature(member) && member.name) {
          ifaceSymbol.children!.push({
            kind: "method",
            name: member.name.getText(sourceFile),
            line: getLineNumber(member),
            endLine: getEndLineNumber(member),
            exported: false
          });
        }
      });
      target.push(ifaceSymbol);
      return;
    }

    // Type alias declarations
    if (ts.isTypeAliasDeclaration(node)) {
      target.push({
        kind: "type",
        name: node.name.text,
        line: getLineNumber(node),
        endLine: getEndLineNumber(node),
        exported: isExported(node)
      });
      return;
    }

    // Enum declarations
    if (ts.isEnumDeclaration(node)) {
      target.push({
        kind: "enum",
        name: node.name.text,
        line: getLineNumber(node),
        endLine: getEndLineNumber(node),
        exported: isExported(node)
      });
      return;
    }

    // Export assignments (export default ...)
    if (ts.isExportAssignment(node)) {
      target.push({
        kind: "export_default",
        name: "default",
        line: getLineNumber(node),
        endLine: getEndLineNumber(node),
        exported: true
      });
      return;
    }

    // Recurse into child nodes for namespace/module blocks
    ts.forEachChild(node, child => visit(child, target));
  }

  ts.forEachChild(sourceFile, node => visit(node));
  return symbols;
}

function extractFallbackSymbols(content: string, ext: string): CodeSymbol[] {
  const lines = content.split("\n");
  const symbols: CodeSymbol[] = [];

  const isIndentationBased = ext === "py" || ext === "rb";

  interface OpenBlock {
    symbol: CodeSymbol;
    indent: number;
  }
  const stack: OpenBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!;
    const lineNum = i + 1;
    const trimmed = rawLine.trim();

    // Skip empty lines or comments
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      continue;
    }

    const leadingWhitespace = rawLine.match(/^\s*/)?.[0] || "";
    const indent = leadingWhitespace.replace(/\t/g, "    ").length;

    let symbol: CodeSymbol | null = null;

    if (ext === "py") {
      const classMatch = trimmed.match(/^class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      const defMatch = trimmed.match(/^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(\([^)]*\))/);

      if (classMatch) {
        symbol = {
          kind: "class",
          name: classMatch[1]!,
          line: lineNum,
          endLine: lineNum,
          exported: !classMatch[1]!.startsWith("_"),
          children: []
        };
      } else if (defMatch) {
        const isMethod = stack.length > 0 && stack[stack.length - 1]!.symbol.kind === "class";
        symbol = {
          kind: isMethod ? "method" : "function",
          name: defMatch[1]!,
          line: lineNum,
          endLine: lineNum,
          exported: !defMatch[1]!.startsWith("_"),
          signature: defMatch[2]!
        };
      }
    } else if (ext === "rb") {
      const classMatch = trimmed.match(/^(class|module)\s+([a-zA-Z_][a-zA-Z0-9_:]*)/);
      const defMatch = trimmed.match(/^def\s+([a-zA-Z_][a-zA-Z0-9_?!]*)/);

      if (classMatch) {
        symbol = {
          kind: classMatch[1] === "class" ? "class" : "module",
          name: classMatch[2]!,
          line: lineNum,
          endLine: lineNum,
          exported: true,
          children: []
        };
      } else if (defMatch) {
        const isMethod = stack.length > 0 && (stack[stack.length - 1]!.symbol.kind === "class" || stack[stack.length - 1]!.symbol.kind === "module");
        symbol = {
          kind: isMethod ? "method" : "function",
          name: defMatch[1]!,
          line: lineNum,
          endLine: lineNum,
          exported: true
        };
      }
    } else if (ext === "go") {
      const funcMatch = trimmed.match(/^func\s+(?:\(([^)]+)\)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*(\([^)]*\))/);
      const typeMatch = trimmed.match(/^type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(struct|interface)/);

      if (typeMatch) {
        symbol = {
          kind: typeMatch[2]!,
          name: typeMatch[1]!,
          line: lineNum,
          endLine: lineNum,
          exported: /^[A-Z]/.test(typeMatch[1]!),
          children: []
        };
      } else if (funcMatch) {
        const receiver = funcMatch[1];
        const name = funcMatch[2]!;
        symbol = {
          kind: receiver ? "method" : "function",
          name: name,
          line: lineNum,
          endLine: lineNum,
          exported: /^[A-Z]/.test(name),
          signature: funcMatch[3]!
        };
      }
    } else if (ext === "rs") {
      const isPub = trimmed.startsWith("pub");
      const cleanLine = isPub ? trimmed.substring(3).trim() : trimmed;

      const fnMatch = cleanLine.match(/^fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(\([^)]*\))/);
      const typeMatch = cleanLine.match(/^(struct|enum|trait)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      const implMatch = cleanLine.match(/^impl\s+(?:[a-zA-Z0-9_<>]+::)?([a-zA-Z_][a-zA-Z0-9_<>]*)/);

      if (typeMatch) {
        symbol = {
          kind: typeMatch[1]!,
          name: typeMatch[2]!,
          line: lineNum,
          endLine: lineNum,
          exported: isPub,
          children: []
        };
      } else if (implMatch) {
        symbol = {
          kind: "impl",
          name: implMatch[1]!,
          line: lineNum,
          endLine: lineNum,
          exported: false,
          children: []
        };
      } else if (fnMatch) {
        const isMethod = stack.length > 0 && stack[stack.length - 1]!.symbol.kind === "impl";
        symbol = {
          kind: isMethod ? "method" : "function",
          name: fnMatch[1]!,
          line: lineNum,
          endLine: lineNum,
          exported: isPub,
          signature: fnMatch[2]!
        };
      }
    } else {
      const isPublic = trimmed.includes("public");
      const isPrivate = trimmed.includes("private");
      const isProtected = trimmed.includes("protected");
      const exported = isPublic || (!isPrivate && !isProtected);

      const classMatch = trimmed.match(/\b(class|interface|struct|trait)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      const phpFuncMatch = trimmed.match(/\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(\([^)]*\))/);
      const javaMethodMatch = trimmed.match(/^(?:[a-zA-Z0-9_<>\[\]\s*]+)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(\([^)]*\))/);

      if (classMatch) {
        symbol = {
          kind: classMatch[1]!,
          name: classMatch[2]!,
          line: lineNum,
          endLine: lineNum,
          exported,
          children: []
        };
      } else if (phpFuncMatch) {
        const isMethod = stack.length > 0 && ["class", "interface", "struct", "trait"].includes(stack[stack.length - 1]!.symbol.kind);
        symbol = {
          kind: isMethod ? "method" : "function",
          name: phpFuncMatch[1]!,
          line: lineNum,
          endLine: lineNum,
          exported,
          signature: phpFuncMatch[2]!
        };
      } else if (javaMethodMatch && !/^(if|for|while|switch|return|catch)$/.test(javaMethodMatch[1]!)) {
        const isMethod = stack.length > 0 && ["class", "interface", "struct", "trait"].includes(stack[stack.length - 1]!.symbol.kind);
        symbol = {
          kind: isMethod ? "method" : "function",
          name: javaMethodMatch[1]!,
          line: lineNum,
          endLine: lineNum,
          exported,
          signature: javaMethodMatch[2]!
        };
      }
    }

    if (symbol) {
      if (isIndentationBased) {
        while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) {
          const popped = stack.pop()!;
          popped.symbol.endLine = lineNum - 1;
        }

        if (stack.length > 0) {
          const parent = stack[stack.length - 1]!.symbol;
          if (parent.children) {
            parent.children.push(symbol);
          } else {
            parent.children = [symbol];
          }
        } else {
          symbols.push(symbol);
        }

        if (["class", "module"].includes(symbol.kind)) {
          stack.push({ symbol, indent });
        }
      } else {
        const openBraces = (trimmed.match(/\{/g) || []).length;
        const closeBraces = (trimmed.match(/\}/g) || []).length;

        for (let b = 0; b < closeBraces; b++) {
          const popped = stack.pop();
          if (popped) {
            popped.symbol.endLine = lineNum;
          }
        }

        if (stack.length > 0) {
          const parent = stack[stack.length - 1]!.symbol;
          if (parent.children) {
            parent.children.push(symbol);
          } else {
            parent.children = [symbol];
          }
        } else {
          symbols.push(symbol);
        }

        if (["class", "interface", "struct", "trait", "impl"].includes(symbol.kind) && openBraces > closeBraces) {
          stack.push({ symbol, indent });
        }
      }
    }
  }

  while (stack.length > 0) {
    const popped = stack.pop()!;
    popped.symbol.endLine = lines.length;
  }

  return symbols;
}

function formatSymbols(symbols: CodeSymbol[], indent: number = 0): string {
  const pad = "  ".repeat(indent);
  return symbols.map(s => {
    const exportTag = s.exported ? " [exported]" : "";
    const sig = s.signature || "";
    let line = `${pad}${s.kind} ${s.name}${sig}${exportTag}  (L${s.line}-${s.endLine})`;
    if (s.children && s.children.length > 0) {
      line += "\n" + formatSymbols(s.children, indent + 1);
    }
    return line;
  }).join("\n");
}

export const extractCodeStructureTool = defineTool({
  declaration: {
    name: "extract_code_structure",
    description: "Parses a source file and returns a structural outline of classes, methods, functions, interfaces, structs, traits, modules, imports, and exports with line numbers. Supports TypeScript, JavaScript, Python, Go, Java, C, C++, C#, PHP, Ruby, and Rust.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_path: { type: Type.STRING, description: "The path to the file to analyze (relative to repo root)." }
      },
      required: ["file_path"]
    }
  },
  execute: async ({ file_path }: { file_path: string }, ctx) => {
    const resolvedRepo = resolve(ctx.repoDir);
    const fullPath = resolve(join(resolvedRepo, file_path));
    if (!fullPath.startsWith(resolvedRepo)) {
      return { status: "error", message: "Path traversal detected: Access outside repository root is forbidden." };
    }
    if (!existsSync(fullPath)) {
      return { status: "error", message: `File ${file_path} not found.` };
    }

    const ext = file_path.split(".").pop()?.toLowerCase() || "";
    const supportedExts = ["ts", "js", "tsx", "jsx", "py", "go", "java", "c", "cpp", "h", "cs", "php", "rb", "rs"];
    if (!supportedExts.includes(ext)) {
      return { status: "error", message: `extract_code_structure only supports: ${supportedExts.join(", ")}. Got: .${ext}` };
    }

    try {
      const content = readFileSync(fullPath, "utf8");
      let symbols: CodeSymbol[] = [];
      const totalLines = content.split("\n").length;

      if (["ts", "js", "tsx", "jsx"].includes(ext)) {
        const sourceFile = ts.createSourceFile(file_path, content, ts.ScriptTarget.Latest, true);
        symbols = extractSymbols(sourceFile);
      } else {
        symbols = extractFallbackSymbols(content, ext);
      }

      const formatted = formatSymbols(symbols);

      return {
        status: "success",
        file: file_path,
        totalLines,
        symbolCount: symbols.length,
        outline: formatted || "[No symbols detected]",
        symbols
      };
    } catch (e: any) {
      return { status: "error", message: `AST parsing failed for ${file_path}: ${e.message}` };
    }
  }
});
