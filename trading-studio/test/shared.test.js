import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScenes, retime, captionsFromScenes, parseTime, fmtTime, splitSentences, hashText } from '../shared/scenes.js';
import { localGenerate, runLocalOp } from '../shared/writer.js';
import { SECTIONS } from '../shared/defaults.js';

test('splitSentences keeps punctuation', () => {
  assert.deepEqual(splitSentences('One. Two! Three?'), ['One.', 'Two!', 'Three?']);
});

test('time parsing round-trips', () => {
  assert.equal(parseTime('01:05.5'), 65.5);
  assert.equal(parseTime('12.5'), 12.5);
  assert.equal(fmtTime(65.5), '01:05.5');
});

test('local writer produces all five sections', () => {
  const s = localGenerate({ theme: 'Patience', duration: 45 }, { seed: 1 });
  for (const k of SECTIONS) assert.ok(s[k].length > 10, k);
});

test('scenes are sequential and captions stay inside scenes', () => {
  const sections = localGenerate({ theme: 'Risk management', duration: 60 }, { seed: 2 });
  const scenes = buildScenes(sections);
  assert.ok(scenes.length >= 5);
  scenes.forEach((s, i) => { if (i) assert.ok(Math.abs(s.start - scenes[i - 1].end) < 0.05); });
  const caps = captionsFromScenes(scenes, 'word');
  for (const c of caps) {
    const sc = scenes.find((s) => s.id === c.sceneId);
    assert.ok(c.start >= sc.start - 0.01 && c.end <= sc.end + 0.01);
  }
  const moved = retime([scenes[2], scenes[0], scenes[1]]);
  assert.equal(moved[0].start, 0);
});

test('hash changes with text (voice staleness)', () => {
  assert.notEqual(hashText('a'), hashText('b'));
});

test('local script ops', async () => {
  const sections = localGenerate({ theme: 'Consistency', duration: 45 }, { seed: 3 });
  const shorter = runLocalOp({ op: 'shorten', sections });
  assert.ok(shorter.sections.story.length <= sections.story.length);
  const hook = runLocalOp({ op: 'section', section: 'hook', inputs: { theme: 'Consistency', duration: 45 }, sections });
  assert.equal(hook.sections.story, sections.story);
});
