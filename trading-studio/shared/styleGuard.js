// "Avoid AI writing" rules for narration scripts.
// check() flags phrasing that reads as machine-written; clean() applies only the safe,
// meaning-preserving fixes (it never changes numbers, prices or dates).

// Word/phrase swaps that keep the meaning.
const SWAPS = [
  [/\bdelve(s|d)? into\b/gi, 'look at'],
  [/\bdive(s)? (deep )?into\b/gi, 'look at'],
  [/\b(let'?s|let us) dive in\b/gi, 'let’s start'],
  [/\bdeep dive\b/gi, 'close look'],
  [/\butili[sz]e(s|d)?\b/gi, 'use'],
  [/\bleverag(e|es|ed|ing)\b/gi, (m) => ({ e: 'use', es: 'uses', ed: 'used', ing: 'using' }[m.slice(6).toLowerCase()] || 'use')],
  [/\bin today'?s video\b/gi, 'in this video'],
  [/\bin today'?s (fast-paced )?(world|market|markets)\b/gi, 'today'],
  [/\bgame[- ]changer\b/gi, 'big difference'],
  [/\bunlock(s|ed)? the (power|secrets?) of\b/gi, 'use'],
  [/\bunlock(s|ed)?\b/gi, 'find'],
  [/\bunleash(es|ed)?\b/gi, 'use'],
  [/\bsupercharge(s|d)?\b/gi, 'improve'],
  [/\belevate(s|d)? your\b/gi, 'improve your'],
  [/\bharness(es|ed)? the power of\b/gi, 'use'],
  [/\bin the realm of\b/gi, 'in'],
  [/\ba testament to\b/gi, 'proof of'],
  [/\bembark(s|ed)? on\b/gi, 'start'],
  [/\bseamless(ly)?\b/gi, 'smooth$1'],
  [/\brobust\b/gi, 'solid'],
  [/\bpivotal\b/gi, 'key'],
  [/\bcrucial\b/gi, 'key'],
  [/\bnavigat(e|es|ing) the markets?\b/gi, 'trad$1 the market'],
  [/\bit'?s (also )?worth noting that\s*/gi, ''],
  [/\bit is (also )?worth noting that\s*/gi, ''],
  [/\bneedless to say,?\s*/gi, ''],
  [/\bat the end of the day,?\s*/gi, ''],
  [/\b(moreover|furthermore|additionally),\s*/gi, 'Also, '],
  [/\bultimately,\s*/gi, ''],
  [/\bimportantly,\s*/gi, ''],
  [/\bin conclusion,\s*/gi, ''],
  [/\bread that again\.?\s*/gi, ''],
  [/\bhere'?s the (thing|truth|kicker|catch|secret)[:,.]?\s*/gi, ''],
  [/\b(it'?s|this is|that'?s) not (just |only )?[^.,;!?]{1,50}[,;]\s*(it'?s|this is|but)\s+/gi, (m, a) => `${a} `],
  [/\blet that sink in\.?\s*/gi, ''],
  [/\b(really|truly|incredibly|absolutely|literally|super) (?=\w)/gi, ''],
];

// Things to flag (some also auto-fixable, see clean()).
export const RULES = [
  { id: 'emdash', label: 'Em-dash aside', re: /(?<!\d)\s?[—–]\s?|\s?[—–]\s?(?!\d)/g, tip: 'Split into two sentences or use a comma.' },
  { id: 'notbut', label: '“Not X, but Y” framing', re: /\b(it'?s |this is |that'?s )?not (just |only |about )?[^.,;!?]{1,50}[,;]\s*(but|it'?s|this is)\b/gi, tip: 'Say what it is directly.' },
  { id: 'reveal', label: 'Colon-reveal / drama setup', re: /\b(here'?s the (thing|truth|kicker|catch|secret)|the (truth|reality|secret) is|plot twist|spoiler|the best part)\b[:?]?/gi, tip: 'State the point plainly.' },
  { id: 'qa', label: 'Question-then-answer device', re: /\b(the (worst|best|scary|crazy) part|and the result|guess what|want to know (why|the secret))\?/gi, tip: 'Make it a statement.' },
  { id: 'hype', label: 'Hype or AI-cliché word', re: /\b(delve|dive into|deep dive|unlock|unleash|game[- ]changer|supercharge|elevate|harness|leverage|utili[sz]e|realm|tapestry|testament|embark|seamless|robust|pivotal|crucial|landscape|journey|secret sauce|level up|buckle up|holy grail|mind[- ]blowing|insane|crushing it)\b/gi, tip: 'Use a plain word.' },
  { id: 'filler', label: 'Filler phrase', re: /\b(it'?s worth noting|needless to say|at the end of the day|in today'?s (world|video|market)|moreover|furthermore|ultimately|importantly|in conclusion|read that again|let that sink in|whether you'?re a beginner or)\b/gi, tip: 'Cut it.' },
  { id: 'intens', label: 'Empty intensifier', re: /\b(really|truly|incredibly|absolutely|literally|super)\b/gi, tip: 'Cut it.' },
  { id: 'opener', label: 'Stock opener', re: /\b(ever wondered|have you ever (wondered|asked yourself)|imagine this|picture this|what if i told you)\b/gi, tip: 'Open with the real chart moment.' },
  { id: 'excl', label: 'Exclamation mark', re: /!/g, tip: 'Use a period. Calm narration lands better.' },
  { id: 'scare', label: 'Scare quotes around a term', re: /[“"]\s?[a-z][a-z\s-]{2,24}\s?[”"]/g, tip: 'Use the term without quotes.' },
];

export function check(text = '') {
  const issues = [];
  for (const r of RULES) {
    r.re.lastIndex = 0;
    let m;
    while ((m = r.re.exec(text))) {
      issues.push({ rule: r.id, label: r.label, tip: r.tip, match: m[0].trim() || m[0], index: m.index });
      if (!r.re.global) break;
    }
  }
  return issues.sort((a, b) => a.index - b.index);
}

const cap = (s) => s.replace(/(^|[.?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());

export function clean(text = '') {
  let t = text;
  for (const [re, rep] of SWAPS) t = t.replace(re, rep);
  // Em-dash asides: "A — B — C" → "A, B, C"; a single dash before a clause → period.
  // Dashes between digits are ranges (prices, times) and stay as they are.
  t = t.replace(/\s*[—–]\s*/g, (m, off, str) => (/\d/.test(str[off - 1] || '') && /\d/.test(str[off + m.length] || '') ? m : ', '));
  t = t.replace(/!/g, '.');
  t = t.replace(/\.\s*\./g, '.').replace(/,\s*\./g, '.').replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ');
  // Keep paragraph breaks intact.
  return t.split(/\n\s*\n/).map((p) => cap(p.trim())).join('\n\n');
}

export function cleanSections(sections = {}) {
  return Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, clean(v || '')]));
}

// Rule text for the Claude prompt.
export const PROMPT_RULES = `Writing rules (avoid AI-sounding writing):
- Plain, specific words. Never use: delve, dive into, deep dive, unlock, unleash, game-changer, supercharge, elevate, harness, leverage, utilize, realm, tapestry, testament, embark, seamless, robust, pivotal, crucial, landscape, journey, secret sauce, level up, holy grail.
- No em-dashes. No exclamation marks. No scare quotes.
- No "not X, but Y" framing, no colon reveals ("Here's the thing:"), no question-then-answer devices ("The worst part?"), no stock openers ("Ever wondered", "Picture this").
- No filler: "it's worth noting", "ultimately", "moreover", "at the end of the day", "read that again", "let that sink in".
- No empty intensifiers (really, truly, incredibly, absolutely, literally).
- Short declarative sentences. One idea per sentence. Say what is on the chart.`;
