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
