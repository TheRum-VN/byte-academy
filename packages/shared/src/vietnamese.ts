export type InputMode = 'system' | 'integrated';
export type InputMethod = 'telex' | 'vni';
const segmenter = new Intl.Segmenter('vi', { granularity: 'grapheme' });
export const graphemes = (text: string): string[] =>
  Array.from(segmenter.segment(text.normalize('NFC')), (part) => part.segment);
export function compareText(target: string, value: string) {
  const expected = graphemes(target),
    actual = graphemes(value);
  return Array.from(
    { length: Math.max(expected.length, actual.length) },
    (_, i) => ({
      text: actual[i] ?? expected[i] ?? '',
      state:
        actual[i] === undefined
          ? 'pending'
          : actual[i] === expected[i]
            ? 'correct'
            : 'wrong',
    }),
  );
}
const tones = ['', '\u0301', '\u0300', '\u0309', '\u0303', '\u0323'];
const tonePattern = /[\u0301\u0300\u0309\u0303\u0323]/g;
const untoned = (s: string) =>
  s.normalize('NFD').replace(tonePattern, '').normalize('NFC');
const base = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const vowel = (s: string) => /^[aeiouy]$/.test(base(s));
function toneIndex(chars: string[]) {
  const positions = chars.flatMap((c, i) => (vowel(c) ? [i] : []));
  // u in qu and i in gi are consonantal when another vowel follows.
  if (
    positions.length > 1 &&
    ((chars[0]?.toLowerCase() === 'q' &&
      positions[0] === 1 &&
      base(chars[1]!) === 'u') ||
      (chars[0]?.toLowerCase() === 'g' &&
        positions[0] === 1 &&
        base(chars[1]!) === 'i'))
  )
    positions.shift();
  if (!positions.length) return -1;
  const shaped = positions.filter((i) => /[ăâêôơư]/i.test(untoned(chars[i]!)));
  if (shaped.length) return shaped.at(-1)!;
  if (positions.length >= 3) return positions[1]!;
  if (positions.length === 2) {
    const last = positions[1]!;
    return last < chars.length - 1 ? last : positions[0]!;
  }
  return positions[0]!;
}
function setTone(word: string, tone: number) {
  const chars = graphemes(untoned(word));
  const at = toneIndex(chars);
  if (at < 0) return word;
  chars[at] = (chars[at]! + tones[tone]).normalize('NFC');
  return chars.join('');
}
function currentTone(word: string) {
  const mark = word.normalize('NFD').match(tonePattern)?.[0];
  return mark ? tones.indexOf(mark) : 0;
}
const keepCase = (from: string, to: string) =>
  from === from.toUpperCase() ? to.toUpperCase() : to;
/** Syllable-based incremental IME: shape/tone are separate and tone is relocated
 * when a coda arrives. No global replacement of a sentence or DOM listeners. */
