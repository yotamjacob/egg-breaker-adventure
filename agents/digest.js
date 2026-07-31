#!/usr/bin/env node
// ============================================================
//  Egg Breaker — weekly promotion digest
//
//  Runs two research agents (communities + mentions), de-duplicates
//  against agents/seen.json, and emails one combined HTML digest.
//
//  Usage:
//    node agents/digest.js              # full run, sends the weekly email
//    node agents/digest.js --test       # same, subject prefixed [TEST]
//    node agents/digest.js --dry-run    # research + render, DO NOT send
//    node agents/digest.js --smoke      # send a tiny email, no research
//
//  Env:
//    ANTHROPIC_API_KEY  required (except --smoke)
//    RESEND_API_KEY     required (except --dry-run)
//    DIGEST_FROM        required — must use a Resend-verified domain
//    DIGEST_TO          default yotamjacob@gmail.com
//
//  Why two API calls per section: the research call uses the web_search
//  server tool, whose results carry citations — and structured outputs
//  (output_config.format) are rejected alongside citations. So research
//  runs free-form, then a second tool-less call structures the findings
//  against a JSON schema. That keeps parsing reliable without fighting
//  the citation/structured-output incompatibility.
// ============================================================

'use strict';

const fs   = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { communitiesPrompt, mentionsPrompt } = require('./prompts');

const ARGS     = process.argv.slice(2);
const IS_TEST  = ARGS.includes('--test');
const DRY_RUN  = ARGS.includes('--dry-run');
const SMOKE    = ARGS.includes('--smoke');

const TO        = process.env.DIGEST_TO || 'yotamjacob@gmail.com';
const FROM      = process.env.DIGEST_FROM;
const SEEN_PATH = path.join(__dirname, 'seen.json');

// Never let a search result from these hosts through, whatever the model says.
// Reddit is a hard product rule; the rest are noise sources for this niche.
const BLOCKED_HOSTS = ['reddit.com', 'redd.it'];

const MODEL = 'claude-opus-5';

// ── State ─────────────────────────────────────────────────────

function loadSeen() {
  try {
    const raw = JSON.parse(fs.readFileSync(SEEN_PATH, 'utf8'));
    return {
      communities: Array.isArray(raw.communities) ? raw.communities : [],
      mentions:    Array.isArray(raw.mentions)    ? raw.mentions    : [],
      runs:        Array.isArray(raw.runs)        ? raw.runs        : [],
    };
  } catch (e) {
    return { communities: [], mentions: [], runs: [] };
  }
}

function saveSeen(seen) {
  fs.writeFileSync(SEEN_PATH, JSON.stringify(seen, null, 2) + '\n');
}

/**
 * Dedup key. Normalises a URL down to host+path so that tracking params,
 * protocol, www and trailing slashes don't make the same item look new
 * every single week.
 */
function keyOf(item) {
  const url = (item.url || '').trim();
  if (!url) return (item.name || item.source || '').toLowerCase().trim();
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const p = u.pathname.replace(/\/+$/, '').toLowerCase();
    return host + p;
  } catch (e) {
    return url.toLowerCase().replace(/\/+$/, '');
  }
}

function isBlocked(item) {
  const url = (item.url || '').toLowerCase();
  const text = JSON.stringify(item).toLowerCase();
  if (BLOCKED_HOSTS.some(h => url.includes(h))) return true;
  // Catch "r/somesubreddit" style references even without a link.
  if (/\br\/[a-z0-9_]{2,}/.test(text)) return true;
  return false;
}

// ── Anthropic ─────────────────────────────────────────────────

// Trim explicitly: a key pasted through a clipboard or `gh secret set` can pick
// up a trailing newline or stray whitespace, which the API rejects as
// `invalid x-api-key` — a 401 that looks identical to a genuinely bad key.
const RAW_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
if (!RAW_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
if (!RAW_KEY.startsWith('sk-ant-')) {
  log(`WARNING: key does not start with "sk-ant-" (starts with "${RAW_KEY.slice(0, 3)}…", length ${RAW_KEY.length}) — this is probably not an Anthropic API key`);
}
const client = new Anthropic({ apiKey: RAW_KEY });

/**
 * Stage 1 — research with the web_search server tool.
 * Streamed because web search plus adaptive thinking can run long, and a
 * non-streaming call at this max_tokens risks an SDK HTTP timeout.
 */
async function research(prompt, label) {
  log(`[${label}] researching…`);
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    output_config: { effort: 'high' },
    tools: [{
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: 14,
      // Enforcement layer 2: the model never even sees Reddit results.
      blocked_domains: BLOCKED_HOSTS,
    }],
    messages: [{ role: 'user', content: prompt }],
  });
  const msg = await stream.finalMessage();

  if (msg.stop_reason === 'refusal') {
    log(`[${label}] refused: ${msg.stop_details?.category || 'unknown'}`);
    return '';
  }
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  log(`[${label}] research done (${text.length} chars, ${msg.usage.output_tokens} out-tokens)`);
  return text;
}

