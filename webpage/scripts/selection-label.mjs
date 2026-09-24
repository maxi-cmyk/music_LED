import { FREQUENCIES } from './config.mjs?release=20260924-distill-23';

export function selectionLabel(frequencies) {
  if (!frequencies.length) return 'Silence';
  return frequencies.map((frequencyHz) => {
    const detail = FREQUENCIES.find((item) => item.frequencyHz === frequencyHz);
    return `${detail?.label ?? 'Tone'} · ${frequencyHz} Hz`;
  }).join(' + ');
}
