// Script writing logic shared by the Node server and the in-browser (artifact) build.
import { SECTIONS } from './defaults.js';
import { splitSentences, wordCount } from './scenes.js';

// ------------------------------------------------------------------
// Local writer line bank
// ------------------------------------------------------------------
const T = {
  'Why people start trading': {
    hook: ['Most people start trading because they want to become rich. That is exactly where the problem begins.', 'Nobody opens a trading account to learn patience. They open it to escape something.'],
    problem: ['They see the profits, the cars, the screenshots of perfect days. Nobody shows them the hundred quiet days of doing nothing, or the discipline it takes just to survive.', 'They arrive with a dream and no plan. The market does not care about the dream. It only responds to the plan.'],
    realization: ['Money was never the real reason. Freedom was. And freedom in this game is not something you take from the market. It is something you build in yourself, one disciplined decision at a time.'],
  },
  'Trading discipline': {
    hook: ['The setup was perfect. The rules said no. And that was the hardest trade he never took.', 'Discipline is not a feeling. It is what you do when every feeling tells you to do the opposite.'],
    problem: ['He knew his rules. He had written them down, printed them, taped them to the monitor. And still, one candle was enough to make him forget all of it.', 'Every trader has a plan. Very few have the discipline to follow it on the day it feels wrong.'],
    realization: ['The edge was never in the strategy. Thousands of people have the same strategy. The edge was in being the one person who executes it the same way, every single time.'],
  },
  'Trading psychology': {
    hook: ['The chart did not change. He did.', 'Your biggest opponent in the market does not have a trading account. It lives behind your eyes.'],
    problem: ['A winning trade made him reckless. A losing trade made him afraid. In both cases, the chart was the same. The only thing moving was his mind.', 'He blamed the market, the broker, the news. It took him two years to look at the one variable he controlled.'],
    realization: ['Trading is not a battle against the market. It is a long, quiet negotiation with yourself. Win that, and the charts start to look very different.'],
  },
  'Fear of missing out': {
    hook: ['It was already up forty percent. He bought anyway.', 'The most expensive feeling in trading has three letters.'],
    problem: ['Everyone online was celebrating. Screenshots everywhere. And sitting on the sidelines started to feel like losing. So he chased. Right at the top.', 'The fear was never about the money he could make. It was about watching someone else make it.'],
    realization: ['There will always be another move. Another coin. Another breakout. The market prints opportunities every day. What it does not print is a second chance for the account you blew chasing the last one.'],
  },
  'Revenge trading': {
    hook: ['He lost two hundred dollars. Then he lost two thousand trying to win it back.', 'The second trade is always bigger. That is how it starts.'],
    problem: ['The stop loss hit, and something in him snapped. Not a strategy. Not an analysis. Just anger, disguised as a trade. Then another. Then another.', 'After a loss, the mind demands justice. But the market is not a courtroom, and it does not owe you anything.'],
    realization: ['The loss was never the real damage. The real damage was the decision he made thirty seconds after it. Walking away is not weakness. It is the most profitable trade you will ever make.'],
  },
  Consistency: {
    hook: ['One great month means nothing. Twelve boring ones change your life.', 'He was not the best trader in the room. He was just the one who showed up the same way every day.'],
    problem: ['He kept looking for the trade that would change everything. The big one. Meanwhile, the small, repeatable edge sat right in front of him, ignored because it was boring.', 'Excitement felt like progress. It was not. It was noise.'],
    realization: ['Consistency is not a personality trait. It is a system. Same risk. Same process. Same review. Repeated until the results have no choice but to follow.'],
  },
  Patience: {
    hook: ['For six hours, he did nothing. It was the best day of his trading career.', 'The market pays patient people with the money of impatient ones.'],
    problem: ['Sitting still felt like failing. So he forced trades that were not there, just to feel like he was working.', 'He wanted results this week. The market works on a different clock.'],
    realization: ['Waiting is a position. Doing nothing, when nothing is the right move, is a skill most traders never learn. The ones who do, stay in the game long enough to win it.'],
  },
  'Risk management': {
    hook: ['He was right about the direction. He still lost everything.', 'You can survive being wrong. You cannot survive being oversized.'],
    problem: ['One trade. Twenty percent of the account. Just this once, because he was sure. The market only needed one candle to teach him the difference between confidence and risk.', 'Nobody gets into trading to study position sizing. Everybody who stays in trading eventually does.'],
    realization: ['Professionals do not ask how much they can make. They ask how much they can lose and still be here tomorrow. Protect the account first. The profits come to the people who are still standing.'],
  },
  'Financial freedom': {
    hook: ['Freedom does not look like a sports car. It looks like a quiet Tuesday morning that belongs to you.', 'He thought financial freedom was a number. It turned out to be a habit.'],
    problem: ['He traded to escape the job, the boss, the alarm clock. But without structure, the charts became a new boss. Louder. Less forgiving.', 'Chasing freedom with desperation only builds a different kind of prison.'],
    realization: ['Real freedom is not making money fast. It is building something that does not fall apart when you stop watching it. Slow, controlled, repeatable. That is what freedom is made of.'],
  },
  'Losing streaks': {
    hook: ['Seven losses in a row. Same strategy. Same rules. He almost quit on the eighth trade.', 'Every profitable trader has a losing streak they never post about.'],
    problem: ['After the fifth loss, he started changing everything. New indicators. New timeframes. New gurus. He was not fixing his strategy. He was running from it.', 'A losing streak does not just drain the account. It drains belief. And a trader without belief starts breaking their own rules.'],
    realization: ['A losing streak is not proof that you are wrong. It is part of the math. If the edge is real, the only way to lose is to stop executing it when it hurts the most.'],
  },
  'The reality of trading': {
    hook: ['Ninety percent of trading is waiting. Nobody films that part.', 'This is what trading actually looks like. Not the lifestyle. The desk.'],
    problem: ['Long hours staring at charts that do nothing. Journals full of mistakes. Doubts at two in the morning. That is the part of the story social media leaves out.', 'They sold him a lifestyle. What he got was a job — the hardest one he ever had.'],
    realization: ['Trading is not an escape from work. It is work. And the moment he accepted that, he finally started treating it like a profession instead of a lottery ticket.'],
  },
  'The psychology of successful traders': {
    hook: ['Successful traders are not fearless. They have simply stopped negotiating with their fear.', 'The best traders he ever met were also the most boring.'],
    problem: ['He assumed they had secret indicators, inside information, perfect timing. What they actually had was a process — and the emotional distance to follow it.', 'He studied their entries. He should have studied their reactions.'],
    realization: ['Winners think in probabilities, not predictions. One trade means nothing to them. A thousand trades executed with the same discipline means everything.'],
  },
  'Motivation after failure': {
    hook: ['The account hit zero. That was not the end of his story. That was page one.', 'Failure did not end his trading career. It started it.'],
    problem: ['He sat in front of the empty account balance for a long time. Every mistake replaying. Every rule he broke. Every warning he ignored.', 'Losing money hurts. Losing confidence hurts more. It whispers that you were never meant for this.'],
    realization: ['Failure is expensive tuition. The only way to waste it is to walk away without the lesson. He did not need a new account. He needed a new version of himself to trade it.'],
  },
  'Building a trading mindset': {
    hook: ['Before he changed his strategy, he had to change the person executing it.', 'A trading mindset is not something you find. It is something you build, brick by brick, trade by trade.'],
    problem: ['He kept upgrading his tools. Faster charts. Better indicators. More screens. But the same mind kept making the same mistakes on better equipment.', 'Knowledge was never his problem. He knew what to do. He just could not make himself do it.'],
    realization: ['The mindset comes first. Process over outcome. Risk before reward. Patience before action. Build that foundation, and every strategy you trade on top of it gets stronger.'],
  },
};

