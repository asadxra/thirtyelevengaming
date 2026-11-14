/*
 * Standalone runtime for the Genshin Instagram dashboard.
 *
 * The page was originally built as a claude.ai dashboard artifact, which gave it
 * two globals: `dash` (datasets, calculations, redraw hooks) and `claude.use()`
 * (a shared database, the viewer's id, and file uploads). This file provides
 * local stand-ins for both so the page runs as a plain static site:
 *   - datasets load from ./data/*
 *   - the database lives in this browser's localStorage, seeded from
 *     ./data/seed-db.json the first time the page opens
 *   - uploaded images are kept in localStorage as data: URLs
 */
(function () {
  'use strict';

  /* ---------- datasets ---------- */
  var DATASETS = {
    characters: { url: 'data/characters.json' },
    character_stories: { url: 'data/character_stories.json' },
    hashtags: { url: 'data/hashtags.json' },
    versions: { url: 'data/versions.json' },
    caption_parts: { url: 'data/caption_parts.json' },
    posts: { url: 'data/posts.csv', format: 'csv' }
  };

  var state = {};      // id -> {status, data, columns, message}
  var calcs = {};      // id -> {inputs, fn, title, description}
  var calcCache = {};  // id -> result for the current data version
  var listeners = [];
  var version = 0;

  function rowsOf(json) {
    if (Array.isArray(json)) return json;
    if (json && typeof json === 'object') {
      for (var k of ['rows', 'data', 'results']) if (Array.isArray(json[k])) return json[k];
    }
    return json;
  }

  function parseCsv(text) {
    if (window.d3 && d3.csvParse) {
      var parsed = d3.csvParse(text);
      return { rows: Array.from(parsed), columns: parsed.columns || [] };
    }
    var lines = text.trim().split(/\r?\n/);
    var cols = (lines.shift() || '').split(',');
    return {
      columns: cols,
      rows: lines.filter(Boolean).map(function (l) {
        var cells = l.split(','), o = {};
        cols.forEach(function (c, i) { o[c] = cells[i] == null ? '' : cells[i]; });
        return o;
      })
    };
  }

  function loadAll() {
    Object.keys(DATASETS).forEach(function (id) {
      state[id] = { status: 'loading', data: [], columns: [] };
    });
    return Promise.all(Object.keys(DATASETS).map(function (id) {
      var ds = DATASETS[id];
      return fetch(ds.url, { cache: 'no-cache' })
        .then(function (r) {
          if (!r.ok) throw new Error(ds.url + ' returned ' + r.status);
          return r.text();
        })
        .then(function (text) {
          if (ds.format === 'csv') {
            var p = parseCsv(text);
            state[id] = { status: 'ok', data: p.rows, columns: p.columns };
          } else {
            var rows = rowsOf(JSON.parse(text));
            var cols = Array.isArray(rows) && rows.length && typeof rows[0] === 'object' ? Object.keys(rows[0]) : [];
            state[id] = { status: 'ok', data: rows, columns: cols };
          }
        })
        .catch(function (e) {
          state[id] = { status: 'error', data: [], columns: [], message: String(e && e.message || e) };
          console.warn('[dashboard] could not load', id, e);
        });
    })).then(function () { version++; calcCache = {}; emit(); });
  }

  function result(s) {
    var data = s.data == null ? [] : s.data;
    return {
      status: s.status, data: data, columns: s.columns || [], message: s.message || '',
      refreshing: false, meta: [],
      // older names some page code still reads
      rows: Array.isArray(data) ? data : [], value: data
    };
  }

  function calcResult(id) {
    if (calcCache[id]) return calcCache[id];
    var c = calcs[id], args = [];
    for (var i = 0; i < c.inputs.length; i++) {
      var inp = data(c.inputs[i]);
      if (inp.status !== 'ok') return result({ status: inp.status, data: [], message: inp.message });
      args.push(inp.data);
    }
    var out;
    try {
      var v = c.fn.apply(null, args);
      var cols = Array.isArray(v) && v.length && typeof v[0] === 'object' ? Object.keys(v[0]) : [];
      out = result({ status: 'ok', data: v, columns: cols });
    } catch (e) {
      console.warn('[dashboard] calculation failed:', id, e);
      out = result({ status: 'error', data: [], message: String(e && e.message || e) });
    }
    calcCache[id] = out;
    return out;
  }

  function data(id) {
    if (calcs[id]) return calcResult(id);
    if (!state[id]) return result({ status: 'missing', data: [] });
    return result(state[id]);
  }

  function emit() {
    listeners.slice().forEach(function (fn) {
      try { fn(); } catch (e) { console.error('[dashboard] redraw failed', e); }
    });
  }

  var resizeTimer, lastWidth = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var w = document.documentElement.clientWidth;
      if (w !== lastWidth) { lastWidth = w; emit(); }
    }, 120);
  });

  window.dash = {
    data: data,
    onData: function (fn) {
      listeners.push(fn);
      try { fn(); } catch (e) { console.error('[dashboard] redraw failed', e); }
    },
    calc: function (id, def) {
      calcs[id] = { inputs: def.inputs || [], fn: def.fn, title: def.title, description: def.description };
      delete calcCache[id];
    },
    loader: function () {},
    refresh: function () { return loadAll(); },
    params: function () { return {}; },
    setParams: function () {},
    resetParams: function () {},
    setLink: function (name) {
      try { history.replaceState(null, '', name ? '#' + encodeURIComponent(name) : location.pathname); } catch (e) {}
    },
    colors: ['#5b6cf0', '#22b8a7', '#f59e42', '#e2589b', '#8b5cf6', '#3fa7f0', '#9bc53d', '#f2c14e']
  };

  /* ---------- local database (stand-in for claude.use('db')) ---------- */
  var DB_KEY = 'gx-db-v1';
  var USER_ID = 'local';
  var docs = null;          // path -> data
  var watchers = [];        // {path, isCollection, cb}
  var dbReady = null;

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function persist() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(docs)); }
    catch (e) { console.warn('[dashboard] could not save to this browser (storage full or blocked); changes last until reload.', e); }
  }

  function openDb() {
    if (dbReady) return dbReady;
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) { saved = null; }
    if (saved && typeof saved === 'object') {
      docs = saved;
      dbReady = Promise.resolve();
    } else {
      dbReady = fetch('data/seed-db.json', { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : {}; })
        .catch(function () { return {}; })
        .then(function (seed) { docs = seed || {}; persist(); });
    }
    return dbReady;
  }

  function parentOf(path) { var i = path.lastIndexOf('/'); return i < 0 ? '' : path.slice(0, i); }
  function leafOf(path) { var i = path.lastIndexOf('/'); return i < 0 ? path : path.slice(i + 1); }

  function snap(path) {
    var d = docs[path];
    return {
      id: leafOf(path), ref: docRef(path), exists: d !== undefined,
      data: function () { return d === undefined ? undefined : clone(d); }
    };
  }

  function collSnap(path) {
    var list = Object.keys(docs).filter(function (p) { return parentOf(p) === path; }).sort().map(snap);
    return { docs: list, size: list.length, empty: list.length === 0, forEach: function (f) { list.forEach(f); } };
  }

  function changed(path) {
    persist();
    watchers.forEach(function (w) {
      var hit = w.isCollection ? parentOf(path) === w.path : w.path === path;
      if (hit) setTimeout(function () { try { w.cb(w.isCollection ? collSnap(w.path) : snap(w.path)); } catch (e) {} }, 0);
    });
  }

  function deepMerge(a, b) {
    var out = Object.assign({}, a);
    Object.keys(b || {}).forEach(function (k) {
      var v = b[k];
      if (v && typeof v === 'object' && v.__delete__ === true) { delete out[k]; return; }
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = deepMerge(out[k], v);
      else out[k] = clone(v);
    });
    return out;
  }

  function watch(path, isCollection, cb) {
    var w = { path: path, isCollection: isCollection, cb: cb };
    watchers.push(w);
    setTimeout(function () { try { cb(isCollection ? collSnap(path) : snap(path)); } catch (e) {} }, 0);
    return function () { watchers = watchers.filter(function (x) { return x !== w; }); };
  }

  function docRef(path) {
    return {
      id: leafOf(path), path: path,
      get: function () { return openDb().then(function () { return snap(path); }); },
      set: function (data, opts) {
        return openDb().then(function () {
          docs[path] = opts && opts.merge && docs[path] ? deepMerge(docs[path], data) : clone(data);
          changed(path);
        });
      },
      update: function (data) {
        return openDb().then(function () { docs[path] = deepMerge(docs[path] || {}, data); changed(path); });
      },
      delete: function () {
        return openDb().then(function () { delete docs[path]; changed(path); });
      },
      onSnapshot: function (cb) { return watch(path, false, cb); }
    };
  }

  function collRef(path) {
    return {
      id: leafOf(path), path: path,
      doc: function (id) { return docRef(path + '/' + (id || Math.random().toString(36).slice(2, 10))); },
      get: function () { return openDb().then(function () { return collSnap(path); }); },
      add: function (data) {
        var ref = docRef(path + '/' + Math.random().toString(36).slice(2, 10));
        return ref.set(data).then(function () { return ref; });
      },
      onSnapshot: function (cb) { return watch(path, true, cb); }
    };
  }

  var db = {
    doc: function (path) { return docRef(String(path).replace(/^\/+/, '')); },
    collection: function (path) { return collRef(String(path).replace(/^\/+/, '')); }
  };

  /* ---------- uploaded images (stand-in for claude.use('assets')) ---------- */
  var memBlobs = {};
  var ASSET_PREFIX = 'gx-asset-';

  window.gxBlobUrl = function (id) {
    if (memBlobs[id]) return memBlobs[id];
    try { var v = localStorage.getItem(ASSET_PREFIX + id); if (v) return v; } catch (e) {}
    return 'img/' + id + '.png';
  };

  var assets = {
    upload: function (blob) {
      var id = Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onload = function () {
          memBlobs[id] = fr.result;
          try { localStorage.setItem(ASSET_PREFIX + id, fr.result); } catch (e) { /* kept in memory only */ }
          resolve({ id: id, url: fr.result });
        };
        fr.onerror = function () { reject(fr.error || new Error('read failed')); };
        fr.readAsDataURL(blob);
      });
    }
  };

  var user = { id: function () { return Promise.resolve(USER_ID); }, name: function () { return Promise.resolve('You'); } };

  window.claude = window.claude || {};
  window.claude.use = function (name) {
    if (name === 'db') return openDb().then(function () { return db; });
    if (name === 'user') return Promise.resolve(user);
    if (name === 'assets') return Promise.resolve(assets);
    return Promise.resolve(null);
  };

  /* Reset helper: open the browser console and run gxResetData() to go back to the exported data. */
  window.gxResetData = function () {
    try {
      localStorage.removeItem(DB_KEY);
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf(ASSET_PREFIX) === 0) localStorage.removeItem(k); });
    } catch (e) {}
    location.reload();
  };

  loadAll();
})();
