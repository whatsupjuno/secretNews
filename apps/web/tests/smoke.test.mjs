import test from 'node:test';
import assert from 'node:assert/strict';

test('web scaffold is testable', () => {
  assert.equal('secretNewsService'.startsWith('secret'), true);
});