export function typeVietnamese(
  word: string,
  key: string,
  method: InputMethod,
): string {
  word = word.normalize('NFC');
  if (!/^[a-z0-9]$/i.test(key)) return word + key;
  const lower = key.toLowerCase(),
    tone = currentTone(word);
  const chars = graphemes(untoned(word));
  const toneKey =
    method === 'telex'
      ? { s: 1, f: 2, r: 3, x: 4, j: 5, z: 0 }[lower]
      : /^[0-5]$/.test(key)
        ? Number(key)
        : undefined;
  if (toneKey !== undefined && toneIndex(chars) >= 0) {
    // Repeated tone key escapes to literal (ass → as).
    return toneKey === tone && tone !== 0
      ? chars.join('') + key
      : setTone(word, toneKey);
  }
  let changed = false;
  const replaceLast = (from: string, to: string) => {
    for (let i = chars.length - 1; i >= 0; i--)
      if (from.includes(chars[i]!.toLowerCase())) {
        const c = chars[i]!;
        chars[i] = keepCase(c, to[from.indexOf(c.toLowerCase())]!);
        changed = true;
        return;
      }
  };
  if (
    (method === 'telex' && lower === 'd') ||
    (method === 'vni' && key === '9')
  ) {
    replaceLast('d', 'đ');
    if (!changed && chars.some((c) => c.toLowerCase() === 'đ')) {
      replaceLast('đ', 'd');
      return setTone(chars.join(''), tone) + key;
    }
  }
  if (
    method === 'telex' &&
    'aeo'.includes(lower) &&
    base(chars.at(-1) ?? '') === lower
  ) {
    const last = chars.at(-1)!;
    if (untoned(last).toLowerCase() === lower) {
      chars[chars.length - 1] = keepCase(
        last,
        { a: 'â', e: 'ê', o: 'ô' }[lower]!,
      );
      changed = true;
    } else {
      chars[chars.length - 1] = keepCase(last, lower);
      return setTone(chars.join(''), tone) + key;
    }
  }
  if (
    (method === 'telex' && lower === 'w') ||
    (method === 'vni' && key === '7')
  ) {
    const plain = chars.join('').toLowerCase();
    const uo = plain.lastIndexOf('uo'),
      uu = plain.lastIndexOf('uu');
    const hornPair = plain.lastIndexOf('ươ'),
      hornUu = plain.lastIndexOf('ưu');
    if (uo >= 0) {
      // In qu the u belongs to the onset, not the vowel nucleus (quơ).
      if (!(uo === 1 && plain.startsWith('q')))
        chars[uo] = keepCase(chars[uo]!, 'ư');
      chars[uo + 1] = keepCase(chars[uo + 1]!, 'ơ');
      changed = true;
    } else if (uu >= 0) {
      chars[uu] = keepCase(chars[uu]!, 'ư');
      changed = true;
    } else if (hornPair >= 0 || hornUu >= 0) {
      const at = Math.max(hornPair, hornUu);
      chars[at] = keepCase(chars[at]!, 'u');
      if (hornPair >= 0) chars[at + 1] = keepCase(chars[at + 1]!, 'o');
      return setTone(chars.join(''), tone) + key;
    } else
      replaceLast(
        method === 'telex' ? 'aou' : 'ou',
        method === 'telex' ? 'ăơư' : 'ơư',
      );
    if (!changed) {
      replaceLast(
        method === 'telex' ? 'ăơư' : 'ơư',
        method === 'telex' ? 'aou' : 'ou',
      );
      if (changed) return setTone(chars.join(''), tone) + key;
    }
  }
  if (method === 'vni' && ['6', '8'].includes(key)) {
    replaceLast(key === '6' ? 'aeo' : 'a', key === '6' ? 'âêô' : 'ă');
    if (!changed) {
      replaceLast(key === '6' ? 'âêô' : 'ă', key === '6' ? 'aeo' : 'a');
      if (changed) return setTone(chars.join(''), tone) + key;
    }
  }
  const result = chars.join('') + (changed ? '' : key);
  return tone ? setTone(result, tone) : result;
}
/** UTF-16 selection offsets match native textarea APIs; normalization affects only
 * the edited prefix, so decomposed text after the selection keeps its offsets. */
export function editVietnamese(
  value: string,
  start: number,
  end: number,
  key: string,
  method: InputMethod,
) {
  const before = value.slice(0, start),
    after = value.slice(end);
  const word = before.match(/[\p{L}\p{M}]+$/u)?.[0] ?? '';
  const prefix = before.slice(0, before.length - word.length);
  const inserted = typeVietnamese(word, key, method);
  return {
    value: prefix + inserted + after,
    caret: prefix.length + inserted.length,
  };
}
export class CompositionGate {
  composing = false;
  start() {
    this.composing = true;
  }
  update() {
    this.composing = true;
  }
  end(value: string) {
    this.composing = false;
    return value.normalize('NFC');
  }
  input(value: string, nativeComposing = false) {
    return this.composing || nativeComposing ? null : value.normalize('NFC');
  }
}
