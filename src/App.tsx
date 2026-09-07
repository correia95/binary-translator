import { useEffect, useMemo, useRef, useState } from 'react';
import { BASE_LABEL, Base, charTable, codeToText, textToCode } from './binary';

const BASES: Base[] = ['bin', 'hex', 'dec', 'oct'];
const SEPS: { id: string; label: string; value: string }[] = [
  { id: 'space', label: 'Space', value: ' ' },
  { id: 'none', label: 'None', value: '' },
  { id: 'comma', label: 'Comma', value: ', ' },
  { id: 'newline', label: 'New line', value: '\n' },
];

export default function App() {
  const p = new URLSearchParams(window.location.search);
  const [base, setBase] = useState<Base>((BASES.includes(p.get('b') as Base) ? p.get('b') : 'bin') as Base);
  const [sepId, setSepId] = useState(p.get('s') && SEPS.some((x) => x.id === p.get('s')) ? p.get('s')! : 'space');
  const [text, setText] = useState(p.get('t') ?? 'Hello');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const editing = useRef<'text' | 'code' | null>(null);
  const copyT = useRef<number>();

  // decimal / octal have no fixed width, so an unseparated run can't be decoded
  const needsSep = base === 'dec' || base === 'oct';
  const seps = needsSep ? SEPS.filter((s) => s.id !== 'none') : SEPS;
  const activeSepId = needsSep && sepId === 'none' ? 'space' : sepId;
  const sep = SEPS.find((x) => x.id === activeSepId)!.value;

  // when text (or base/sep) changes and we're not editing the code box, regenerate code
  useEffect(() => {
    if (editing.current === 'code') return;
    setCode(textToCode(text, base, sep));
    setError(null);
  }, [text, base, sep]);

  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set('b', base);
    u.searchParams.set('s', sepId);
    u.searchParams.set('t', text);
    window.history.replaceState(null, '', u.toString());
  }, [base, sepId, text]);

  const onText = (v: string) => {
    editing.current = 'text';
    setText(v);
  };
  const onCode = (v: string) => {
    editing.current = 'code';
    setCode(v);
    const r = codeToText(v, base);
    if (r.ok) {
      setText(r.text);
      setError(r.error ?? null);
    } else {
      setError(r.error ?? 'Invalid input');
    }
  };

  const swap = () => {
    // turn the current code into the new text (decode), regenerate fresh code
    editing.current = null;
    const r = codeToText(code, base);
    if (r.ok) setText(r.text);
  };

  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(key);
      window.clearTimeout(copyT.current);
      copyT.current = window.setTimeout(() => setCopied(null), 1200);
    }).catch(() => {});
  };

  const rows = useMemo(() => charTable(text, 96), [text]);
  const bytes = useMemo(() => new TextEncoder().encode(text).length, [text]);

  return (
    <div className="wrap">
      <header>
        <h1>Binary Translator</h1>
        <p className="sub">
          Convert text to binary and binary back to text — and the same for hexadecimal, decimal
          and octal. Edit either box and the other follows. Full Unicode via UTF-8. Runs in your
          browser.
        </p>
      </header>

      <div className="opts">
        <div className="seg">
          {BASES.map((b) => (
            <button key={b} className={base === b ? 'on' : ''} onClick={() => { editing.current = null; setBase(b); }}>
              {BASE_LABEL[b]}
            </button>
          ))}
        </div>
        <label className="sepsel">
          Separator
          <select value={activeSepId} onChange={(e) => { editing.current = null; setSepId(e.target.value); }}>
            {seps.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className="pane">
        <div className="phead"><span>Text</span>
          <button onClick={() => copy(text, 'text')}>{copied === 'text' ? 'Copied' : 'Copy'}</button>
        </div>
        <textarea className="box" value={text} spellCheck={false} onChange={(e) => onText(e.target.value)} placeholder="Type text here" />
      </div>

      <div className="swap">
        <button onClick={swap} title="Use the code below as the text">⇅ Swap</button>
      </div>

      <div className="pane">
        <div className="phead"><span>{BASE_LABEL[base]}</span>
          <button onClick={() => copy(code, 'code')}>{copied === 'code' ? 'Copied' : 'Copy'}</button>
        </div>
        <textarea
          className={'box mono' + (error ? ' err' : '')}
          value={code}
          spellCheck={false}
          onChange={(e) => onCode(e.target.value)}
          placeholder={base === 'bin' ? '01001000 01101001' : 'paste code here'}
        />
        {error && <p className="emsg">{error}</p>}
      </div>

      <p className="meta">{Array.from(text).length} characters · {bytes} UTF-8 byte{bytes === 1 ? '' : 's'}</p>

      {rows.length > 0 && (
        <div className="tablewrap">
          <h2>Character by character</h2>
          <table>
            <thead>
              <tr><th>Char</th><th>Binary</th><th>Hex</th><th>Dec</th><th>Oct</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="ch">{r.display}</td>
                  <td>{r.bin}</td>
                  <td>{r.hex}</td>
                  <td>{r.dec}</td>
                  <td>{r.oct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="explain">
        <h2>How text becomes binary</h2>
        <p>
          Each character is stored as one or more bytes using <strong>UTF-8</strong>. Plain English
          letters are one byte each — “A” is <code>01000001</code>, which is 65 in decimal. Accented
          letters and emoji take two to four bytes, so you'll see several groups of eight bits per
          character. This translator shows every byte, so a round trip back to text is exact.
        </p>
        <h3>What do the separators do?</h3>
        <p>
          They only affect how the output is spaced — a space between each byte is the most readable.
          When decoding, any spaces, commas or line breaks are accepted, and unseparated binary or
          hex is split into 8-bit / 2-digit groups automatically.
        </p>
        <h3>Is this ASCII or Unicode?</h3>
        <p>
          Both. The first 128 UTF-8 values are identical to ASCII, so ASCII text encodes the same
          way. Anything above that uses multi-byte UTF-8 sequences.
        </p>
        <h3>Is my text uploaded?</h3>
        <p>No. The conversion is done in your browser, and the text sits in the page URL so you can share a result.</p>
        <footer>Binary Translator · client-side · no sign-up · works offline</footer>
      </section>
    </div>
  );
}
