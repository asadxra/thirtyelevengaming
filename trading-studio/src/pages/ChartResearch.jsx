import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { navigate, useRoute } from '../lib/router.js';
import { api, STANDALONE } from '../lib/api.js';
import { createProject } from '../lib/actions.js';
import { Button, Panel, Select, Input, Badge, Empty, Spinner, IconButton, Modal, Toggle } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import CandleChart from '../components/CandleChart.jsx';
import { CONCEPTS, CATEGORIES, conceptById } from '../../shared/concepts.js';
import { TIMEFRAMES, INSTRUMENTS, toBars, tfSec, formatBarTime, SESSIONS, sessionOf } from '../../shared/market.js';
import { detect } from '../../shared/detectors.js';
import { snapshotExample, sourceLabel } from '../../shared/examples.js';
import { fetchTradingView, datasetFromCsv, barsForTimeframe, tradingViewAvailable } from '../lib/marketSource.js';

const TV_COUNTS = [{ value: 500, label: '500 bars' }, { value: 1500, label: '1,500 bars' }, { value: 3000, label: '3,000 bars' }];

export default function ChartResearch() {
  const store = useStore();
  const { query } = useRoute();
  const custom = store.settings?.customConcepts || [];
  const allConcepts = [...CONCEPTS, ...custom];
  const [conceptId, setConceptId] = useState(query.get('concept') || 'fvg');
  const [projectId, setProjectId] = useState(query.get('project') || '');
  const project = store.projects.find((p) => p.id === projectId);
  const concept = conceptById(conceptId, custom);
  const [symbol, setSymbol] = useState(project?.market?.symbol || 'CME_MINI:NQ1!');
  const [timeframe, setTimeframe] = useState(project?.market?.timeframe || concept?.timeframes?.[1] || '5m');
  const [count, setCount] = useState(1500);
  const [dateTo, setDateTo] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [shotOpen, setShotOpen] = useState(false);
  const tvOn = tradingViewAvailable(store.integrations);

  useEffect(() => { if (project?.conceptId) setConceptId(project.conceptId); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load a stored dataset in full.
  useEffect(() => {
    if (!datasetId) return;
    let alive = true;
    setLoading('Loading dataset…');
    setError(null);
    api.get(`/api/datasets/${datasetId}`).then((d) => { if (alive) { setDataset(d); setSymbol(d.symbol); if (tfSec(timeframe) < tfSec(d.interval)) setTimeframe(d.interval); } })
      .catch((e) => alive && setError(e.message)).finally(() => alive && setLoading(null));
    return () => { alive = false; };
  }, [datasetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default to the most recent dataset.
  useEffect(() => { if (!datasetId && store.datasets?.length) setDatasetId(store.datasets[0].id); }, [store.datasets]); // eslint-disable-line react-hooks/exhaustive-deps

  const bars = useMemo(() => (dataset ? barsForTimeframe(toBars(dataset), dataset.interval, timeframe) : []), [dataset, timeframe]);
  const examples = useMemo(() => (concept?.detector && bars.length ? detect(concept.detector, bars) : []), [concept, bars]);
  const lowerTf = dataset && tfSec(timeframe) < tfSec(dataset.interval);

  const fetchTv = async () => {
    setLoading(`Fetching ${symbol} ${timeframe} from TradingView…`);
    setError(null);
    try {
      const ds = await fetchTradingView({ symbol, timeframe, count, dateTo: dateTo || undefined });
      const saved = await store.createDoc('datasets', ds);
      setDatasetId(saved.id);
      store.toast(`Loaded ${ds.t.length.toLocaleString()} real bars from TradingView`, 'ok');
    } catch (e) { setError(e.message); } finally { setLoading(null); }
  };

  const addToProject = async (ex) => {
    let pid = projectId;
    try {
      if (!pid) {
        const p = await createProject(store, { title: `${concept.name} — ${INSTRUMENTS.find((i) => i.id === dataset.symbol)?.short || dataset.symbol}`, conceptId, market: { symbol: dataset.symbol, timeframe } }, { open: false });
        pid = p.id;
        setProjectId(pid);
      }
      const snap = snapshotExample(bars, ex, {
        conceptId, symbol: dataset.symbol, interval: timeframe,
        source: { ...dataset.source, datasetId: dataset.id, resampledFrom: timeframe !== dataset.interval ? dataset.interval : dataset.source?.resampledFrom || null },
      });
      store.editDoc('projects', pid, (p) => ({ examples: [...(p.examples || []), snap], conceptId: p.conceptId || conceptId, market: { symbol: dataset.symbol, timeframe } }), { immediate: true });
      store.toast('Example added to the project', 'ok');
    } catch (e) { store.toast(e.message, 'bad'); }
  };

  const added = new Set((project?.examples || []).map((e) => `${e.symbol}|${e.keyTime}|${e.detector}`));
  const isAdded = (ex) => added.has(`${dataset?.symbol}|${bars[ex.keyIndex]?.t}|${ex.concept}`);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Chart Research</p>
          <h1>Find real chart examples</h1>
          <p className="muted">Pick a concept and market, load real historical bars, and review every place the concept actually occurred. Nothing here is drawn or simulated.</p>
        </div>
        <div className="row gap-s wrap">
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} options={[{ value: '', label: 'Add examples to: a new project' }, ...store.projects.filter((p) => !p.archived).map((p) => ({ value: p.id, label: `Add to: ${p.title}` }))]} />
          {project && <Button icon="film" onClick={() => navigate(`/projects/${project.id}/examples`)}>Open project ({project.examples?.length || 0} examples)</Button>}
        </div>
      </header>

      <div className="research-layout">
        <div className="col gap">
          <Panel title="1 · Concept">
            <Select value={conceptId} onChange={(e) => setConceptId(e.target.value)} options={CATEGORIES.flatMap((cat) => allConcepts.filter((c) => (c.category || 'Custom') === cat).map((c) => ({ value: c.id, label: `${cat === 'ICT Concepts' ? 'ICT' : cat === 'Custom' ? 'Custom' : 'TA'} · ${c.name}` })))} />
            {concept && <p className="small muted"><b>Needs:</b> {concept.conditions}</p>}
            {concept && !concept.detector && <div className="notice warn small"><Icon name="alert" size={14} /> This custom concept has no automatic detector. Use screenshots or browse the chart and add notes manually.</div>}
          </Panel>

          <Panel title="2 · Market & timeframe">
            <Select label="Instrument" value={symbol} onChange={(e) => setSymbol(e.target.value)} options={[...INSTRUMENTS.map((i) => ({ value: i.id, label: i.label })), ...(INSTRUMENTS.some((i) => i.id === symbol) ? [] : [{ value: symbol, label: symbol }])]} />
            <Input label="Or any TradingView symbol" placeholder="EXCHANGE:TICKER, e.g. NASDAQ:AAPL" value={INSTRUMENTS.some((i) => i.id === symbol) ? '' : symbol} onChange={(e) => e.target.value && setSymbol(e.target.value.toUpperCase())} />
            <div className="tf-row">
              {TIMEFRAMES.map((t) => <button key={t.id} className={`chip ${timeframe === t.id ? 'on' : ''}`} onClick={() => setTimeframe(t.id)}>{t.label}</button>)}
            </div>
          </Panel>

          <Panel title="3 · Real data source">
            <div className="source-box">
              <div className="row between"><b>TradingView</b>{tvOn ? <Badge tone="ok" dot>Connector available</Badge> : <Badge tone="muted" dot>{STANDALONE ? 'Not connected' : 'Web version only'}</Badge>}</div>
              {tvOn ? (
                <>
                  <div className="grid-2">
                    <Select label="History" value={count} onChange={(e) => setCount(Number(e.target.value))} options={TV_COUNTS} />
                    <Input label="End date (optional)" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                  <Button variant="primary" icon="download" loading={!!loading} onClick={fetchTv}>Fetch {symbol.split(':').pop()} {timeframe} from TradingView</Button>
                  <p className="small muted">Uses your own TradingView connector and plan. Intraday history depth depends on your data feed.</p>
                </>
              ) : (
                <p className="small muted">{STANDALONE ? 'Connect your TradingView connector in claude.ai (Settings → Connectors) and allow it for this page.' : 'The TradingView connector works in the claude.ai web version of this studio. Here, import a TradingView chart export instead.'}</p>
              )}
            </div>
            <div className="row gap-s wrap">
              <Button icon="upload" onClick={() => setCsvOpen(true)}>Import chart export (CSV)</Button>
              <Button icon="image" onClick={() => setShotOpen(true)}>Add a screenshot</Button>
            </div>
            <Select label="Loaded datasets" value={datasetId} onChange={(e) => setDatasetId(e.target.value)}
              options={[{ value: '', label: store.datasets?.length ? 'Choose a dataset…' : 'No datasets yet' }, ...(store.datasets || []).map((d) => ({ value: d.id, label: `${d.name || d.symbol} (${(d.bars || 0).toLocaleString()} bars)` }))]} />
            {dataset && <p className="small muted"><Icon name="check" size={12} /> {dataset.source?.provider} · fetched {dataset.source?.fetchedAt} · {toBars(dataset).length.toLocaleString()} bars {formatBarTime(dataset.t[0])} → {formatBarTime(dataset.t[dataset.t.length - 1])}</p>}
          </Panel>
        </div>

        <div className="col gap">
          {loading && <Panel><Spinner label={loading} /></Panel>}
          {error && <div className="notice warn"><Icon name="alert" size={14} /> {error}</div>}
          {lowerTf && <div className="notice warn"><Icon name="alert" size={14} /> This dataset is {dataset.interval}. Lower timeframes can’t be created from it. Fetch or import {timeframe} data instead.</div>}
          {!dataset && !loading ? (
            <Panel><Empty icon="chart" title="No market data loaded">Fetch bars from TradingView or import a chart export to start researching.</Empty></Panel>
          ) : dataset && !lowerTf && (
            <Panel title={`4 · ${examples.length} ${concept?.short || ''} example${examples.length === 1 ? '' : 's'} found`} subtitle={`${dataset.symbol} · ${timeframe}${timeframe !== dataset.interval ? ` (aggregated from ${dataset.interval})` : ''} · ${sourceLabel({ kind: 'historical', symbol: dataset.symbol, interval: timeframe, source: dataset.source })}`}>
              {!examples.length ? (
                <Empty icon="search" title={`No ${concept?.short || 'concept'} found in this data`}>The detector didn’t find a clean occurrence here. Try another timeframe, instrument or date range. Nothing will be faked to fill the gap.</Empty>
              ) : (
                <div className="example-grid">
                  {examples.map((ex) => (
                    <article key={`${ex.concept}-${ex.keyIndex}-${ex.rank}`} className="example-card">
                      <div className="example-chart" onClick={() => setPreview(ex)}>
                        <CandleChart bars={bars} focus={ex.range} annotations={ex.annotations} width={520} height={260} compact showVolume={false} overlays={ex.overlays || []} />
                      </div>
                      <div className="example-body">
                        <div className="row gap-xs wrap">
                          <Badge tone={ex.direction === 'bullish' ? 'ok' : 'bad'}>{ex.direction}</Badge>
                          <Badge tone="accent">#{ex.rank}</Badge>
                          <Badge tone="muted">{SESSIONS.find((s) => s.id === sessionOf(bars[ex.keyIndex].t))?.label || 'Off-session'}</Badge>
                        </div>
                        <p className="small">{ex.summary}</p>
                        <div className="row gap-s">
                          <Button size="sm" icon="eye" onClick={() => setPreview(ex)}>Review</Button>
                          {isAdded(ex) ? <Badge tone="ok"><Icon name="check" size={11} /> In project</Badge> : <Button size="sm" variant="primary" icon="plus" onClick={() => addToProject(ex)}>Approve for video</Button>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <p className="small muted">Examples are found by rule-based detection on the real bars. Review each one before approving it; the detector can be wrong.</p>
            </Panel>
          )}
        </div>
      </div>

      {preview && dataset && <ExampleReview ex={preview} bars={bars} dataset={dataset} timeframe={timeframe} onClose={() => setPreview(null)} onAdd={() => { addToProject(preview); setPreview(null); }} added={isAdded(preview)} />}
      <CsvImport open={csvOpen} onClose={() => setCsvOpen(false)} defaultSymbol={symbol} onDone={(id) => { setCsvOpen(false); setDatasetId(id); }} />
      <ScreenshotAdd open={shotOpen} onClose={() => setShotOpen(false)} projectId={projectId} conceptId={conceptId} onProject={setProjectId} />
    </div>
  );
}

function ExampleReview({ ex, bars, dataset, timeframe, onClose, onAdd, added }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [focus, setFocus] = useState(ex.range);
  const [replay, setReplay] = useState(null);
  const [sessions, setSessions] = useState(true);
  const steps = ex.steps;
  const step = steps[stepIdx];
  const visible = useMemo(() => {
    const s = new Set();
    steps.slice(0, stepIdx + 1).forEach((st) => (st.reveal.includes('*') ? ex.annotations.map((a) => a.id) : st.reveal).forEach((id) => s.add(id)));
    return s;
  }, [stepIdx, steps, ex]);
  useEffect(() => { if (step) setFocus(step.focus); }, [stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open title={`Review example #${ex.rank}`} onClose={onClose} width={1100}
      footer={<>
        <span className="small muted grow">{sourceLabel({ kind: 'historical', symbol: dataset.symbol, interval: timeframe, source: dataset.source })}</span>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        {added ? <Badge tone="ok">Already in project</Badge> : <Button variant="primary" icon="check" onClick={onAdd}>Approve for video</Button>}
      </>}>
      <div className="review-layout">
        <div className="col gap-s">
          <div className="review-chart">
            <CandleChart bars={bars} focus={focus} annotations={ex.annotations} visible={visible} interactive onFocusChange={setFocus} replayTo={replay} showSessions={sessions} overlays={ex.overlays || []} sourceLabel={`${dataset.symbol} · ${timeframe} · real data`} />
          </div>
          <div className="row gap-s wrap">
            <IconButton icon="refresh" title="Reset view" onClick={() => setFocus(ex.range)} />
            <span className="small muted">Scroll to zoom · drag to pan</span>
            <Toggle label="Sessions" checked={sessions} onChange={setSessions} />
            <span className="grow" />
            <span className="small muted">Replay</span>
            <input type="range" min={Math.floor(ex.range[0])} max={bars.length - 1} value={replay ?? bars.length - 1} onChange={(e) => { const v = Number(e.target.value); setReplay(v >= bars.length - 1 ? null : v); }} style={{ width: 220 }} />
            {replay != null && <span className="mono small">{formatBarTime(bars[replay].t)}</span>}
          </div>
        </div>
        <div className="col gap-s">
          <p className="small"><b>{ex.summary}</b></p>
          <ol className="step-list">
            {steps.map((s, k) => (
              <li key={s.id} className={k === stepIdx ? 'on' : k < stepIdx ? 'done' : ''} onClick={() => setStepIdx(k)}>
                <b>{s.label}</b>
                <span className="small">{s.text}</span>
              </li>
            ))}
          </ol>
          <div className="row gap-s">
            <Button size="sm" icon="left" disabled={stepIdx === 0} onClick={() => setStepIdx((k) => k - 1)}>Previous</Button>
            <Button size="sm" icon="right" disabled={stepIdx === steps.length - 1} onClick={() => setStepIdx((k) => k + 1)}>Next step</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CsvImport({ open, onClose, defaultSymbol, onDone }) {
  const store = useStore();
  const [file, setFile] = useState(null);
  const [sym, setSym] = useState(defaultSymbol);
  const [provider, setProvider] = useState('TradingView chart export');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  return (
    <Modal open={open} title="Import a chart export (CSV)" onClose={onClose} width={560}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!file} onClick={async () => {
        setBusy(true); setErr(null);
        try {
          const ds = await datasetFromCsv(file, { symbol: sym, provider });
          const saved = await store.createDoc('datasets', ds);
          store.toast(`Imported ${ds.t.length.toLocaleString()} bars`, 'ok');
          onDone(saved.id);
        } catch (e) { setErr(e.message); } finally { setBusy(false); }
      }}>Import</Button></>}>
      <div className="col gap">
        <p className="small muted">In TradingView: chart menu → <b>Export chart data…</b> (paid plans). Any CSV with time, open, high, low, close (and volume) columns works.</p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Input label="Symbol" value={sym} onChange={(e) => setSym(e.target.value)} />
        <Input label="Data source (shown on the video)" value={provider} onChange={(e) => setProvider(e.target.value)} />
        {err && <p className="small bad-text">{err}</p>}
      </div>
    </Modal>
  );
}

function ScreenshotAdd({ open, onClose, projectId, conceptId, onProject }) {
  const store = useStore();
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState('screenshot');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} title="Add a chart screenshot" onClose={onClose} width={560}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!file || !label.trim()} onClick={async () => {
        setBusy(true);
        try {
          const asset = await store.uploadAsset(file, ['chart', kind]);
          let pid = projectId;
          if (!pid) { const p = await createProject(store, { conceptId, title: `${conceptById(conceptId)?.name || 'Trading'} explainer` }, { open: false }); pid = p.id; onProject(pid); }
          const ex = { id: `ex_${Date.now().toString(36)}`, kind, conceptId, imageUrl: asset.url, symbol: '', interval: '', summary: label, keyLabel: '', session: '', annotations: [], steps: [], range: [0, 0], source: { kind, label: kind === 'illustration' ? `Illustration: ${label}` : label }, approved: true, note, createdAt: new Date().toISOString() };
          store.editDoc('projects', pid, (p) => ({ examples: [...(p.examples || []), ex] }), { immediate: true });
          store.toast('Screenshot added to the project', 'ok');
          onClose();
        } catch (e) { store.toast(e.message, 'bad'); } finally { setBusy(false); }
      }}>Add to project</Button></>}>
      <div className="col gap">
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <Select label="What is it?" value={kind} onChange={(e) => setKind(e.target.value)} options={[{ value: 'screenshot', label: 'Screenshot of a real chart' }, { value: 'illustration', label: 'Illustration (not real market data)' }]} />
        <Input label="Source shown on screen (required)" placeholder="e.g. TradingView, NQ1! 5m, 12 Mar 2025, NY AM" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input label="Narration note (optional)" placeholder="What the viewer should notice" value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="small muted">Only use screenshots you’re allowed to publish. TradingView’s terms allow sharing chart screenshots with attribution.</p>
      </div>
    </Modal>
  );
}
