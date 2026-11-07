// Script writing engines for the Node server.
//  - "claude": Anthropic API server-side (ANTHROPIC_API_KEY or stored key), never exposed to the browser.
//  - "local": deterministic built-in writer (shared/writer.js).
import Anthropic from '@anthropic-ai/sdk';
import { getSecret } from './db.js';
import { SYSTEM, SECTIONS_SCHEMA, TEXT_SCHEMA, claudePrompt, runLocalOp } from '../shared/writer.js';
import { clean, cleanSections } from '../shared/styleGuard.js';

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';

export function claudeKey() {
  return process.env.ANTHROPIC_API_KEY || getSecret('anthropicApiKey');
}

async function callClaude(userPrompt, schema) {
  const client = new Anthropic({ apiKey: claudeKey() });
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: userPrompt }],
  });
  if (response.stop_reason === 'refusal') {
    throw Object.assign(new Error('The model declined this request. Try adjusting the topic or wording.'), { status: 422 });
  }
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

export async function runScriptOp(body = {}) {
  const { engine = 'local', op } = body;
  if (engine === 'claude') {
    if (!claudeKey()) throw Object.assign(new Error('Claude is not connected. Add an Anthropic API key in Settings → Integrations, or use the local writer.'), { status: 400 });
    const schema = op === 'rewrite' ? TEXT_SCHEMA : SECTIONS_SCHEMA;
    const result = await callClaude(claudePrompt(op, body), schema);
    return op === 'rewrite' ? { text: clean(result.text) } : { sections: cleanSections(result) };
  }
  return runLocalOp(body);
}
