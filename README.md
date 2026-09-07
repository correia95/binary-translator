# Binary Translator

Two-way text ↔ binary (and hex / decimal / octal) in the browser.

- Edit the text box or the code box — the other updates live.
- Bases: binary, hexadecimal, decimal, octal.
- Separators: space, none, comma, new line. Decoding accepts any of them and auto-splits
  unseparated binary/hex.
- Full Unicode via UTF-8 (multi-byte characters shown byte by byte, exact round trip).
- Character-by-character table (char · binary · hex · dec · oct).
- Text, base and separator persist in the URL.

## Develop

```
npm install
npm run dev
npm run build
```

Engine and tests: [`src/binary.ts`](src/binary.ts). Static site on Cloudflare Workers.

Part of [Tiny Tools](https://tinytools.correia95.workers.dev).
