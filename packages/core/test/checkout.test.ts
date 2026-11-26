import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createCheckout, openCheckout } from '../src/checkout';
import { CheckoutDismissedError, PaymentFailedError, RazorpayError } from '../src/errors';
import type { RazorpaySuccessResponse } from '../src/types';
import { createFakeRazorpay, failedResponse, successResponse } from './helpers';

let fake: ReturnType<typeof createFakeRazorpay>;
const options = { key: 'rzp_test_key', order_id: 'order_123' };

beforeEach(() => {
  fake = createFakeRazorpay();
  window.Razorpay = fake.Razorpay;
});

const lastInstance = () => fake.instances.at(-1)!;
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('createCheckout', () => {
  it('returns an unopened instance built with the given options', async () => {
    const instance = await createCheckout(options);
    expect(instance.get()).toEqual(options);
    expect(lastInstance().open).not.toHaveBeenCalled();
  });
});

describe('openCheckout', () => {
  it('opens Checkout and resolves with the success response', async () => {
    const handler = vi.fn();
    const promise = openCheckout({ ...options, handler });
    await flush();

    expect(lastInstance().open).toHaveBeenCalledOnce();
    lastInstance().succeed();

    await expect(promise).resolves.toEqual(successResponse);
    expect(handler).toHaveBeenCalledWith(successResponse);
    expectTypeOf(promise).resolves.toEqualTypeOf<RazorpaySuccessResponse>();
  });

  it('rejects with CheckoutDismissedError when closed without paying', async () => {
    const ondismiss = vi.fn();
    const promise = openCheckout({ ...options, modal: { ondismiss, escape: false } });
    await flush();

    expect(lastInstance().options.modal?.escape).toBe(false);
    lastInstance().dismiss();

    await expect(promise).rejects.toBeInstanceOf(CheckoutDismissedError);
    await expect(promise).rejects.toBeInstanceOf(RazorpayError);
    expect(ondismiss).toHaveBeenCalledOnce();
  });

  it('does not reject on a failed attempt, so the customer can retry', async () => {
    const onPaymentFailed = vi.fn();
    const promise = openCheckout({ ...options, onPaymentFailed });
    await flush();

    lastInstance().fail();
    expect(onPaymentFailed).toHaveBeenCalledWith(failedResponse);
    lastInstance().succeed();

    await expect(promise).resolves.toEqual(successResponse);
  });

  it('rejects with PaymentFailedError when closed after a failed attempt', async () => {
    const promise = openCheckout(options);
    await flush();

    lastInstance().fail();
    lastInstance().dismiss();

    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PaymentFailedError);
    expect((error as PaymentFailedError).details.code).toBe('BAD_REQUEST_ERROR');
    expect((error as PaymentFailedError).message).toBe('Card declined');
  });

  it('does not pass onPaymentFailed through to checkout.js', async () => {
    void openCheckout({ ...options, onPaymentFailed: () => {} });
    await flush();
    expect(lastInstance().options).not.toHaveProperty('onPaymentFailed');
  });

  it('supports subscription checkouts without an order_id', async () => {
    const promise = openCheckout({ key: 'rzp_test_key', subscription_id: 'sub_123' });
    await flush();
    lastInstance().succeed({
      razorpay_payment_id: 'pay_1',
      razorpay_subscription_id: 'sub_123',
      razorpay_signature: 'sig',
    });
    await expect(promise).resolves.toMatchObject({ razorpay_subscription_id: 'sub_123' });
  });
});
