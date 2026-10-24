import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCustomerLineItems } from '../invoices.js';

test('customer invoices show one line per experience, without a separate meal line', () => {
  const items = buildCustomerLineItems(
    { id: 'booking-1', adult_count: 2, child_count: 0, package_meal_price_usd: '40.00' },
    [
      { id: 'exp-1', package_name: 'Celestial Dining', base_total_usd: '185.00', meal_price_usd: '40.00' },
      { id: 'exp-2', package_name: 'Astro portrait', base_total_usd: '20.00' },
    ],
  );

  assert.deepEqual(items.map((item) => [item.description, item.amount_usd, item.item_type]), [
    ['Celestial Dining', 185, 'activity'],
    ['Astro portrait', 20, 'activity'],
  ]);
});
