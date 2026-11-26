import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RazorpayLoadError } from '@razorpay-js/core';
import { createFakeRazorpay } from '../../core/test/helpers';
import { Razorpay } from '../src/legacy';

beforeEach(() => {
  delete window.Razorpay;
});

describe('legacy Razorpay class', () => {
  it('throws a clear error instead of crashing when checkout.js is not loaded', () => {
    expect(() => new Razorpay({ key: 'k', order_id: 'order_1' })).toThrow(RazorpayLoadError);
  });

  it('delegates to window.Razorpay and accepts subscriptions', () => {
    const fake = createFakeRazorpay();
    window.Razorpay = fake.Razorpay;

    const rz = new Razorpay({ key: 'k', subscription_id: 'sub_1' });
    const onFail = vi.fn();
    rz.on('payment.failed', onFail);
    rz.open();
    rz.close();

    const instance = fake.instances[0]!;
    expect(instance.open).toHaveBeenCalledOnce();
    expect(instance.close).toHaveBeenCalledOnce();
    expect(rz.get()).toEqual({ key: 'k', subscription_id: 'sub_1' });
    expect(rz.getMode()).toBe('test');
    instance.fail();
    expect(onFail).toHaveBeenCalledOnce();
  });
});
