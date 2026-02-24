import { describe, it, expect } from 'vitest';
import { reindentText } from './indent';

const SPACES_4: { insertSpaces: boolean; tabSize: number } = { insertSpaces: true, tabSize: 4 };
const TABS: { insertSpaces: boolean; tabSize: number } = { insertSpaces: false, tabSize: 4 };

describe('reindentText', () => {
    // ─── Single line ────────────────────────────────────────
    it('returns single-line text unchanged', () => {
        expect(reindentText('hello world', 4, SPACES_4)).toBe('hello world');
    });

    // ─── Multi-line, paste at col 0, already aligned ────────
    it('returns text unchanged when xmin=0 and offset=0', () => {
        const text = 'function foo() {\n    return 1;\n}';
        expect(reindentText(text, 0, SPACES_4)).toBe(text);
    });

    // ─── Multi-line, paste at indented position ─────────────
    it('shifts all lines to match target offset (spaces)', () => {
        const text = 'if (true) {\n    x = 1;\n}';
        // xmin of lines 1+ is 4 ("    x") and 0 ("}"), so xmin=0
        // offset=8, so lines shift by +8
        const result = reindentText(text, 8, SPACES_4);
        const lines = result.split('\n');
        expect(lines[0]).toBe('if (true) {');       // first line unchanged
        expect(lines[1]).toBe('            x = 1;'); // 4-0+8=12 spaces
        expect(lines[2]).toBe('        }');           // 0-0+8=8 spaces
    });

    it('shifts all lines to match target offset (tabs)', () => {
        const text = 'if (true) {\n\tx = 1;\n}';
        // xmin=0 ("}"), offset=2
        const result = reindentText(text, 2, TABS);
        const lines = result.split('\n');
        expect(lines[0]).toBe('if (true) {');
        expect(lines[1]).toBe('\t\t\tx = 1;');  // 1-0+2=3 tabs
        expect(lines[2]).toBe('\t\t}');           // 0-0+2=2 tabs
    });

    // ─── Blank lines preserved ──────────────────────────────
    it('preserves blank lines without adding indentation', () => {
        const text = 'a\n\nb';
        const result = reindentText(text, 4, SPACES_4);
        const lines = result.split('\n');
        expect(lines[0]).toBe('a');
        expect(lines[1]).toBe('');    // blank line stays blank
        expect(lines[2]).toBe('    b'); // 0-0+4 = 4 spaces
    });

    // ─── Normalizes mixed tabs/spaces in space mode ─────────
    it('normalizes tabs to spaces when in space mode', () => {
        // Line with 1 tab (= 4 spaces in tabSize=4) + 'x'
        const text = 'first\n\tx';
        const result = reindentText(text, 2, SPACES_4);
        const lines = result.split('\n');
        expect(lines[0]).toBe('first');
        // tab expands to 4, xmin=4, offset=2 → 4-4+2=2 spaces
        expect(lines[1]).toBe('  x');
    });

    // ─── Normalizes mixed tabs/spaces in tab mode ───────────
    it('normalizes spaces to tabs when in tab mode', () => {
        // Line with 4 spaces + 'x' → in tab mode, 4 space chars count as 0 tabs
        const text = 'first\n    x';
        const result = reindentText(text, 1, TABS);
        const lines = result.split('\n');
        expect(lines[0]).toBe('first');
        // ls = search(/\S/) = 4, nonTabCount = 4 leading spaces, ls = 4-4 = 0
        // xmin=0, offset=1 → 0-0+1 = 1 tab
        expect(lines[1]).toBe('\tx');
    });

    // ─── Preserves relative indentation ─────────────────────
    it('preserves relative indentation between lines', () => {
        const text = 'function foo() {\n    if (true) {\n        return 1;\n    }\n}';
        const result = reindentText(text, 4, SPACES_4);
        const lines = result.split('\n');
        expect(lines[0]).toBe('function foo() {');
        expect(lines[1]).toBe('        if (true) {');  // 4-0+4=8
        expect(lines[2]).toBe('            return 1;'); // 8-0+4=12
        expect(lines[3]).toBe('        }');             // 4-0+4=8
        expect(lines[4]).toBe('    }');                 // 0-0+4=4
    });

    // ─── Already indented source, paste deeper ──────────────
    it('re-bases indentation when source has base indent', () => {
        // Source is indented at 8 spaces base
        const text = 'outer\n        inner1\n            inner2';
        // xmin = 8 (inner1), offset = 2
        const result = reindentText(text, 2, SPACES_4);
        const lines = result.split('\n');
        expect(lines[0]).toBe('outer');
        expect(lines[1]).toBe('  inner1');     // 8-8+2=2
        expect(lines[2]).toBe('      inner2'); // 12-8+2=6
    });

    // ─── Empty string ───────────────────────────────────────
    it('handles empty string', () => {
        expect(reindentText('', 4, SPACES_4)).toBe('');
    });

    // ─── Only whitespace lines ──────────────────────────────
    it('handles text with only whitespace lines', () => {
        const text = '   \n   \n   ';
        // All lines have ls=-1 (no non-whitespace), xmin stays undefined
        // xmin=0&&offset=0 → false because offset=4
        // xminSafe=0, all lines have x=-1 → treated as blank
        const result = reindentText(text, 4, SPACES_4);
        const lines = result.split('\n');
        expect(lines[0]).toBe('   '); // first line kept as-is
        expect(lines[1]).toBe('');     // blank stripped
        expect(lines[2]).toBe('');     // blank stripped
    });
});
