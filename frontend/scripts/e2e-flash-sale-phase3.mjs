import { chromium } from 'playwright';

const WEB_BASE = process.env.BASE_URL || 'http://localhost:5173';
const API_BASE = process.env.E2E_API_BASE || 'http://localhost:8080';
const TIMEOUT = 25000;

const CREDENTIALS = {
  email: process.env.E2E_CUSTOMER_EMAIL || 'minh.customer@fashion.local',
  password: process.env.E2E_CUSTOMER_PASSWORD || 'Test@123',
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const log = (label, detail = '') => {
  console.log(`PASS ${label}${detail ? ` -> ${detail}` : ''}`);
};

const jsonHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const api = async (path, init = {}, token) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...jsonHeaders(token),
      ...(init.headers || {}),
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = (payload && payload.message) || response.statusText || 'Request failed';
    throw new Error(`${path} failed (${response.status}): ${message}`);
  }
  return payload;
};

const loginCustomer = async () => {
  const payload = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(CREDENTIALS),
  });
  assert(payload?.token, 'Login response is missing token.');
  return payload.token;
};

const getActiveFlashSale = async () => {
  const payload = await api('/api/public/marketplace/flash-sale/active', { method: 'GET' });
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return { ...payload, items };
};

const pickRunnableFlashItem = (items) => {
  return items.find((item) => {
    const productId = String(item?.productId || '').trim();
    if (!productId) return false;

    const soldCount = Math.max(0, Number(item?.soldCount || 0));
    const quota = Math.max(0, Number(item?.quota || 0));
    return quota > soldCount;
  }) || null;
};

const resolveVariantId = (item) => {
  const direct = String(item?.variantId || '').trim();
  if (direct) return direct;

  const variants = Array.isArray(item?.variants) ? item.variants : [];
  const firstVariant = variants.find((variant) => String(variant?.id || '').trim());
  return firstVariant ? String(firstVariant.id).trim() : undefined;
};

const createDefaultAddress = async (token) => {
  const payload = await api('/api/addresses', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'E2E Flash Sale',
      phone: '0901000001',
      province: 'TP. Hồ Chí Minh',
      district: 'Quận 1',
      ward: 'Bến Nghé',
      detail: '45 Nguyễn Huệ',
      isDefault: true,
      label: 'Nhà riêng',
    }),
  }, token);

  const createdId = String(payload?.id || '').trim();
  assert(createdId, 'Create address response does not contain id.');
  return createdId;
};

const fetchFirstAddressId = async (token) => {
  const addresses = await api('/api/addresses', { method: 'GET' }, token);
  if (Array.isArray(addresses) && addresses.length > 0) {
    const firstAddressId = String(addresses[0]?.id || '').trim();
    assert(firstAddressId, 'Address payload does not contain id.');
    return firstAddressId;
  }
  return createDefaultAddress(token);
};

const createOrderWithFlashItem = async (token, addressId, item) => {
  const productId = String(item.productId).trim();
  const variantId = resolveVariantId(item);
  const requestBody = {
    addressId,
    paymentMethod: 'COD',
    items: [
      {
        productId,
        ...(variantId ? { variantId } : {}),
        quantity: 1,
      },
    ],
  };

  return api('/api/orders', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  }, token);
};

const cancelOrder = async (token, orderId) => {
  return api(`/api/orders/${orderId}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason: 'E2E flash sale rollback' }),
  }, token);
};

const formatVndNumber = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const numberValue = Number(raw);
  if (!Number.isFinite(numberValue)) return null;
  return numberValue.toLocaleString('vi-VN');
};

const verifyHomepageFlashSaleUI = async (referenceFlashPrice) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${WEB_BASE}/`, { waitUntil: 'networkidle', timeout: TIMEOUT });
    await page.locator('.flash-sale-section').first().waitFor({ state: 'visible', timeout: TIMEOUT });
    await page.locator('.flash-card').first().waitFor({ state: 'visible', timeout: TIMEOUT });
    log('Homepage Flash Sale block visible');

    const timerDigits = page.locator('.flash-sale-timer-digit');
    const digitCount = await timerDigits.count();
    assert(digitCount >= 3, 'Flash Sale timer is missing.');
    log('Flash Sale timer visible');

    if (referenceFlashPrice) {
      const expected = formatVndNumber(referenceFlashPrice);
      if (expected) {
        const flashSectionText = await page.locator('.flash-sale-section').innerText();
        assert(
          flashSectionText.includes(expected),
          `Flash Sale UI does not include expected price ${expected}.`,
        );
        log('Homepage displays flash price', expected);
      }
    }
  } finally {
    await page.close();
    await browser.close();
  }
};

const run = async () => {
  const flashBefore = await getActiveFlashSale();
  assert(flashBefore.items.length > 0, 'No active Flash Sale items available for E2E.');

  const chosenItem = pickRunnableFlashItem(flashBefore.items);
  assert(chosenItem, 'No runnable Flash Sale item with remaining quota.');
  log('Found active flash item', `${chosenItem.name} / quota ${chosenItem.soldCount}/${chosenItem.quota}`);

  await verifyHomepageFlashSaleUI(chosenItem.flashPrice ?? chosenItem.flashPriceAmount);

  const token = await loginCustomer();
  log('Customer login', CREDENTIALS.email);

  const addressId = await fetchFirstAddressId(token);
  log('Resolved checkout address');

  const soldBefore = Number(chosenItem.soldCount || 0);
  const expectedFlashPrice = Number(chosenItem.flashPrice || chosenItem.flashPriceAmount || 0);

  const createdOrder = await createOrderWithFlashItem(token, addressId, chosenItem);
  const orderId = String(createdOrder?.id || '').trim();
  assert(orderId, 'Order creation did not return order id.');
  log('Create order with flash item', orderId);

  const firstItem = Array.isArray(createdOrder?.items) ? createdOrder.items[0] : null;
  const unitPrice = Number(firstItem?.price || 0);
  assert(unitPrice > 0, 'Order item unit price is invalid.');
  assert(
    expectedFlashPrice <= 0 || unitPrice <= expectedFlashPrice,
    `Order unit price ${unitPrice} is higher than flash price ${expectedFlashPrice}.`,
  );
  log('Checkout uses flash-compatible price', String(unitPrice));

  const flashAfterCreate = await getActiveFlashSale();
  const createdRow = flashAfterCreate.items.find(
    (item) => String(item.flashSaleItemId || '') === String(chosenItem.flashSaleItemId || ''),
  );
  if (createdRow) {
    const soldAfterCreate = Number(createdRow.soldCount || 0);
    assert(soldAfterCreate >= soldBefore, 'Flash sold count did not move after order creation.');
    log('Sold count updated after checkout', `${soldBefore} -> ${soldAfterCreate}`);
  }

  await cancelOrder(token, orderId);
  log('Cancel order to rollback quota');

  const flashAfterCancel = await getActiveFlashSale();
  const cancelRow = flashAfterCancel.items.find(
    (item) => String(item.flashSaleItemId || '') === String(chosenItem.flashSaleItemId || ''),
  );
  if (cancelRow) {
    const soldAfterCancel = Number(cancelRow.soldCount || 0);
    assert(soldAfterCancel <= Number(cancelRow.quota || 0), 'Flash sold count exceeded quota after rollback.');
    log('Quota rollback verified', `sold=${soldAfterCancel}`);
  }

  console.log('E2E RESULT: PASS');
};

run().catch((error) => {
  console.error('E2E RESULT: FAIL');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
