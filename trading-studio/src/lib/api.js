// Thin fetch wrapper. Errors carry the server's message so the UI can display it.
async function request(method, url, body, opts = {}) {
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
      headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(file.name), 'X-Tags': tags.join(',') },
    }),
};
