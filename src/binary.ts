// Text <-> binary (and hex / decimal / octal) over UTF-8 bytes.

export type Base = 'bin' | 'hex' | 'dec' | 'oct';

export const BASE_RADIX: Record<Base, number> = { bin: 2, hex: 16, dec: 10, oct: 8 };
export const BASE_LABEL: Record<Base, string> = {
  bin: 'Binary',
  hex: 'Hex',
  dec: 'Decimal',
  oct: 'Octal',
};

function byteStr(b: number, base: Base): string {
  if (base === 'bin') return b.toString(2).padStart(8, '0');
  if (base === 'hex') return b.toString(16).padStart(2, '0');
  if (base === 'oct') return b.toString(8).padStart(3, '0');
  return String(b); // dec, no pad
}

export function textToCode(text: string, base: Base, sep: string): string {
  const bytes = new TextEncoder().encode(text);
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i++) out.push(byteStr(bytes[i], base));
  return out.join(sep);
}

// Parse a code string back to text. Tolerant: any run of separators splits tokens.
// If tokens have no separators and the base is binary/hex, split by fixed width.
export function codeToText(code: string, base: Base): { text: string; ok: boolean; error?: string } {
  const radix = BASE_RADIX[base];
  const trimmed = code.trim();
  if (!trimmed) return { text: '', ok: true };

  let tokens: string[];
  if (/\s|,/.test(trimmed)) {
    tokens = trimmed.split(/[\s,]+/).filter(Boolean);
  } else if (base === 'bin' && trimmed.length % 8 === 0) {
    tokens = trimmed.match(/.{8}/g) || [];
  } else if (base === 'hex' && trimmed.length % 2 === 0) {
    tokens = trimmed.match(/.{2}/g) || [];
  } else {
    tokens = [trimmed];
  }

  const valid = base === 'bin' ? /^[01]+$/ : base === 'hex' ? /^[0-9a-fA-F]+$/ : base === 'oct' ? /^[0-7]+$/ : /^[0-9]+$/;
  const bytes: number[] = [];
  for (const t of tokens) {
    if (!valid.test(t)) return { text: '', ok: false, error: `“${t}” is not a valid ${BASE_LABEL[base].toLowerCase()} value` };
    const n = parseInt(t, radix);
    if (n < 0 || n > 255) return { text: '', ok: false, error: `${t} is out of the 0–255 byte range` };
    bytes.push(n);
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    return { text, ok: true };
  } catch {
    // not valid UTF-8 — fall back to Latin-1 so ASCII-ish input still works
    const text = bytes.map((b) => String.fromCharCode(b)).join('');
    return { text, ok: true, error: 'bytes are not valid UTF-8 — shown as Latin-1' };
  }
}

// crude direction guess for the "auto" mode
export function looksLikeCode(s: string, base: Base): boolean {
  const t = s.trim();
  if (!t) return false;
  if (base === 'bin') return /^[01\s,]+$/.test(t) && /[01]/.test(t);
  if (base === 'hex') return /^[0-9a-fA-F\s,]+$/.test(t) && t.replace(/[\s,]/g, '').length % 2 === 0;
  if (base === 'oct') return /^[0-7\s,]+$/.test(t);
  return /^[0-9\s,]+$/.test(t) && /[\s,]/.test(t);
}

export interface CharRow {
  char: string;
  display: string;
  code: number;
  bin: string;
  hex: string;
  dec: string;
  oct: string;
}

const CONTROL: Record<number, string> = {
  9: '\\t', 10: '\\n', 13: '\\r', 32: '␣', 0: 'NUL',
};

export function charTable(text: string, limit = 128): CharRow[] {
  const rows: CharRow[] = [];
  const chars = Array.from(text).slice(0, limit);
  for (const ch of chars) {
    const cp = ch.codePointAt(0)!;
    const bytes = new TextEncoder().encode(ch);
    rows.push({
      char: ch,
      display: CONTROL[cp] ?? (cp < 32 ? `\\x${cp.toString(16).padStart(2, '0')}` : ch),
      code: cp,
      bin: Array.from(bytes).map((b) => b.toString(2).padStart(8, '0')).join(' '),
      hex: Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(' '),
      dec: String(cp),
      oct: cp.toString(8),
    });
  }
  return rows;
}
