// API client. In the self-hosted build it talks to the Node server; in the web (artifact)
// build (VITE_STANDALONE) the same routes are served in the browser by localServer.js.
export const STANDALONE = import.meta.env.VITE_STANDALONE === 'true';

async function request(method, url, body, opts = {}) {
  if (STANDALONE) {
    const local = await import('./localServer.js');
    return local.handle(method, url, opts.raw ? undefined : body, opts.extra);
  }
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined && !opts.raw ? { 'Content-Type': 'application/json' } : opts.headers,
      body: body === undefined ? undefined : opts.raw ? body : JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the studio server. Is it running?');
  }
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) throw Object.assign(new Error(data?.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

export const api = {
  get: (u) => request('GET', u),
  post: (u, b = {}) => request('POST', u, b),
  put: (u, b) => request('PUT', u, b),
  del: (u) => request('DELETE', u),
  upload: (file, tags = []) =>
    request('POST', '/api/upload', file, {
      raw: true,
      extra: { file, tags },
      headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(file.name), 'X-Tags': tags.join(',') },
    }),
  saveFile: async (blob, filename) => {
    if (STANDALONE) return (await import('./localServer.js')).saveFile(blob, filename);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return null;
  },
  exportBackup: async () => {
    if (STANDALONE) return (await import('./localServer.js')).exportBackup();
    window.location.href = '/api/export';
    return null;
  },
};
