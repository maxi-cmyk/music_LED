export const ham = (u) => 0.54 - 0.46 * Math.cos(2 * Math.PI * u); // Hamming window
const ease = (x) => x * x * (3 - 2 * x);
// 0 before a, 1 after b, eased in between
export const seg = (t, a, b) => ease(Math.min(1, Math.max(0, (t - a) / (b - a))));
export const easeCubic = (k) => { k = Math.min(1, Math.max(0, k)); return k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2; };
