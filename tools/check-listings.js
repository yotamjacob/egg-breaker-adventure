// ============================================================
//  Validates marketing/store-listings/*.md against Google Play's
//  field limits. Play Console rejects an over-length field on save,
//  which is a slow round-trip to discover manually — especially for
//  locales where the translation runs longer than the English.
//
//  Run: node tools/check-listings.js
// ============================================================

const fs   = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'marketing', 'store-listings');

const LIMITS = {
  'Title':             30,
  'Short description': 80,
  'Full description':  4000,
};

/** Pulls the fenced code block that follows a `## <heading>` section. */
function section(src, heading) {
  const re = new RegExp('##\\s+' + heading + '\\s*\\n+```\\n([\\s\\S]*?)\\n```', 'i');
  const m = src.match(re);
  return m ? m[1] : null;
}

let failures = 0;
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.md') && f !== 'README.md').sort();

if (!files.length) {
  console.error('No listing files found in', DIR);
  process.exit(1);
}

for (const file of files) {
  const src = fs.readFileSync(path.join(DIR, file), 'utf8');
  console.log('\n' + file);

  for (const [heading, limit] of Object.entries(LIMITS)) {
    const body = section(src, heading);
    if (body === null) {
      console.log(`  ✗ ${heading}: MISSING`);
      failures++;
      continue;
    }
    // Play counts characters, not bytes — [...str] counts by code point so
    // emoji and Hebrew are measured the way the Console measures them.
    const len = [...body].length;
    const ok  = len <= limit;
    if (!ok) failures++;
    console.log(`  ${ok ? '✓' : '✗'} ${heading}: ${len}/${limit}`);
  }
}

console.log(failures === 0
  ? '\nAll listings within Play Console limits.'
  : `\n${failures} problem(s) found.`);
process.exit(failures === 0 ? 0 : 1);
