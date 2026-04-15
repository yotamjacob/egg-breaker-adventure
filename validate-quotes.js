#!/usr/bin/env node
// validate-quotes.js
// PostToolUse hook: called after any Edit to data.js
// Reads stdin JSON, checks if the edited file is data.js, then
// scans all ITEM_QUOTES entries for quotes exceeding MAX_LEN chars.
// Outputs JSON with systemMessage listing violations (or nothing if clean).

const MAX_LEN = 60; // ~2 lines at the popup's font-size/max-width
const TARGET  = 'data.js';

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input || '{}');
    const filePath = (payload.tool_input && payload.tool_input.file_path) || '';
    if (!filePath.endsWith(TARGET)) process.exit(0); // not our file — silent

    const fs = require('fs');
    const src = fs.readFileSync(filePath, 'utf8');

    // Extract all item quotes from ITEM_QUOTES (format: 'Item Name': '"Quote text."').
    // Values are single-quoted strings containing an inner double-quoted quote.
    const violations = [];
    const lineRe = /^\s*'([^']+)'\s*:\s*'"((?:[^"\\]|\\.)*)"'/gm;
    let m;
    while ((m = lineRe.exec(src)) !== null) {
      const name  = m[1];
      const quote = m[2];
      if (quote.length > MAX_LEN) {
        violations.push({ name, quote, len: quote.length });
      }
    }

    if (violations.length === 0) process.exit(0); // all good — silent

    const lines = violations.map(v =>
      `  "${v.name}": ${v.len} chars — "${v.quote}"`
    ).join('\n');

    const msg = `data.js quote check: ${violations.length} quote(s) exceed ${MAX_LEN} chars (2-line limit):\n${lines}`;
    process.stdout.write(JSON.stringify({ systemMessage: msg }));
  } catch (e) {
    // Never block the user on a validation error
    process.exit(0);
  }
});
