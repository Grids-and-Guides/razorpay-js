import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeRazorpay } from './helpers';

// The loader keeps module-level state, so import a fresh copy for every test.
async function importLoader() {
  return import('../src/load');
}

const scripts = () => document.head.querySelectorAll('script');

beforeEach(() => {
  vi.resetModules();
  document.head.innerHTML = '';
  delete window.Razorpay;
});

afterEach(() => {
  vi.useRealTimers();
});

function finishLoading(script: HTMLScriptElement) {
  window.Razorpay = createFakeRazorpay().Razorpay;
  script.dispatchEvent(new Event('load'));
}

describe('loadRazorpay', () => {
  it('injects checkout.js once and resolves with window.Razorpay', async () => {
    const { loadRazorpay, DEFAULT_SCRIPT_SRC } = await importLoader();

    const promise = loadRazorpay();
    expect(scripts()).toHaveLength(1);
    const script = scripts()[0]!;
    expect(script.src).toBe(DEFAULT_SCRIPT_SRC);
    expect(script.async).toBe(true);

    finishLoading(script);
    await expect(promise).resolves.toBe(window.Razorpay);
  });

  it('shares one script tag between concurrent calls', async () => {
    const { loadRazorpay } = await importLoader();

    const a = loadRazorpay();
    const b = loadRazorpay();
    expect(a).toBe(b);
    expect(scripts()).toHaveLength(1);

    finishLoading(scripts()[0]!);
    await expect(Promise.all([a, b])).resolves.toHaveLength(2);
  });

  it('resolves immediately when Razorpay is already on window', async () => {
    const { loadRazorpay } = await importLoader();
    window.Razorpay = createFakeRazorpay().Razorpay;

    await expect(loadRazorpay()).resolves.toBe(window.Razorpay);
    expect(scripts()).toHaveLength(0);
  });

  it('reuses a script tag that the app added itself', async () => {
    const { loadRazorpay, DEFAULT_SCRIPT_SRC } = await importLoader();
    const own = document.createElement('script');
    own.src = DEFAULT_SCRIPT_SRC;
    document.head.appendChild(own);

    const promise = loadRazorpay();
    expect(scripts()).toHaveLength(1);
    finishLoading(own);
    await expect(promise).resolves.toBeDefined();
  });

  it('applies custom src and CSP nonce', async () => {
    const { loadRazorpay } = await importLoader();
    void loadRazorpay({ src: 'https://example.com/checkout.js', nonce: 'abc' }).catch(() => {});

    const script = scripts()[0]!;
    expect(script.src).toBe('https://example.com/checkout.js');
    expect(script.nonce).toBe('abc');
  });

  it('rejects with RazorpayLoadError on network error, then retries on the next call', async () => {
    const { loadRazorpay } = await importLoader();
    const { RazorpayLoadError } = await import('../src/errors');

    const first = loadRazorpay();
    scripts()[0]!.dispatchEvent(new Event('error'));
    await expect(first).rejects.toBeInstanceOf(RazorpayLoadError);
    expect(scripts()).toHaveLength(0);

    const second = loadRazorpay();
    expect(second).not.toBe(first);
    finishLoading(scripts()[0]!);
    await expect(second).resolves.toBeDefined();
  });

  it('rejects when the script loads but does not define window.Razorpay', async () => {
    const { loadRazorpay } = await importLoader();

    const promise = loadRazorpay();
    scripts()[0]!.dispatchEvent(new Event('load'));
    await expect(promise).rejects.toThrow(/window\.Razorpay is not defined/);
  });

  it('rejects after the timeout', async () => {
    vi.useFakeTimers();
    const { loadRazorpay } = await importLoader();

    const promise = loadRazorpay({ timeoutMs: 1000 });
    vi.advanceTimersByTime(1000);
    await expect(promise).rejects.toThrow(/Timed out after 1000ms/);
  });
});

describe('getRazorpay / isBrowser', () => {
  it('reflects window state', async () => {
    const { getRazorpay, isBrowser } = await importLoader();
    expect(isBrowser()).toBe(true);
    expect(getRazorpay()).toBeUndefined();
    window.Razorpay = createFakeRazorpay().Razorpay;
    expect(getRazorpay()).toBe(window.Razorpay);
  });
});
