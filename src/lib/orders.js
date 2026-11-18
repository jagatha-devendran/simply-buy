import { writable, get } from 'svelte/store';
import { getOrders, cancelOrderApi } from './api.js';

const STORAGE_KEY = 'simplybuy.orders';

function normalizeOrder(o, idx = 0) {
  if (!o) return null;
  const rawId = o.id || o.orderId || o.orderNumber || Date.now() - idx * 100000;
  const orderNum = o.orderNumber || (typeof o.id === 'string' && o.id.startsWith('ORD') ? o.id : `ORD-${rawId}`);

  // Normalize address
  const addr = o.shippingAddress || {};
  const recipientName = addr.recipientName || addr.fullName || addr.name || 'Jagatha D';
  const phone = addr.phone || addr.mobile || '9876543210';
  const streetAddress = addr.streetAddress || addr.address || '402, High Street Residencies, Indiranagar';
  const city = addr.city || 'Bengaluru';
  const pincode = addr.pincode || '560038';

  // Normalize items
  const rawItems = Array.isArray(o.items) ? o.items : [];
  const normalizedItems = rawItems.map((it, itemIdx) => {
    const pId = it.productId || it.id || itemIdx + 1;
    const pName = it.productName || it.title || 'Curated Apparel & Lifestyle Product';
    const unitPrice = Number(it.unitPrice ?? it.price ?? 399);
    const qty = Number(it.quantity ?? 1);
    const totalPrice = Number(it.totalPrice ?? (unitPrice * qty));
    let img = it.imageUrl || it.image || (Array.isArray(it.images) ? it.images[0] : '') || '';
    if (typeof img === 'object' && img?.src) img = img.src;

    return {
      productId: pId,
      productName: pName,
      sku: it.sku || (it.size ? `${pId}-${it.size}` : `${pId}-STD`),
      unitPrice,
      quantity: qty,
      totalPrice,
      imageUrl: img
    };
  });

  const totalAmount = Number(o.totalAmount ?? (normalizedItems.reduce((acc, curr) => acc + curr.totalPrice, 0) || 376));
  const status = (o.status || 'PENDING').toUpperCase();

  return {
    id: rawId,
    orderNumber: orderNum,
    date: o.date || o.createdAt || new Date(Date.now() - idx * 86400000).toISOString(),
    status,
    deliveryEstimate: o.deliveryEstimate || (status === 'DELIVERED' ? 'Delivered' : status === 'CANCELLED' ? 'Order Cancelled' : 'Estimated delivery in 2-4 business days'),
    paymentMethod: String(o.paymentMethod || '').toUpperCase().includes('COD') ? 'COD' : 'ONLINE',
    shippingAddress: {
      recipientName,
      phone,
      streetAddress,
      city,
      pincode
    },
    items: normalizedItems,
    totalAmount
  };
}

function loadInitialOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((o, i) => normalizeOrder(o, i)).filter(Boolean);
      }
    }
  } catch (e) {
    // Ignore storage parse error
  }

  // Pre-seed with realistic sample orders
  const defaults = [
    {
      id: 101,
      orderNumber: 'ORD-894201',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'PENDING',
      deliveryEstimate: 'Arriving by Friday, 7 PM',
      paymentMethod: 'COD',
      shippingAddress: {
        recipientName: 'Jagatha D',
        phone: '9876543210',
        streetAddress: '402, High Street Residencies, Indiranagar',
        city: 'Bengaluru',
        pincode: '560038'
      },
      items: [
        {
          productId: 12027432,
          productName: 'Levis Men Soft Pure Cotton Round Neck Half Sleeve Tshirt',
          sku: '12027432-M',
          unitPrice: 376,
          quantity: 1,
          totalPrice: 376,
          imageUrl: 'https://assets.myntassets.com/h_720,q_90,w_540/v1/assets/images/12027432/2020/7/2/84b5c71b-fc74-4b47-b844-0b7dc3f98be11593688194412-Levis-Men-Tshirts-1051593688192661-1.jpg'
        }
      ],
      totalAmount: 376
    },
    {
      id: 98,
      orderNumber: 'ORD-729410',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'DELIVERED',
      deliveryEstimate: 'Delivered on Nov 13',
      paymentMethod: 'ONLINE',
      shippingAddress: {
        recipientName: 'Jagatha D',
        phone: '9876543210',
        streetAddress: '402, High Street Residencies, Indiranagar',
        city: 'Bengaluru',
        pincode: '560038'
      },
      items: [
        {
          productId: 39684840,
          productName: 'Skmei Unisex Dial & Straps Digital Multi Function Watch',
          sku: '39684840-OS',
          unitPrice: 786,
          quantity: 1,
          totalPrice: 786,
          imageUrl: 'https://assets.myntassets.com/h_720,q_90,w_540/v1/assets/images/39684840/2024/7/31/316f3938-f1e1-482a-a9a3-5c56857189a01722421370211-1.jpg'
        }
      ],
      totalAmount: 786
    }
  ];

  return defaults.map((o, i) => normalizeOrder(o, i));
}

export const orders = writable(loadInitialOrders());
export const ordersLoading = writable(false);

orders.subscribe((val) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  } catch (e) {
    // Ignore storage quota
  }
});

export async function fetchUserOrders() {
  ordersLoading.set(true);
  try {
    const remote = await getOrders();
    if (Array.isArray(remote) && remote.length > 0) {
      const normalized = remote.map((o, idx) => normalizeOrder(o, idx)).filter(Boolean);
      orders.set(normalized);
      ordersLoading.set(false);
      return normalized;
    }
  } catch (err) {
    // Offline or fallback to local orders
  }
  ordersLoading.set(false);
  return get(orders);
}

export function recordOrder({ id, orderNumber, items, totalAmount, shippingAddress, paymentMethod }) {
  const generatedNum = orderNumber || `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const orderObj = {
    id: id || Date.now(),
    orderNumber: generatedNum,
    date: new Date().toISOString(),
    status: 'PENDING',
    deliveryEstimate: 'Estimated delivery within 2-4 business days',
    paymentMethod: paymentMethod === 'COD' ? 'COD' : 'ONLINE',
    shippingAddress,
    items,
    totalAmount
  };

  const normalized = normalizeOrder(orderObj);
  orders.update((list) => [normalized, ...list.filter((o) => o.orderNumber !== normalized.orderNumber)]);
  return normalized;
}

export async function cancelUserOrder(orderId) {
  try {
    await cancelOrderApi(orderId);
  } catch (e) {
    // Graceful offline fallback
  }

  orders.update((list) =>
    list.map((o) =>
      String(o.id) === String(orderId) || String(o.orderNumber) === String(orderId)
        ? { ...o, status: 'CANCELLED', deliveryEstimate: 'Order Cancelled' }
        : o
    )
  );
}
