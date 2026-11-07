// Trading explainer script writer, shared by the Node server and the browser build.
// The local writer composes scripts from the concept library and the approved REAL chart examples:
// every price, date and outcome it mentions comes from the example data, never invented.
// The Claude path receives the same facts and is instructed to use only them.
import { SECTIONS, SECTION_LABELS } from './defaults.js';
import { splitSentences, wordCount } from './scenes.js';
import { conceptById } from './concepts.js';
import { sourceLabel } from './examples.js';
import { clean, cleanSections, PROMPT_RULES } from './styleGuard.js';

const shortSym = (s = '') => s.split(':').pop().replace('1!', '');

function exampleIntro(ex) {
  if (ex.kind === 'screenshot') return `Here is a chart ${ex.source?.label ? `from ${ex.source.label}` : 'you provided'}.`;
  const date = ex.keyLabel?.split(' ')[0] || '';
  return `Here is a real ${shortSym(ex.symbol)} ${ex.interval} chart from ${date}, ${/^Outside/.test(ex.session) ? 'outside the main sessions' : `during the ${ex.session}`}. ${ex.source?.kind === 'tradingview-connector' ? 'The data comes from TradingView.' : 'The data comes from an imported chart export.'}`;
}

function levelLine(level, concept) {
  if (level === 'Beginner') return `No prior knowledge needed: we start from what a ${concept.short} is.`;
  if (level === 'Advanced') return `We go past the definition into the exact conditions and where it fails.`;
  return `We cover the definition, the exact rules and a real trade idea.`;
}

function trimTo(text, maxWords) {
  const out = [];
  let n = 0;
  for (const s of splitSentences(text)) {
    if (out.length && n + wordCount(s) > maxWords) break;
    out.push(s);
    n += wordCount(s);
  }
  return out.join(' ');
}

const KEY_STEPS = new Set(['formation', 'imbalance', 'sweep', 'break', 'level', 'change', 'pattern', 'zone', 'candle', 'fake', 'range', 'fail', 'invert', 'displace', 'spike', 'cross', 'pool', 'block', 'flip', 'man']);

// Split teaching steps between "demo" (what happened) and "breakdown" (outcome, trade, risk).
function stepParagraphs(ex, short) {
  const steps = ex.steps || [];
  let chosen = steps;
  if (short) {
    const key = steps.filter((s) => KEY_STEPS.has(s.id));
    const trade = ['trade', 'after', 'dist', 'real', 'outcome'].map((id) => steps.find((s) => s.id === id)).find(Boolean);
    chosen = [...new Set([...(key.length ? key.slice(0, 3) : steps.slice(0, 2)), trade].filter(Boolean))];
  }
  const breakdownIds = new Set(['outcome', 'trade', 'risk', 'after', 'use', 'retest', 'dist', 'real', 'third', 'meaning']);
  return {
    demo: chosen.filter((s) => !breakdownIds.has(s.id)).map((s) => s.text),
    breakdown: chosen.filter((s) => breakdownIds.has(s.id)).map((s) => s.text),
  };
}

