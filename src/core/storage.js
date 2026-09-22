// Обёртка над localStorage с инъекцией бэкенда для тестов.

export function createStorage(backend, prefix = 'ivk.') {
  const mem = new Map();
  const be = backend || {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
  return {
    get(key, fallback = null) {
      try {
        const raw = be.getItem(prefix + key);
        return raw === null || raw === undefined ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        be.setItem(prefix + key, JSON.stringify(value));
      } catch {
        /* приватный режим — молча живём в памяти */
      }
    },
    remove(key) {
      try {
        be.removeItem(prefix + key);
      } catch {
        /* ignore */
      }
    },
  };
}

export function browserStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ivk.__probe', '1');
      localStorage.removeItem('ivk.__probe');
      return createStorage(localStorage);
    }
  } catch {
    /* fallthrough */
  }
  return createStorage(null);
}
