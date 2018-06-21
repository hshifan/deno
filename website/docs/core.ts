// Copyright 2018 Ryan Dahl <ry@tinyclouds.org>
// All rights reserved. MIT License.

import * as ts from "typescript";
import * as types from "./types";
import { isNodeExported, One2ManyMap } from "./util";

// We would have lots of `if (...) return;` in this code.
// so let's turn this tslint rule off.
// tslint:disable:curly

const VISITORS = new Map<string, types.Visitor>();

/**
 * Defines a visitor which will be used later in visit function.
 * @internal
 */
export function define(name: string, visitor: types.Visitor) {
  VISITORS.set(name, visitor);
}

/**
 * Call a visitor defined via `define()` based on given node's kind.
 * It can also be used to serialize a node.
 */
export function visit(this: types.TSKit, docEntries: any[], node: ts.Node) {
  // tslint:disable-next-line:no-any
  const kind = (ts as any).SyntaxKind[node.kind];
  if (!VISITORS.has(kind)){
    console.log("[%s] Not found.", kind);
    return;
  }
  // We only visit each node once to prevent possible infinite loops.
  if (this.visited.has(node)) return;
  this.visited.set(node, true);
  const len = docEntries.length;
  // We don't return any value from this function
  // So whenever we need to get value from a visitor (1) we can just pass an
  // empty array to it and get our result from there
  //   const ret = [];
  //   visit(this, ret, node);
  //   ret[i];
  //
  // 1. We might want to do it because visitors are serializer functions.
  VISITORS.get(kind).call(this, docEntries, node);
  if (docEntries.length === len) {
    console.log("[%s] Empty return.", kind);
  }
}

/**
 * Extract documentation from source code.
 */
export function generateDoc(fileName: string, options: ts.CompilerOptions) {
  const program = ts.createProgram([fileName], options);
  const checker = program.getTypeChecker();
  let finalSourceFile;
  for (const sourceFile of program.getSourceFiles()) {
    // TODO Compare file names, user might want to see doc for declaration file.
    if (!sourceFile.isDeclarationFile) {
      finalSourceFile = sourceFile;
      break;
    }
  }
  if (!finalSourceFile) return null;
  console.log(finalSourceFile);
  const kit: types.TSKit = {
    sourceFile: finalSourceFile,
    checker,
    visited: new Map(),
    privateNames: new One2ManyMap()
  };
  const docEntries = [];
  // Only visit exported declarations in first round.
  // TODO Iterate from bottom to top
  ts.forEachChild(finalSourceFile, node => {
    if (isNodeExported(node)) {
      visit.call(kit, docEntries, node);
    }
  });
  // TODO visit while kit.privateNames is not empty
  console.log(kit.privateNames);
  return docEntries;
}