export function composeScript({ concept, examples = [], inputs = {} }) {
  const c = concept;
  if (!c) throw Object.assign(new Error('Choose a trading concept first.'), { status: 400 });
  const usable = examples.filter((e) => e.approved !== false);
  const short = (inputs.length || 'short') === 'short';
  const detailed = inputs.complexity === 'Detailed';
  const simple = inputs.complexity === 'Simple';
  const technicalTone = inputs.tone === 'Technical';
  const ex1 = usable[0];

  const hook = ex1 && ex1.kind !== 'screenshot' ? `${c.hook} On ${ex1.keyLabel.split(' ')[0]}, ${shortSym(ex1.symbol)} showed exactly this.` : c.hook;
  const intro = `This is the ${c.name}. ${levelLine(inputs.level, c)}${usable.length ? ` And we’ll see it on ${usable.length === 1 ? 'a real chart' : `${usable.length} real charts`}, not a drawing.` : ''}`;
  let simpleTxt = c.simple;
  if (inputs.level === 'Beginner' && !technicalTone) simpleTxt += ' Think of it as a footprint the market leaves behind. Once you know what it looks like, you start seeing it everywhere.';
  let technical = simple ? trimTo(c.technical, 30) : c.technical;
  if (detailed || inputs.level === 'Advanced') technical += ` What we need to see on the chart: ${c.conditions.charAt(0).toLowerCase()}${c.conditions.slice(1)}`;

  const demo = [];
  const breakdown = [];
  usable.forEach((ex, n) => {
    if (short && n > 0) return;
    const parts = ex.kind === 'screenshot' ? { demo: [ex.note || 'Look at the marked area on this chart.'], breakdown: [] } : stepParagraphs(ex, short);
    if (n === 0) demo.push(`${exampleIntro(ex)} ${parts.demo[0] || ''}`.trim(), ...parts.demo.slice(1));
    else breakdown.push(`Example ${n + 1}. ${exampleIntro(ex)} ${parts.demo[0] || ''}`.trim(), ...parts.demo.slice(1));
    breakdown.push(...parts.breakdown);
  });
  if (!usable.length) demo.push('Add an approved chart example in Chart Research to demonstrate this on a real chart.');
  if (!short && detailed) breakdown.push(`A common mistake: treating every ${c.short} as a signal. Context decides. Check higher-timeframe direction, the session, and whether liquidity was taken first.`);

  const takeaway = `${c.takeaway}${short ? '' : ` Before you act, check three things: the concept is clearly formed, it fits the higher-timeframe direction, and you know exactly where you are wrong.`}`;
  const ending = `${short ? 'Save this so you can spot it next time.' : `That’s the ${c.name}, on real price action.`} Trading involves risk, and this is education, not financial advice.`;

  const sections = { hook, intro, simple: simpleTxt, technical, demo: demo.join('\n\n'), breakdown: breakdown.join('\n\n'), takeaway, ending };
  if (short) {
    // Shorts: keep the spoken script near the target length; the chart carries the detail.
    sections.intro = trimTo(sections.intro, 14);
    sections.simple = trimTo(sections.simple, 26);
    sections.technical = trimTo(sections.technical, 28);
    sections.takeaway = trimTo(sections.takeaway, 22);
    const words = Object.values(sections).reduce((n, t) => n + wordCount(t), 0);
    const target = Math.round((inputs.duration || 60) * 2.6);
    if (words > target * 1.15) sections.simple = trimTo(sections.simple, 14);
  }
  return sections;
}

function expand(sections, concept) {
  return {
    ...sections,
    simple: `${sections.simple} The key is that it is objective: you can point to the exact candles.`,
    technical: `${sections.technical} What we need on the chart: ${concept.conditions}`,
    takeaway: `${sections.takeaway} Practice by marking ten examples on your own charts before risking money on it.`,
  };
}

function shorten(sections) {
  const out = {};
  for (const s of SECTIONS) {
    if (s === 'demo' || s === 'breakdown') { out[s] = sections[s]; continue; }
    const sents = splitSentences(sections[s] || '');
    out[s] = sents.slice(0, Math.max(1, Math.ceil(sents.length * 0.6))).join(' ');
  }
  return out;
}

function tone(sections, t) {
  const technicalOpen = 'Precisely defined: ';
  const strip = (x) => x.replace(technicalOpen, '');
  return { ...sections, technical: t === 'Technical' ? `${technicalOpen}${strip(sections.technical)}` : strip(sections.technical) };
}

function rewrite(text) {
  return text.replace(/\b(really|very|just|actually|basically)\s+/gi, '').replace(/\s+/g, ' ').trim();
}

export function runLocalOp(args) {
  const out = runLocalOpRaw(args);
  return out.sections ? { sections: cleanSections(out.sections) } : { text: clean(out.text) };
}

function runLocalOpRaw({ op, inputs = {}, sections = {}, conceptId, customConcepts = [], examples = [], text = '', section = 'hook' }) {
  const concept = conceptById(conceptId, customConcepts);
  switch (op) {
    case 'generate':
    case 'variant':
      return { sections: composeScript({ concept, examples, inputs }) };
    case 'expand':
      return { sections: expand(sections, concept || { conditions: '' }) };
    case 'shorten':
      return { sections: shorten(sections) };
    case 'tone':
      return { sections: tone(sections, inputs.tone) };
    case 'section': {
      const fresh = composeScript({ concept, examples, inputs });
      return { sections: { ...sections, [section]: fresh[section] } };
    }
    case 'rewrite':
      return { text: rewrite(text) };
    default:
      throw Object.assign(new Error(`Unknown operation ${op}`), { status: 400 });
  }
}

