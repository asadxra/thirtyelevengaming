import React, { useMemo, useState } from 'react';
import { navigate } from '../lib/router.js';
import { Button, Panel, Badge, Empty, IconButton, Input, Confirm } from './ui.jsx';
import { Icon } from './Icon.jsx';
import CandleChart from './CandleChart.jsx';
import { exampleBars, sourceLabel } from '../../shared/examples.js';
import { formatBarTime } from '../../shared/market.js';

function ExampleChart({ ex }) {
  const bars = useMemo(() => exampleBars(ex), [ex]);
  if (ex.kind !== 'historical') return <img src={ex.imageUrl} alt={ex.summary} className="example-shot" />;
  return <CandleChart bars={bars} focus={ex.range} annotations={ex.annotations} width={620} height={300} compact showVolume={false} overlays={ex.overlays || []} />;
}

export default function ExamplesPanel({ project, update }) {
  const [remove, setRemove] = useState(null);
  const list = project.examples || [];
  const setEx = (id, patch) => update((p) => ({ examples: p.examples.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const move = (i, d) => update((p) => { const a = [...p.examples]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); return { examples: a }; });

  return (
    <Panel title="Chart examples used in this video" subtitle="Each example is a saved snapshot of real bars, with its source. The script and scenes use them in this order."
      actions={<Button variant="primary" icon="search" onClick={() => navigate(`/research?concept=${project.conceptId || 'fvg'}&project=${project.id}`)}>Find more examples</Button>}>
      {!list.length ? (
        <Empty icon="chart" title="No chart examples yet">Use Chart Research to find where this concept actually happened in real market data, then approve the best examples.</Empty>
      ) : (
        <div className="col gap">
          {list.map((ex, i) => (
            <article key={ex.id} className={`example-row ${ex.approved === false ? 'off' : ''}`}>
              <div className="example-row-chart"><ExampleChart ex={ex} /></div>
              <div className="col gap-s grow">
                <div className="row gap-xs wrap">
                  <Badge tone="accent">Example {i + 1}</Badge>
                  <Badge tone={ex.kind === 'historical' ? 'ok' : ex.kind === 'illustration' ? 'warn' : 'muted'}>{ex.kind === 'historical' ? 'Real historical data' : ex.kind === 'illustration' ? 'Illustration' : 'Screenshot'}</Badge>
                  {ex.direction && <Badge tone={ex.direction === 'bullish' ? 'ok' : 'bad'}>{ex.direction}</Badge>}
                  {ex.approved === false && <Badge tone="muted">Not used</Badge>}
                </div>
                <b>{ex.summary}</b>
                <dl className="details small">
                  <dt>Instrument</dt><dd>{ex.symbol || '—'} {ex.interval}</dd>
                  <dt>Key candle</dt><dd>{ex.keyTime ? formatBarTime(ex.keyTime) : '—'}</dd>
                  <dt>Session</dt><dd>{ex.session || '—'}</dd>
                  <dt>Source</dt><dd>{sourceLabel(ex)}{ex.source?.fetchedAt ? ` · fetched ${ex.source.fetchedAt}` : ''}{ex.source?.resampledFrom ? ` · aggregated from ${ex.source.resampledFrom}` : ''}</dd>
                  {ex.steps?.length > 0 && <><dt>Teaching steps</dt><dd>{ex.steps.map((s) => s.label).join(' → ')}</dd></>}
                </dl>
                <Input placeholder="Your note on this example (used by the writer for screenshots)" value={ex.note || ''} onChange={(e) => setEx(ex.id, { note: e.target.value })} />
                <div className="row gap-s">
                  <Button size="sm" icon={ex.approved === false ? 'check' : 'x'} onClick={() => setEx(ex.id, { approved: ex.approved === false })}>{ex.approved === false ? 'Use in video' : 'Don’t use'}</Button>
                  <IconButton icon="up" title="Move up" disabled={i === 0} onClick={() => move(i, -1)} />
                  <IconButton icon="down" title="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)} />
                  <IconButton icon="trash" title="Remove from project" onClick={() => setRemove(ex)} />
                </div>
              </div>
            </article>
          ))}
          <p className="small muted"><Icon name="alert" size={12} /> After changing examples, regenerate the script and rebuild scenes so narration and chart stay in sync.</p>
        </div>
      )}
      <Confirm open={!!remove} danger title="Remove example" confirmLabel="Remove" onClose={() => setRemove(null)}
        message="Remove this example from the project? Scenes using it will lose their chart."
        onConfirm={() => { update((p) => ({ examples: p.examples.filter((e) => e.id !== remove.id), scenes: (p.scenes || []).map((s) => (s.chart?.exampleId === remove.id ? { ...s, chart: null } : s)) })); setRemove(null); }} />
    </Panel>
  );
}