const STORY = [
  'So he started over. Smaller size. A written plan. A journal where he recorded not just his trades, but how he felt when he took them. The first weeks were painfully slow. Some days he did not trade at all. And for the first time, that felt like progress.',
  'He began to notice patterns. Not on the chart, but in himself. The trades he forced after a bad night. The size he increased after a win. The rules he quietly ignored on Fridays. The data was brutal. And it was exactly what he needed.',
  'One night, after another red day, he did something different. He closed the platform, opened his journal, and read every trade from the last three months. The answer was not hidden in an indicator. It was written in his own handwriting.',
  'Month after month, the results stayed unremarkable. No viral screenshots. No sudden fortune. Just a slowly rising line and a trader who no longer flinched every time the market moved.',
];

const CONCLUSION = [
  'The market will test you every single day. Not your intelligence. Your discipline. Show up, follow the plan, and let time do what talent never could.',
  'You do not need to win today. You need to still be here next year. Protect your capital, protect your mind, and keep going.',
  'Nobody will clap for the trades you did not take. Take pride in them anyway. That is where real traders are made.',
  'Your edge is not the strategy. It is the person who refuses to abandon it. Become that person.',
];

const EXPANSIONS = {
  hook: ['Stay with me, because this changes how you look at every trade.'],
  problem: ['And the worst part? He thought he was the only one.', 'Every loss felt personal. Every win felt deserved. Neither was true.'],
  story: ['It was not glamorous. It was not fast. But it was honest, and that was new.', 'He stopped asking how to make more and started asking how to lose less.'],
  realization: ['Read that again. Slowly.', 'It sounds simple. It is not easy. That gap is where most traders disappear.'],
  conclusion: ['Close the chart. Open the journal. Start again tomorrow.'],
};

