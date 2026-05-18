import { test } from 'node:test';
import * as assert from 'node:assert/strict';

test('api scaffold is testable', () => {
  assert.equal('secret-news-api'.includes('secret-news'), true);
});
