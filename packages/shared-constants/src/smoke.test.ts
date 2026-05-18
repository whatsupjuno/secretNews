import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { SERVICE_NAME } from './index.js';

test('exports service name', () => {
  assert.equal(SERVICE_NAME, 'secretNewsService');
});
