// Global client state. All persistent data lives on the server (data/db.json);
// this store mirrors it and autosaves edits with a debounce.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { applyTheme, applyChartTheme } from './theme.js';
import { DEFAULT_THEME, DEFAULT_CHART_THEME } from '../../shared/defaults.js';

const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

let toastSeq = 0;

export function StoreProvider({ children }) {
  const [state, setState] = useState({ loading: true, error: null, settings: null, projects: [], characters: [], assets: [], presets: [], activity: [], integrations: {} });
  const [saveState, setSaveState] = useState({}); // key "col:id" -> 'pending' | 'saving' | 'saved' | 'error'
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  // In-page replacements for window.confirm / window.prompt (blocked inside claude.ai artifacts).
  const ask = useCallback((opts) => new Promise((resolve) => setDialog({ kind: 'confirm', ...opts, resolve })), []);
  const askText = useCallback((opts) => new Promise((resolve) => setDialog({ kind: 'prompt', ...opts, resolve })), []);
  const closeDialog = useCallback((value) => { setDialog((d) => { d?.resolve(value); return null; }); }, []);
  const timers = useRef({});
  const pending = useRef({});
  const stateRef = useRef(state);
  stateRef.current = state;

  const toast = useCallback((text, tone = 'info', ms = 3500) => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.get('/api/bootstrap');
      setState({ loading: false, error: null, ...data });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { applyTheme(state.settings?.theme || DEFAULT_THEME); applyChartTheme({ ...DEFAULT_CHART_THEME, ...(state.settings?.theme?.chart || {}) }); }, [state.settings?.theme]);

  const refreshActivity = useCallback(async () => {
    try {
      const data = await api.get('/api/bootstrap');
      setState((s) => ({ ...s, activity: data.activity, integrations: data.integrations, assets: data.assets }));
    } catch { /* non-critical */ }
  }, []);

  // ---------- Generic document editing with autosave ----------
  const flushDoc = useCallback(async (col, id) => {
    const key = `${col}:${id}`;
    clearTimeout(timers.current[key]);
    const patch = pending.current[key];
    if (!patch) return;
    delete pending.current[key];
    setSaveState((s) => ({ ...s, [key]: 'saving' }));
    try {
      await api.put(`/api/${col}/${id}`, patch);
      setSaveState((s) => ({ ...s, [key]: pending.current[key] ? 'pending' : 'saved' }));
    } catch (err) {
      pending.current[key] = { ...patch, ...(pending.current[key] || {}) };
      setSaveState((s) => ({ ...s, [key]: 'error' }));
      toast(`Autosave failed: ${err.message}`, 'bad');
    }
  }, [toast]);

  const editDoc = useCallback((col, id, patchOrFn, { immediate = false } = {}) => {
    const current = stateRef.current[col].find((d) => d.id === id);
    if (!current) return;
    const patch = typeof patchOrFn === 'function' ? patchOrFn(current) : patchOrFn;
    const updatedAt = new Date().toISOString();
    setState((s) => ({ ...s, [col]: s[col].map((d) => (d.id === id ? { ...d, ...patch, updatedAt } : d)) }));
    const key = `${col}:${id}`;
    pending.current[key] = { ...(pending.current[key] || {}), ...patch };
    setSaveState((s) => ({ ...s, [key]: 'pending' }));
    clearTimeout(timers.current[key]);
    const autosave = stateRef.current.settings?.storage?.autosave !== false;
    if (immediate) flushDoc(col, id);
    else if (autosave) timers.current[key] = setTimeout(() => flushDoc(col, id), stateRef.current.settings?.storage?.autosaveDelay || 1200);
  }, [flushDoc]);

  // Save everything pending before the tab closes.
  useEffect(() => {
    const onUnload = (e) => {
      if (!Object.keys(pending.current).length) return;
      // Unsaved edits: flush them and ask the browser to confirm leaving.
      Object.keys(pending.current).forEach((k) => {
        const [col, id] = k.split(':');
        flushDoc(col, id);
      });
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [flushDoc]);

  const createDoc = useCallback(async (col, doc) => {
    const created = await api.post(`/api/${col}`, doc);
    setState((s) => ({ ...s, [col]: [created, ...s[col]] }));
    refreshActivity();
    return created;
  }, [refreshActivity]);

  const deleteDoc = useCallback(async (col, id, query = '') => {
    await api.del(`/api/${col}/${id}${query}`);
    setState((s) => ({ ...s, [col]: s[col].filter((d) => d.id !== id) }));
    refreshActivity();
  }, [refreshActivity]);

  const duplicateDoc = useCallback(async (col, id) => {
    const copy = await api.post(`/api/${col}/${id}/duplicate`);
    setState((s) => ({ ...s, [col]: [copy, ...s[col]] }));
    refreshActivity();
    return copy;
  }, [refreshActivity]);

  const replaceDoc = useCallback((col, doc) => {
    setState((s) => ({ ...s, [col]: s[col].map((d) => (d.id === doc.id ? doc : d)) }));
  }, []);

  const logActivity = useCallback(async (col, id, text) => {
    await flushDoc(col, id);
    try { await api.put(`/api/${col}/${id}`, { _activity: text }); } catch { /* ignore */ }
    refreshActivity();
  }, [flushDoc, refreshActivity]);

  // ---------- Settings ----------
  const settingsTimer = useRef(null);
  const updateSettings = useCallback((patch) => {
    setState((s) => ({ ...s, settings: deepMerge(s.settings, patch) }));
    clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(async () => {
      try {
        await api.put('/api/settings', stateRef.current.settings);
      } catch (err) {
        toast(`Could not save settings: ${err.message}`, 'bad');
      }
    }, 500);
  }, [toast]);

  const uploadAsset = useCallback(async (file, tags) => {
    const asset = await api.upload(file, tags);
    setState((s) => ({ ...s, assets: [asset, ...s.assets] }));
    refreshActivity();
    return asset;
  }, [refreshActivity]);

  const setIntegrations = useCallback((integrations) => setState((s) => ({ ...s, integrations })), []);
  const addAssetLocal = useCallback((asset) => setState((s) => ({ ...s, assets: [asset, ...s.assets.filter((a) => a.id !== asset.id)] })), []);

  const value = useMemo(() => ({
    ...state, saveState, toasts, toast, dialog, ask, askText, closeDialog, reload: load, refreshActivity,
    editDoc, flushDoc, createDoc, deleteDoc, duplicateDoc, replaceDoc, logActivity,
    updateSettings, uploadAsset, setIntegrations, addAssetLocal,
  }), [state, saveState, toasts, toast, dialog, ask, askText, closeDialog, load, refreshActivity, editDoc, flushDoc, createDoc, deleteDoc, duplicateDoc, replaceDoc, logActivity, updateSettings, uploadAsset, setIntegrations, addAssetLocal]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

function deepMerge(a, b) {
  if (Array.isArray(b) || typeof b !== 'object' || b === null) return b;
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(out[k], v) : v;
  return out;
}

// Convenience hook for a single project with an updater.
export function useProject(id) {
  const { projects, editDoc, saveState, flushDoc } = useStore();
  const project = projects.find((p) => p.id === id) || null;
  const update = useCallback((patchOrFn, opts) => editDoc('projects', id, patchOrFn, opts), [editDoc, id]);
  const save = useCallback(() => flushDoc('projects', id), [flushDoc, id]);
  return { project, update, save, saving: saveState[`projects:${id}`] };
}
