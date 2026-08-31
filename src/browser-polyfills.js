import { Buffer } from 'buffer';

// Midnight's browser SDK currently traverses dependencies that still expect
// Node's Buffer global. Install the standards-compatible browser polyfill
// before the SDK module graph is evaluated.
globalThis.Buffer ??= Buffer;
