import { writable, derived, get } from 'svelte/store';

const KEY = 'simplybuy.bag';

function loadStored() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const bagItems = writable(loadStored());
export const bagOpen = writable(false);
export const appliedCoupon = writable(null); // e.g. { code: 'SAVE15', discountPercent: 15 }

function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore storage quota */
  }
}

export function openBag() {
  bagOpen.set(true);
}

export function closeBag() {
  bagOpen.set(false);
}

export function addToBag(product, size = 'Standard', quantity = 1) {
  const items = get(bagItems);
  const existingIndex = items.findIndex(
    (item) => String(item.product.productId) === String(product.productId) && item.size === size,
  );

  let next;
  if (existingIndex > -1) {
    next = [...items];
    next[existingIndex] = {
      ...next[existingIndex],
      quantity: next[existingIndex].quantity + quantity,
    };
  } else {
    next = [{ product, size, quantity }, ...items];
  }

  bagItems.set(next);
  save(next);
  openBag();
}

export function updateQuantity(productId, size, quantity) {
  const items = get(bagItems);
  let next;
  if (quantity <= 0) {
    next = items.filter(
      (item) => !(String(item.product.productId) === String(productId) && item.size === size),
    );
  } else {
    next = items.map((item) => {
      if (String(item.product.productId) === String(productId) && item.size === size) {
        return { ...item, quantity: Math.min(10, Math.max(1, quantity)) };
      }
      return item;
    });
  }
  bagItems.set(next);
  save(next);
}

export function removeFromBag(productId, size) {
  updateQuantity(productId, size, 0);
}

export function clearBag() {
  bagItems.set([]);
  save([]);
}

export function applyCoupon(code) {
  const clean = String(code).trim().toUpperCase();
  if (clean === 'ELEGANCE15' || clean === 'SAVE15') {
    appliedCoupon.set({ code: clean, percent: 15, label: '15% Luxe Savings' });
    return { ok: true, message: 'Coupon applied! 15% discount has been applied.' };
  }
  if (clean === 'FIRSTBUY' || clean === 'WELCOME') {
    appliedCoupon.set({ code: clean, percent: 10, label: '10% Welcome Savings' });
    return { ok: true, message: 'Welcome coupon applied! 10% discount added.' };
  }
  return { ok: false, message: 'Invalid coupon code. Try ELEGANCE15 or FIRSTBUY' };
}

export function removeCoupon() {
  appliedCoupon.set(null);
}

export const bagSummary = derived([bagItems, appliedCoupon], ([$items, $coupon]) => {
  const itemCount = $items.reduce((sum, item) => sum + item.quantity, 0);
  const totalMrp = $items.reduce(
    (sum, item) => sum + Number(item.product.mrp || item.product.price) * item.quantity,
    0,
  );
  const subtotal = $items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const mrpDiscount = totalMrp - subtotal;
  const deliveryFee = subtotal === 0 || subtotal >= 999 ? 0 : 99;
  const couponDiscount = $coupon ? Math.round((subtotal * $coupon.percent) / 100) : 0;
  const total = Math.max(0, subtotal - couponDiscount + deliveryFee);

  return {
    itemCount,
    totalMrp,
    subtotal,
    mrpDiscount,
    deliveryFee,
    couponDiscount,
    total,
    isFreeDelivery: deliveryFee === 0 && subtotal > 0,
    amountToFreeDelivery: Math.max(0, 999 - subtotal),
  };
});
