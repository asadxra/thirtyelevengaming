import { useEffect, useState } from 'react';

const read = () => (window.location.hash.replace(/^#/, '') || '/dashboard');

export function navigate(path) {
  if (read() !== path) window.location.hash = path;
}

export function useRoute() {
  const [path, setPath] = useState(read);
  useEffect(() => {
    const on = () => setPath(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [pathname, query = ''] = path.split('?');
  return { path: pathname, parts: pathname.split('/').filter(Boolean), query: new URLSearchParams(query) };
}
