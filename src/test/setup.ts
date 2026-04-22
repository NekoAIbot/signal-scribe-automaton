import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Force a 360px viewport for mobile-responsive assertions
Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 360 });
Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });

// jsdom doesn't implement these
if (!('IntersectionObserver' in window)) {
  // @ts-expect-error - test shim
  window.IntersectionObserver = class {
    observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
  };
}
