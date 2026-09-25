const ROUTES = Object.freeze({
  demo: Object.freeze({ partial: 'pages/demo.html?release=20260925-clarify-2', module: './demo-page.mjs?release=20260924-distill-23' }),
  live: Object.freeze({ partial: 'pages/live.html?release=20260925-clarify-2', module: './live-page.mjs?release=20260925-seeded-frame-1' }),
  presenter: Object.freeze({ partial: 'pages/presenter.html?release=20260925-clarify-2', module: './presenter-page.mjs?release=20260924-distill-23' }),
});
export function createRouter({ outlet, context, onRouteChange }) {
  let unmount = () => {};
  let requestNumber = 0;

  async function loadRoute() {
    const routeName = location.hash.slice(1).split('/')[0];
    const route = ROUTES[routeName] ? routeName : 'demo';
    if (routeName !== route) history.replaceState(null, '', `#${route}`);
    const activeRequest = ++requestNumber;
    const response = await fetch(ROUTES[route].partial);
    if (!response.ok) throw new Error(`Could not load ${route} page`);
    const markup = await response.text();
    const pageModule = await import(ROUTES[route].module);
    if (activeRequest !== requestNumber) return;
    unmount();
    outlet.innerHTML = markup;
    onRouteChange(route, outlet);
    unmount = pageModule.mount(outlet, context) ?? (() => {});
    outlet.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  window.addEventListener('hashchange', loadRoute);
  loadRoute().catch((error) => {
    outlet.innerHTML = `<p class="fatal-error">${error.message}. Reload the localhost page and try again.</p>`;
  });

  return () => {
    window.removeEventListener('hashchange', loadRoute);
    unmount();
  };
}
