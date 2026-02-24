'use strict';

import * as vscode from 'vscode';
import { reindentText } from './indent';

let selectAfter = false;

function loadConfig() {
    const config = vscode.workspace.getConfiguration('pasteAndIndent');
    selectAfter = config.get<boolean>('selectAfter', false);
}

async function pasteAndIndent() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    // Read clipboard BEFORE any editor mutation — this is the key perf win
    const clipboardText = await vscode.env.clipboard.readText();
    if (!clipboardText) {
        return;
    }

    const lines = clipboardText.split('\n');

    // Single-line paste: just insert directly, no indentation logic needed
    if (lines.length <= 1) {
        await editor.edit(editBuilder => {
            for (const sel of editor.selections) {
                if (sel.isEmpty) {
                    editBuilder.insert(sel.start, clipboardText);
                } else {
                    editBuilder.replace(sel, clipboardText);
                }
            }
        });
        return;
    }

    const insertSpaces = editor.options.insertSpaces as boolean;
    const tabSize = editor.options.tabSize as number;

    // Process each selection
    await editor.edit(editBuilder => {
        for (const sel of editor.selections) {
            const start = sel.start;

            // Determine the target indentation offset
            const startLineText = editor.document.getText(
                new vscode.Range(start.line, 0, start.line, start.character)
            );
            const firstNonWhitespace = startLineText.search(/\S/);
            const offset = firstNonWhitespace > -1 ? firstNonWhitespace : start.character;

            // Use extracted pure function for reindentation
            const result = reindentText(clipboardText, offset, { insertSpaces, tabSize });

            if (sel.isEmpty) {
                editBuilder.insert(start, result);
            } else {
                editBuilder.replace(sel, result);
            }
        }
    });

    // Handle selectAfter
    if (selectAfter && lines.length > 1) {
        const newSelections: vscode.Selection[] = [];
        for (const sel of editor.selections) {
            const startLine = sel.start.line;
            const endLine = sel.end.line;
            const lastLineLength = editor.document.lineAt(endLine).text.length;
            newSelections.push(new vscode.Selection(startLine + 1, 0, endLine, lastLineLength));
        }
        editor.selections = newSelections;
    }
}

export function activate(context: vscode.ExtensionContext) {
    loadConfig();
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('pasteAndIndent')) {
                loadConfig();
            }
        }),
        vscode.commands.registerCommand('pasteAndIndent.action', pasteAndIndent)
    );
}

export function deactivate() {}