// ---------------------------------------------------------------- Claude
export const SYSTEM = `You write narration for professional trading education videos (YouTube) that explain one concept using REAL historical chart examples.
Voice: clear, calm, precise, like an experienced trading educator. Concrete, no hype, no motivational clichés, no promises of profit.
Rules:
- Use ONLY the prices, dates, times, instruments and outcomes given in the chart example facts. Never invent numbers, dates, win rates or results.
- If an example failed (stop hit or invalidated), say so plainly.
- Say "this is education, not financial advice" once at the end.
- Narration is spoken aloud: short sentences, no headings, no emojis, no stage directions.
${PROMPT_RULES}
Structure: exactly eight parts: hook, intro, simple, technical, demo, breakdown, takeaway, ending.
In "demo" and "breakdown", write ONE paragraph per chart step listed in the facts, in the same order, separated by a blank line, so each paragraph can be synced to its chart step.`;

export const SECTIONS_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(SECTIONS.map((s) => [s, { type: 'string' }])),
  required: SECTIONS,
  additionalProperties: false,
};
export const TEXT_SCHEMA = { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false };

function factsFor(examples, short) {
  return examples.filter((e) => e.approved !== false).slice(0, short ? 1 : 4).map((ex, n) => {
    if (ex.kind === 'screenshot') return `Example ${n + 1}: user-provided screenshot (${ex.source?.label || 'no source given'}). Note: ${ex.note || 'none'}`;
    const { demo, breakdown } = stepParagraphs(ex, short);
    return `Example ${n + 1}: ${sourceLabel(ex)}. ${ex.summary}. Session: ${ex.session}.\nDemo steps (one paragraph each, in order):\n${demo.map((d, k) => `  ${k + 1}. ${d}`).join('\n')}\nBreakdown steps (one paragraph each, in order):\n${breakdown.map((d, k) => `  ${k + 1}. ${d}`).join('\n')}`;
  }).join('\n\n');
}

export function claudePrompt(op, { inputs = {}, sections, conceptId, customConcepts = [], examples = [], text, instruction, section }) {
  const c = conceptById(conceptId, customConcepts) || { name: 'the selected concept', simple: '', technical: '', conditions: '' };
  const short = (inputs.length || 'short') === 'short';
  const brief = [
    `Concept: ${c.name}. Definition notes: ${c.simple} ${c.technical}`,
    `Audience level: ${inputs.level}. Tone: ${inputs.tone}. Complexity: ${inputs.complexity}.`,
    `Format: ${short ? 'YouTube Short' : 'long-form YouTube video'}, about ${inputs.duration} seconds of narration (~${Math.round((inputs.duration || 60) * 2.5)} words).`,
    inputs.notes ? `Creator notes: ${inputs.notes}` : '',
    `Chart example facts (the only numbers you may use):\n${factsFor(examples, short) || 'No examples approved yet. Do not describe any specific chart.'}`,
  ].filter(Boolean).join('\n');
  const current = sections ? `Current script (JSON):\n${JSON.stringify(sections, null, 2)}` : '';
  switch (op) {
    case 'generate':
    case 'variant':
      return `${brief}\n\nWrite the script${op === 'variant' ? ' as a fresh alternative version' : ''}. Return the eight parts as JSON.${op === 'variant' && current ? `\nAvoid reusing lines from:\n${current}` : ''}`;
    case 'expand':
      return `${brief}\n\n${current}\n\nExpand by about 30%, adding depth to the explanations (not new numbers). Keep the demo/breakdown paragraph structure. Return all eight parts.`;
    case 'shorten':
      return `${brief}\n\n${current}\n\nShorten by about 35%. Keep the demo/breakdown paragraph count. Return all eight parts.`;
    case 'tone':
      return `${brief}\n\n${current}\n\nRewrite in a ${inputs.tone?.toLowerCase()} tone for a ${inputs.level?.toLowerCase()} audience. Keep the demo/breakdown paragraph count. Return all eight parts.`;
    case 'section':
      return `${brief}\n\n${current}\n\nRewrite only the "${section}" part (${SECTION_LABELS[section]}). Return all eight parts with the others unchanged.`;
    case 'rewrite':
      return `${brief}\n\n${current}\n\nRewrite this passage. ${instruction || 'Make it clearer and tighter.'} Keep every number exactly as given.\nPassage:\n"""${text}"""\nReturn JSON {"text": "..."}.`;
    default:
      throw new Error(`Unknown operation ${op}`);
  }
}
