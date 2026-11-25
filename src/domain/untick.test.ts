import { untickNeedsConfirm } from './untick';

const build = (trackingType: 'duration' | 'quantity' | 'check', target = 15, minimum: number | null = 5) => ({
  build: { trackingType, target, unit: 'min', minimum, minimumLabel: null },
});
const log = (status: 'full' | 'minimum' | 'partial' | 'skipped', value: number | null, note: string | null = null) => ({ status, value, note });

test('a plain tick is removed without asking', () => {
  expect(untickNeedsConfirm(log('full', 15), build('duration'))).toBe(false);
  expect(untickNeedsConfirm(log('full', null), build('check'))).toBe(false);
  expect(untickNeedsConfirm(log('minimum', 5), build('duration'))).toBe(false);
  expect(untickNeedsConfirm(log('skipped', null), build('duration'))).toBe(false);
});

test('asks when a note or a custom amount would be lost', () => {
  expect(untickNeedsConfirm(log('full', 15, 'Felt great'), build('duration'))).toBe(true);
  expect(untickNeedsConfirm(log('full', 25), build('duration'))).toBe(true);
  expect(untickNeedsConfirm(log('partial', 8), build('quantity'))).toBe(true);
  expect(untickNeedsConfirm(log('minimum', 7), build('duration'))).toBe(true);
  expect(untickNeedsConfirm(log('full', null, '  '), build('check'))).toBe(false);
});
