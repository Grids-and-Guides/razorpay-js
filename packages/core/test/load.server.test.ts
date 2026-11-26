// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RazorpayLoadError } from '../src/errors';
import { getRazorpay, isBrowser, loadRazorpay } from '../src/load';

describe('on the server', () => {
  it('does nothing and rejects with RazorpayLoadError', async () => {
    expect(isBrowser()).toBe(false);
    expect(getRazorpay()).toBeUndefined();
    await expect(loadRazorpay()).rejects.toBeInstanceOf(RazorpayLoadError);
  });
});
