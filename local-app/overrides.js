// Block telemetry (Bugsnag, Google Tag Manager) and auto-dismiss consent
// modals. This file loads synchronously before the deferred main bundle, so
// the network shims are in place before any app code runs.

(function () {
  const BLOCKED_HOSTS = /(^|\.)(bugsnag\.com|googletagmanager\.com|google-analytics\.com)$/i;
  const isBlocked = url => {
    try {
      const u = new URL(url, location.href);
      return BLOCKED_HOSTS.test(u.hostname);
    } catch { return false; }
  };

  // fetch
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (isBlocked(url)) return Promise.resolve(new Response('', { status: 204 }));
    return origFetch.apply(this, arguments);
  };

  // XMLHttpRequest
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__blocked = isBlocked(url);
    return origOpen.apply(this, arguments);
  };
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (this.__blocked) return;
    return origSend.apply(this, arguments);
  };

  // sendBeacon
  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => isBlocked(url) ? true : origBeacon(url, data);
  }

  // <script src="..."> injected by GTM bootstrap. Intercept the src setter so
  // the network request never fires.
  const scriptSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
  if (scriptSrc && scriptSrc.set) {
    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
      configurable: true,
      enumerable: true,
      get: scriptSrc.get,
      set(value) {
        if (isBlocked(value)) return;
        return scriptSrc.set.call(this, value);
      },
    });
  }
})();

// Auto-dismiss consent modals by clicking their buttons, since the app
// gates rendering on the user's response (CSS hide leaves a blank page).
// Narrow selectors, no walk-up, no broad text matching.

(function () {
  const AUTO_CLICK = [
    // Product Usage Data consent — decline.
    { container: '[data-testid="usage-agreement-modal"]', button: '[data-testid="no-button"]' },
  ];

  const tryClick = () => {
    for (const { container, button } of AUTO_CLICK) {
      const root = document.querySelector(container);
      if (!root) continue;
      const btn = root.querySelector(button);
      if (btn) btn.click();
    }
  };

  const obs = new MutationObserver(tryClick);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  // Stop observing after 30s — these modals only appear at startup.
  setTimeout(() => obs.disconnect(), 30000);
})();
