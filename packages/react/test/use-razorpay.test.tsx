import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CheckoutDismissedError, RazorpayLoadError } from '@razorpay-js/core';
import { createFakeRazorpay, successResponse } from '../../core/test/helpers';
import { useRazorpay } from '../src/use-razorpay';

const scripts = () => document.head.querySelectorAll('script');

function finishLoading() {
  const fake = createFakeRazorpay();
  window.Razorpay = fake.Razorpay;
  act(() => {
    scripts()[0]!.dispatchEvent(new Event('load'));
  });
  return fake;
}

function failLoading() {
  act(() => {
    scripts()[0]!.dispatchEvent(new Event('error'));
  });
}

beforeEach(() => {
  document.head.innerHTML = '';
  delete window.Razorpay;
});

// The loader shares one in-flight load across the whole app (by design), so finish any load
// a test left pending. Otherwise the next test would reuse it.
afterEach(async () => {
  cleanup();
  window.Razorpay ??= createFakeRazorpay().Razorpay;
  scripts().forEach((s) => s.dispatchEvent(new Event('load')));
  await Promise.resolve();
});

describe('useRazorpay', () => {
  it('loads on mount and becomes ready', async () => {
    const { result } = renderHook(() => useRazorpay());
    expect(result.current.status).toBe('loading');
    expect(result.current.isReady).toBe(false);

    finishLoading();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.isReady).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('injects only one script with many components and StrictMode double-mounting', () => {
    function Button() {
      const { isReady } = useRazorpay();
      return <button disabled={!isReady}>Pay</button>;
    }
    render(
      <StrictMode>
        <Button />
        <Button />
        <Button />
      </StrictMode>,
    );
    expect(scripts()).toHaveLength(1);
  });

  it('enables the button once loaded', async () => {
    function Button() {
      const { isReady } = useRazorpay();
      return <button disabled={!isReady}>Pay</button>;
    }
    render(<Button />);
    expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(true);
    finishLoading();
    await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(false));
  });

  it('is immediately ready on later mounts once checkout.js is loaded', async () => {
    window.Razorpay = createFakeRazorpay().Razorpay;
    const { result } = renderHook(() => useRazorpay());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(scripts()).toHaveLength(0);
  });

  it('reports load errors instead of alerting, and load() retries', async () => {
    const { result } = renderHook(() => useRazorpay());
    failLoading();

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeInstanceOf(RazorpayLoadError);

    let retry!: Promise<unknown>;
    act(() => {
      retry = result.current.load();
    });
    expect(result.current.status).toBe('loading');
    finishLoading();
    await act(() => retry);
    expect(result.current.status).toBe('ready');
  });

  it('with loadOnMount: false, waits until openCheckout is called', async () => {
    const { result } = renderHook(() => useRazorpay({ loadOnMount: false }));
    expect(result.current.status).toBe('idle');
    expect(scripts()).toHaveLength(0);

    let payment!: Promise<unknown>;
    act(() => {
      payment = result.current.openCheckout({ key: 'rzp_test', order_id: 'order_1' });
    });
    expect(scripts()).toHaveLength(1);

    const fake = finishLoading();
    await waitFor(() => expect(fake.instances).toHaveLength(1));
    fake.instances[0]!.succeed();
    await expect(payment).resolves.toEqual(successResponse);
    expect(result.current.status).toBe('ready');
  });

  it('openCheckout rejects with CheckoutDismissedError when the customer closes Checkout', async () => {
    const fake = createFakeRazorpay();
    window.Razorpay = fake.Razorpay;
    const { result } = renderHook(() => useRazorpay());

    let payment!: Promise<unknown>;
    act(() => {
      payment = result.current.openCheckout({ key: 'rzp_test', order_id: 'order_1' });
    });
    await waitFor(() => expect(fake.instances).toHaveLength(1));
    fake.instances[0]!.dismiss();
    await expect(payment).rejects.toBeInstanceOf(CheckoutDismissedError);
  });

  it('does not update state after unmount', async () => {
    const { result, unmount } = renderHook(() => useRazorpay());
    unmount();
    finishLoading();
    expect(result.current.status).toBe('loading');
  });
});
