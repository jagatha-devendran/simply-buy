const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-IN');

/** ₹1,296 — whole rupees when the amount is whole, ₹216.5 otherwise. */
export function inr(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  return `₹${money.format(Number(amount))}`;
}

export function count(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '0';
  return whole.format(Number(value));
}

export function rating(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n.toFixed(1) : 'New';
}

/** Orders page labels: "Watches" already arrives capitalised from the API. */
export function pluralise(n, one, many) {
  return `${count(n)} ${n === 1 ? one : many}`;
}
