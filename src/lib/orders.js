import { writable, get } from 'svelte/store';
import { user } from './session.js';

const STORAGE_KEY = 'simplybuy.orders';

function loadInitialOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // Ignore storage parse error
  }

  // Pre-seed with a realistic sample order for demonstration
  return [
    {
      id: 'SB-849201',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'In Transit',
      deliveryEstimate: 'Arriving by tomorrow, 6 PM',
      paymentMethod: 'UPI (Google Pay)',
      shippingAddress: {
        fullName: 'Jagatha D',
        phone: '9876543210',
        address: '402, High Street Residencies, Indiranagar',
        city: 'Bengaluru',
        pincode: '560038'
      },
      items: [
        {
          id: '12027432',
          title: 'Levis Men Soft Pure Cotton Round Neck Half Sleeve Tshirt',
          brand: 'LEVIS',
          price: 376,
          mrp: 649,
          quantity: 1,
          size: 'M',
          image: 'https://assets.myntassets.com/h_720,q_90,w_540/v1/assets/images/12027432/2020/7/2/84b5c71b-fc74-4b47-b844-0b7dc3f98be11593688194412-Levis-Men-Tshirts-1051593688192661-1.jpg'
        }
      ],
      totalAmount: 376
    }
  ];
}

export const orders = writable(loadInitialOrders());

orders.subscribe((val) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  } catch (e) {
    // Storage quota or disabled
  }
});

export function recordOrder({ id, items, totalAmount, shippingAddress, paymentMethod }) {
  const newOrder = {
    id: id || `SB-${Math.floor(100000 + Math.random() * 900000)}`,
    date: new Date().toISOString(),
    status: 'Order Placed',
    deliveryEstimate: 'Estimated delivery within 3-4 days',
    paymentMethod: paymentMethod || 'UPI',
    shippingAddress,
    items: items.map((it) => ({
      id: it.id || it.productId,
      title: it.title,
      brand: it.brand,
      price: it.price,
      mrp: it.mrp,
      quantity: it.quantity || 1,
      size: it.size || 'M',
      image: typeof it.image === 'string' ? it.image : (it.image?.src || '')
    })),
    totalAmount
  };

  orders.update((list) => [newOrder, ...list]);
  return newOrder;
}
