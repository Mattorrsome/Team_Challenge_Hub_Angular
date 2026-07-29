/**
 * Repoint the bare `localStorage` global at jsdom's real `Storage` for unit tests.
 *
 * Node 22+ ships its own experimental `globalThis.localStorage`, inert unless the process
 * was started with `--localstorage-file`. Because that accessor already exists, Vitest's
 * `populateGlobal` skips copying jsdom's `localStorage` onto the global (it only overwrites
 * keys in its own KEYS list), so app code reading plain `localStorage` gets Node's dead
 * accessor and sees `undefined`. Vitest also sets `globalThis.window = globalThis`, so
 * `window.localStorage` is the same dead value.
 *
 * The real jsdom window is still reachable as `globalThis.frames` (per spec
 * `window.frames === window`), and its `localStorage` is jsdom's spec-compliant `Storage` —
 * so we hand app code that object rather than a hand-rolled fake.
 */
const jsdomWindow = (globalThis as { frames?: Window }).frames;

if (!jsdomWindow?.localStorage) {
  throw new Error(
    "test-setup: could not reach jsdom's localStorage via globalThis.frames. " +
      'Check the test environment is jsdom and how Vitest exposes its window globals.',
  );
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: jsdomWindow.localStorage,
});
