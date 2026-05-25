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
    description: "Parses a source file and returns a structural outline of all classes, methods, functions, interfaces, types, imports, and exports with their line numbers. Use this to understand the architecture of a file without reading every line.",
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

    const ext = file_path.split(".").pop()?.toLowerCase();
    if (!["ts", "js", "tsx", "jsx"].includes(ext || "")) {
      return { status: "error", message: `extract_code_structure only supports TypeScript/JavaScript files. Got: .${ext}` };
    }

    try {
      const content = readFileSync(fullPath, "utf8");
      const sourceFile = ts.createSourceFile(file_path, content, ts.ScriptTarget.Latest, true);
      const symbols = extractSymbols(sourceFile);
      const formatted = formatSymbols(symbols);
      const totalLines = content.split("\n").length;

      return {
        status: "success",
        file: file_path,
        totalLines,
        symbolCount: symbols.length,
        outline: formatted,
        symbols
      };
    } catch (e: any) {
      return { status: "error", message: `AST parsing failed for ${file_path}: ${e.message}` };
    }
  }
});
