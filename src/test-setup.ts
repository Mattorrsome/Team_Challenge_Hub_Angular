// Ensure localStorage is available in test environment
if (typeof globalThis !== 'undefined' && typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      data: {} as Record<string, string>,
      getItem(key: string) {
        return this.data[key] || null;
      },
      setItem(key: string, value: string) {
        this.data[key] = value.toString();
      },
      removeItem(key: string) {
        delete this.data[key];
      },
      clear() {
        this.data = {};
      },
      key(index: number) {
        return Object.keys(this.data)[index] || null;
      },
      get length() {
        return Object.keys(this.data).length;
      },
    },
  });
}
