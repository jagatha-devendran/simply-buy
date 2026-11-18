import { writable, get } from 'svelte/store';
import { getAddresses, createAddress, editAddress, removeAddress } from './api.js';

const STORAGE_KEY = 'simplybuy.addresses';

function loadLocalAddresses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // Ignore storage parse error
  }

  return [
    {
      id: 1,
      isDefault: true,
      name: 'Jagatha D',
      mobile: '9876543210',
      email: 'jagathadevam965@gmail.com',
      houseNumber: '402',
      streetAddress: 'High Street Residencies',
      locality: 'Indiranagar',
      landmark: 'Near Metro Station',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      addressType: 'HOME'
    }
  ];
}

export const addresses = writable(loadLocalAddresses());
export const addressesLoaded = writable(false);

addresses.subscribe((val) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  } catch (e) {
    // Storage quota or disabled
  }
});

export async function fetchUserAddresses() {
  try {
    const remote = await getAddresses();
    if (Array.isArray(remote) && remote.length > 0) {
      addresses.set(remote);
      addressesLoaded.set(true);
      return remote;
    }
  } catch (err) {
    // Backend offline / 401 fallback
  }
  addressesLoaded.set(true);
  return get(addresses);
}

export async function saveNewAddress(addrData) {
  // If marked default, unset other defaults
  if (addrData.isDefault) {
    addresses.update((list) =>
      list.map((a) => ({ ...a, isDefault: false }))
    );
  }

  let savedId = Date.now();
  try {
    const res = await createAddress(addrData);
    if (res && res.id) savedId = res.id;
  } catch (e) {
    // Local fallback
  }

  const newEntry = {
    ...addrData,
    id: savedId
  };

  addresses.update((list) => [newEntry, ...list]);
  return newEntry;
}

export async function updateExistingAddress(id, addrData) {
  if (addrData.isDefault) {
    addresses.update((list) =>
      list.map((a) => ({ ...a, isDefault: a.id === id }))
    );
  }

  try {
    await editAddress(id, addrData);
  } catch (e) {
    // Local fallback
  }

  addresses.update((list) =>
    list.map((a) => (a.id === id ? { ...a, ...addrData } : a))
  );
}

export async function deleteUserAddress(id) {
  try {
    await removeAddress(id);
  } catch (e) {
    // Local fallback
  }

  addresses.update((list) => list.filter((a) => a.id !== id));
}

export function setDefaultAddress(id) {
  addresses.update((list) =>
    list.map((a) => ({ ...a, isDefault: a.id === id }))
  );
}