const TONE_LINES = {
  Cinematic: { hook: 'Picture a single screen glowing in a dark room.', end: 'This is where the real trader begins.' },
  'Raw & honest': { hook: 'Let me be honest with you.', end: 'No shortcuts. No excuses. Just the work.' },
  Calm: { hook: 'Take a breath, and think about your last trade.', end: 'Slow down. The market will still be here tomorrow.' },
  Aggressive: { hook: 'Stop lying to yourself.', end: 'Get up. Fix it. Execute.' },
  Inspirational: { hook: 'Every great trader once stood exactly where you are.', end: 'Your best trades are still ahead of you.' },
  Dark: { hook: 'The market has buried better traders than you.', end: 'Respect it, or it will humble you.' },
  Warm: { hook: 'If you have ever felt like giving up, this one is for you.', end: 'Be patient with yourself. You are further than you think.' },
};

const SECTION_WEIGHT = { hook: 0.12, problem: 0.22, story: 0.33, realization: 0.18, conclusion: 0.15 };

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];

function fitToWords(text, target) {
  const sents = splitSentences(text);
  const out = [];
  let n = 0;
  for (const s of sents) {
    if (out.length && n + wordCount(s) > target * 1.25) break;
    out.push(s);
    n += wordCount(s);
  }
  return out.join(' ');
}

function cleanSentence(s) {
  const t = (s || '').trim();
  if (!t) return '';
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

function localGenerate(inputs = {}, { tone = 'Cinematic', seed = Date.now() } = {}) {
  const r = rng(seed);
  const bank = T[inputs.theme] || T['Trading psychology'];
  const total = Math.max(40, Math.round((Number(inputs.duration) || 45) * 2.6));
  const target = (sec) => Math.round(total * SECTION_WEIGHT[sec]);

  let hook = pick(bank.hook, r);
  let problem = pick(bank.problem, r);
  if (inputs.audience && /beginner|new/i.test(inputs.audience) && r() > 0.5) problem += ' If you are new to this, you have probably felt it already.';

  let story = fitToWords(pick(STORY, r), target('story'));
  if (wordCount(story) < target('story') * 0.7) story += ' ' + pick(EXPANSIONS.story, r);

  let realization = pick(bank.realization, r);
  if (inputs.lesson) realization = `${cleanSentence(inputs.lesson)} ${fitToWords(realization, Math.max(12, target('realization') - wordCount(inputs.lesson)))}`;
  if (inputs.message) realization += ` ${cleanSentence(inputs.message)}`;

  let conclusion = pick(CONCLUSION, r);
  if (inputs.ending) conclusion = `${fitToWords(conclusion, Math.max(8, target('conclusion') - wordCount(inputs.ending)))} ${cleanSentence(inputs.ending)}`;

  const toneLine = TONE_LINES[tone];
  if (toneLine && tone !== 'Cinematic' && r() > 0.4) hook = `${toneLine.hook} ${hook}`;

  if (inputs.keywords) {
    const kw = inputs.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    if (kw.length) story += ` ${kw.slice(0, 2).map((k) => k[0].toUpperCase() + k.slice(1)).join('. ')}. Those words stopped being slogans and became rules.`;
  }

  return {
    hook: fitToWords(hook, target('hook') + 8),
    problem: fitToWords(problem, target('problem') + 6),
    story,
    realization,
    conclusion,
  };
}

function localExpand(sections, seed) {
  const r = rng(seed);
  const out = { ...sections };
  for (const s of SECTIONS) if (out[s]) out[s] = `${out[s].trim()} ${pick(EXPANSIONS[s], r)}`;
  return out;
}

function localShorten(sections) {
  const out = {};
  for (const s of SECTIONS) {
    const sents = splitSentences(sections[s] || '');
    const keep = Math.max(1, Math.ceil(sents.length * 0.6));
    out[s] = sents.slice(0, keep).join(' ');
  }
  return out;
}

function localTone(sections, tone) {
  const line = TONE_LINES[tone] || TONE_LINES.Cinematic;
  const strip = (txt, lines) => lines.reduce((t, l) => t.replace(l, '').trim(), txt || '');
  const allHooks = Object.values(TONE_LINES).map((l) => l.hook);
  const allEnds = Object.values(TONE_LINES).map((l) => l.end);
  return {
    ...sections,
    hook: `${line.hook} ${strip(sections.hook, allHooks)}`.trim(),
    conclusion: `${strip(sections.conclusion, allEnds)} ${line.end}`.trim(),
  };
}

function localRewrite(text) {
  // Rephrases by recombining: shift the strongest sentence to the front and tighten filler.
  const sents = splitSentences(text);
  if (sents.length < 2) return text.replace(/\b(really|very|just|actually)\s+/gi, '').trim();
  const longest = sents.reduce((a, b) => (wordCount(b) > wordCount(a) ? b : a));
  return [longest, ...sents.filter((s) => s !== longest)].join(' ').replace(/\b(really|very|actually)\s+/gi, '');
}

// ------------------------------------------------------------------
// Claude engine
// ------------------------------------------------------------------
export const SYSTEM = `You write short-form scripts for a YouTube channel that publishes motivational trading videos narrated over an animated silhouette character.
Voice: a professional documentary narrator who understands trading psychology. Natural, cinematic, emotionally honest, concrete.
Avoid generic motivational clichés ("grind", "hustle", "never give up", "believe in yourself", "to the moon", "rise and grind"). Prefer specific trading details: stop losses, position sizing, journals, drawdowns, the 3 AM chart, the trade not taken.
No financial advice, no promises of returns, no specific tickers unless the user asks.
Scripts are spoken aloud: short sentences, rhythm, no headings, no emojis, no stage directions inside the narration.
Each script has exactly five parts: hook (capture attention in the first 3 seconds), problem (a relatable trading struggle), story (develop the message through storytelling), realization (the lesson), conclusion (a powerful closing line).`;

export const SECTIONS_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(SECTIONS.map((s) => [s, { type: 'string' }])),
  required: SECTIONS,
  additionalProperties: false,
};
export const TEXT_SCHEMA = { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false };

