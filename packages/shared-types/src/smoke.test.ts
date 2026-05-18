import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import type { ApiHealth } from './index.js';

test('api health type shape', () => {
  const value: ApiHealth = { status: 'ok', service: 'secret-news-api' };
  assert.equal(value.status, 'ok');
});