/** Stage 2 — structure free-form findings into JSON. No tools, so no citations. */
async function structure(findings, schema, label) {
  if (!findings.trim()) return { summary: 'No findings this week.', best_action: '', items: [] };
  log(`[${label}] structuring…`);
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema },
    },
    messages: [{
      role: 'user',
      content:
        'Convert the research notes below into the required JSON structure.\n\n' +
        'Rules:\n' +
        '- Include ONLY items actually present in the notes. Invent nothing.\n' +
        '- Exclude anything on Reddit.\n' +
        '- `summary` must be at most two sentences: how many items, and the ' +
        'single best action to take this week.\n' +
        '- `best_action` is one concrete sentence naming the one thing worth ' +
        'doing first.\n\n' +
        '--- RESEARCH NOTES ---\n' + findings,
    }],
  });

  if (msg.stop_reason === 'refusal') return { summary: 'Structuring refused.', best_action: '', items: [] };
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
  try {
    return JSON.parse(text);
  } catch (e) {
    log(`[${label}] JSON parse failed: ${e.message}`);
    return { summary: 'Could not structure findings this week.', best_action: '', items: [] };
  }
}

// ── Schemas ───────────────────────────────────────────────────

const COMMUNITIES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'best_action', 'items'],
  properties: {
    summary:     { type: 'string' },
    best_action: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'url', 'platform', 'size_activity', 'why_it_fits', 'promo_policy', 'first_action'],
        properties: {
          name:          { type: 'string' },
          url:           { type: 'string' },
          platform:      { type: 'string' },
          size_activity: { type: 'string' },
          why_it_fits:   { type: 'string' },
          promo_policy:  { type: 'string' },
          first_action:  { type: 'string' },
        },
      },
    },
  },
};

const MENTIONS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'best_action', 'items'],
  properties: {
    summary:     { type: 'string' },
    best_action: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['source', 'url', 'date', 'snippet', 'context', 'draft_reply'],
        properties: {
          source:      { type: 'string' },
          url:         { type: 'string' },
          date:        { type: 'string' },
          snippet:     { type: 'string' },
          context:     { type: 'string' },
          draft_reply: { type: 'string' },
        },
      },
    },
  },
};

// ── HTML ──────────────────────────────────────────────────────

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function linkify(url) {
  const u = String(url || '').trim();
  if (!/^https?:\/\//i.test(u)) return esc(u);
  return `<a href="${esc(u)}" style="color:#2d6cdf;text-decoration:none">${esc(u.replace(/^https?:\/\//, '').slice(0, 70))}</a>`;
}

function sectionHtml(title, subtitle, data, rows) {
  const items = data.items || [];
  const body = items.length
    ? items.map(rows).join('')
    : `<tr><td style="padding:18px 20px;color:#6b7280;font-size:14px">
         Nothing new this week.
       </td></tr>`;

  return `
  <tr><td style="padding:30px 24px 6px">
    <div style="font:700 11px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af">${esc(subtitle)}</div>
    <h2 style="margin:8px 0 0;font:700 21px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">${esc(title)}</h2>
    <p style="margin:10px 0 0;font:400 15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#374151">${esc(data.summary || '')}</p>
    ${data.best_action ? `<p style="margin:12px 0 0;padding:11px 14px;background:#f0f6ff;border-left:3px solid #2d6cdf;border-radius:0 6px 6px 0;font:600 14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e3a8a">▸ ${esc(data.best_action)}</p>` : ''}
  </td></tr>
  <tr><td style="padding:14px 24px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 10px">${body}</table>
  </td></tr>`;
}

const field = (label, value) => value
  ? `<div style="margin-top:7px"><span style="font:700 12px/1.5 -apple-system,sans-serif;color:#6b7280">${esc(label)}</span>
       <span style="font:400 14px/1.55 -apple-system,sans-serif;color:#374151">${esc(value)}</span></div>`
  : '';

function communityRow(it) {
  return `<tr><td style="padding:16px 18px;background:#fff;border:1px solid #e5e7eb;border-radius:9px">
    <div style="font:700 16px/1.35 -apple-system,sans-serif;color:#111827">${esc(it.name)}</div>
    <div style="margin-top:3px;font:400 13px/1.5 -apple-system,sans-serif">${linkify(it.url)}</div>
    ${field('Platform:', it.platform)}
    ${field('Activity:', it.size_activity)}
    ${field('Why it fits:', it.why_it_fits)}
    ${field('Promo policy:', it.promo_policy)}
    <div style="margin-top:11px;padding:10px 12px;background:#f0fdf4;border-radius:6px">
      <span style="font:700 12px/1.5 -apple-system,sans-serif;color:#166534">SUGGESTED FIRST ACTION</span><br>
      <span style="font:400 14px/1.55 -apple-system,sans-serif;color:#14532d">${esc(it.first_action)}</span>
    </div>
  </td></tr>`;
}

function mentionRow(it) {
  return `<tr><td style="padding:16px 18px;background:#fff;border:1px solid #e5e7eb;border-radius:9px">
    <div style="font:700 16px/1.35 -apple-system,sans-serif;color:#111827">${esc(it.source)}
      <span style="font:400 13px;color:#9ca3af">· ${esc(it.date)}</span></div>
    <div style="margin-top:3px;font:400 13px/1.5 -apple-system,sans-serif">${linkify(it.url)}</div>
    ${field('What they said:', it.snippet)}
    ${field('Context:', it.context)}
    <div style="margin-top:11px;padding:10px 12px;background:#fffbeb;border-radius:6px">
      <span style="font:700 12px/1.5 -apple-system,sans-serif;color:#92400e">DRAFT REPLY — review before posting</span><br>
      <span style="font:400 14px/1.6 -apple-system,sans-serif;color:#78350f;white-space:pre-wrap">${esc(it.draft_reply)}</span>
    </div>
  </td></tr>`;
}

function renderEmail(dateStr, communities, mentions) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:22px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border-radius:13px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.09)">

  <tr><td style="padding:26px 24px;background:linear-gradient(135deg,#16213e,#1a1a2e)">
    <div style="font:700 20px/1.3 -apple-system,sans-serif;color:#f5c542">🥚 Egg Breaker weekly digest</div>
    <div style="margin-top:5px;font:400 14px/1.4 -apple-system,sans-serif;color:#9fb3d1">${esc(dateStr)} · organic growth research</div>
  </td></tr>

  ${sectionHtml('Communities', 'Section A', communities, communityRow)}
  ${sectionHtml('"Egg Breaker" mentions', 'Section B', mentions, mentionRow)}

  <tr><td style="padding:24px;border-top:1px solid #e5e7eb;margin-top:20px">
    <p style="margin:0;font:400 12px/1.6 -apple-system,sans-serif;color:#9ca3af">
      Research only — nothing has been posted anywhere. Every suggestion and draft
      reply is for you to review and act on personally.<br>
      Reddit is excluded by design. Items already reported in previous weeks are
      filtered out via <code>agents/seen.json</code>.
    </p>
  </td></tr>