function describeInputs(i = {}) {
  return [
    `Topic: ${i.topic || '(none)'}`,
    `Main message: ${i.message || '(none)'}`,
    `Theme: ${i.theme}`,
    `Target audience: ${i.audience}`,
    `Desired spoken duration: ${i.duration} seconds (about ${Math.round((i.duration || 45) * 2.6)} words total)`,
    `Emotional direction: ${i.emotion}`,
    `Storytelling style: ${i.storyStyle}`,
    `Main lesson: ${i.lesson || '(writer decides)'}`,
    `Ending message: ${i.ending || '(writer decides)'}`,
    `Optional keywords: ${i.keywords || '(none)'}`,
  ].join('\n');
}

export function claudePrompt(op, { inputs, sections, tone, text, instruction, section }) {
  const current = sections ? `Current script (JSON):\n${JSON.stringify(sections, null, 2)}` : '';
  const ctx = `Brief:\n${describeInputs(inputs)}\nTone: ${tone}`;
  switch (op) {
    case 'generate':
    case 'variant':
      return `${ctx}\n\nWrite a ${op === 'variant' ? 'completely different new version of the' : ''} script. Return the five parts as JSON.${op === 'variant' && current ? `\nDo not reuse lines from this previous version:\n${current}` : ''}`;
    case 'expand':
      return `${ctx}\n\n${current}\n\nExpand the script by about 30% while keeping its voice. Add depth to story and realization. Return all five parts.`;
    case 'shorten':
      return `${ctx}\n\n${current}\n\nShorten the script by about 35%. Keep the strongest lines and the hook's punch. Return all five parts.`;
    case 'tone':
      return `${ctx}\n\n${current}\n\nRewrite the whole script in a ${tone} tone, keeping structure and meaning. Return all five parts.`;
    case 'section':
      return `${ctx}\n\n${current}\n\nRewrite only the "${section}" part with a fresh, stronger version that fits the rest. Return all five parts with the others unchanged.`;
    case 'rewrite':
      return `${ctx}\n\n${current}\n\nRewrite this passage from the script. ${instruction ? `Instruction: ${instruction}` : 'Make it sharper and more cinematic.'}\nPassage:\n"""${text}"""\nReturn JSON {"text": "..."} with only the rewritten passage.`;
    default:
      throw new Error(`Unknown operation ${op}`);
  }
}


export function runLocalOp({ op, inputs = {}, sections = {}, tone = 'Cinematic', text = '', section = 'hook' }) {
  const seed = Date.now();
  switch (op) {
    case 'generate':
    case 'variant':
      return { sections: localGenerate(inputs, { tone, seed }) };
    case 'expand':
      return { sections: localExpand(sections, seed) };
    case 'shorten':
      return { sections: localShorten(sections) };
    case 'tone':
      return { sections: localTone(sections, tone) };
    case 'section': {
      const fresh = localGenerate(inputs, { tone, seed });
      return { sections: { ...sections, [section]: fresh[section] } };
    }
    case 'rewrite':
      return { text: localRewrite(text) };
    default:
      throw Object.assign(new Error(`Unknown operation ${op}`), { status: 400 });
  }
}

export { localGenerate };
