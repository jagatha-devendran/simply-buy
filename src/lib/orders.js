import { writable, get } from 'svelte/store';
import { getOrders, cancelOrderApi } from './api.js';

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

  // Pre-seed with realistic sample orders
  return [
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
      const normalized = remote.map((o) => ({
        id: o.orderId || o.id,
        orderNumber: o.orderNumber || `ORD-${o.orderId}`,
        date: o.createdAt || new Date().toISOString(),
        status: o.status || 'PENDING',
        deliveryEstimate: o.status === 'DELIVERED' ? 'Delivered' : 'Estimated delivery in 2-3 business days',
        paymentMethod: o.paymentMethod || 'COD',
        shippingAddress: {
          recipientName: o.shippingAddress?.recipientName || 'Customer',
          phone: o.shippingAddress?.phone || '',
          streetAddress: o.shippingAddress?.streetAddress || '',
          city: o.shippingAddress?.city || '',
          pincode: o.shippingAddress?.pincode || ''
        },
        items: Array.isArray(o.items) ? o.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          sku: it.sku,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          totalPrice: it.totalPrice,
          imageUrl: it.imageUrl
        })) : [],
        totalAmount: o.totalAmount
      }));
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
  const newOrder = {
    id: id || Date.now(),
    orderNumber: generatedNum,
    date: new Date().toISOString(),
    status: 'PENDING',
    deliveryEstimate: 'Estimated delivery within 3-4 days',
    paymentMethod: paymentMethod === 'COD' ? 'COD' : 'ONLINE',
    shippingAddress: {
      recipientName: shippingAddress.fullName || shippingAddress.recipientName,
      phone: shippingAddress.phone,
      streetAddress: shippingAddress.address || shippingAddress.streetAddress,
      city: shippingAddress.city,
      pincode: shippingAddress.pincode
    },
    items: items.map((it) => ({
      productId: it.productId || it.id,
      productName: it.title || it.productName,
      sku: it.sku || `${it.id}-${it.size || 'STD'}`,
      unitPrice: it.price || it.unitPrice,
      quantity: it.quantity || 1,
      totalPrice: (it.price || it.unitPrice) * (it.quantity || 1),
      imageUrl: typeof it.image === 'string' ? it.image : (it.image?.src || it.imageUrl || '')
    })),
    totalAmount
  };

  orders.update((list) => [newOrder, ...list]);
  return newOrder;
}

export async function cancelUserOrder(orderId) {
  try {
    await cancelOrderApi(orderId);
  } catch (e) {
    // Graceful offline fallback
  }

  orders.update((list) =>
    list.map((o) =>
      String(o.id) === String(orderId) || o.orderNumber === String(orderId)
        ? { ...o, status: 'CANCELLED', deliveryEstimate: 'Order Cancelled' }
        : o
    )
  );
}