</table></td></tr></table></body></html>`;
}

// ── Delivery ──────────────────────────────────────────────────

async function sendEmail(subject, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key)  throw new Error('RESEND_API_KEY is not set');
  if (!FROM) throw new Error('DIGEST_FROM is not set (must be a Resend-verified sending domain)');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [TO], subject, html }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body}`);
  log(`email sent → ${TO} (${JSON.parse(body).id})`);
}

function log(msg) { console.log(`[digest] ${msg}`); }

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  if (SMOKE) {
    await sendEmail(
      `Egg Breaker weekly digest — SMOKE TEST ${dateStr}`,
      renderEmail(dateStr,
        { summary: 'Smoke test — no research was run.', best_action: 'Confirm this email arrived, then run the real digest.', items: [] },
        { summary: 'Smoke test — no research was run.', best_action: '', items: [] }),
    );
    return;
  }

  const seen = loadSeen();
  log(`seen: ${seen.communities.length} communities, ${seen.mentions.length} mentions`);

  // Run both research agents concurrently — they are independent.
  const [commRaw, mentRaw] = await Promise.all([
    research(communitiesPrompt(seen.communities), 'communities'),
    research(mentionsPrompt(seen.mentions), 'mentions'),
  ]);

  const [commData, mentData] = await Promise.all([
    structure(commRaw, COMMUNITIES_SCHEMA, 'communities'),
    structure(mentRaw, MENTIONS_SCHEMA, 'mentions'),
  ]);

  // Enforcement layer 3 + dedup.
  const filterNew = (data, seenKeys) => {
    const before = (data.items || []).length;
    const kept = [];
    for (const it of data.items || []) {
      if (isBlocked(it)) { log(`  dropped (blocked source): ${it.name || it.source}`); continue; }
      const k = keyOf(it);
      if (!k || seenKeys.includes(k)) continue;
      kept.push(it);
    }
    if (before !== kept.length) log(`  filtered ${before} → ${kept.length}`);
    return { ...data, items: kept };
  };

  const communities = filterNew(commData, seen.communities);
  const mentions    = filterNew(mentData, seen.mentions);

  log(`new this week: ${communities.items.length} communities, ${mentions.items.length} mentions`);

  const html = renderEmail(dateStr, communities, mentions);
  const subject = `${IS_TEST ? '[TEST] ' : ''}Egg Breaker weekly digest — ${dateStr}`;

  if (DRY_RUN) {
    const out = path.join(__dirname, 'preview.html');
    fs.writeFileSync(out, html);
    log(`dry run — wrote ${out}, nothing sent`);
    return;
  }

  await sendEmail(subject, html);

  // Only record items AFTER a successful send, so a delivery failure doesn't
  // silently swallow a week's findings.
  seen.communities.push(...communities.items.map(keyOf));
  seen.mentions.push(...mentions.items.map(keyOf));
  seen.runs.push({ at: now.toISOString(), communities: communities.items.length, mentions: mentions.items.length });
  if (seen.runs.length > 100) seen.runs = seen.runs.slice(-100);
  saveSeen(seen);
  log('seen.json updated');
}

main().catch(err => {
  console.error('[digest] FAILED:', err.message);
  process.exit(1);
});
