const assert = require('assert');

// self-check: hitung kalkulasi order jastip dan format pesan wa
function calculateOrder(items) {
  const totalBarang = items.reduce((sum, c) => sum + c.price * c.qty, 0);
  const totalFee = items.reduce((sum, c) => sum + c.fee * c.qty, 0);
  const grandTotal = totalBarang + totalFee;
  return { totalBarang, totalFee, grandTotal };
}

const mockCart = [
  { name: 'KAWS Tee', price: 199000, fee: 25000, qty: 2 },
  { name: 'Labubu Blind Box', price: 349000, fee: 45000, qty: 1 }
];

const res = calculateOrder(mockCart);
assert.strictEqual(res.totalBarang, 199000 * 2 + 349000);
assert.strictEqual(res.totalFee, 25000 * 2 + 45000);
assert.strictEqual(res.grandTotal, (199000 + 25000) * 2 + (349000 + 45000));

console.log('Order calculation check: PASSED');
