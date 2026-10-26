/// <reference types="@testing-library/jest-dom/vitest" />
import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.IntersectionObserver = MockIntersectionObserver as any;
  (global as any).IntersectionObserver = MockIntersectionObserver;
}
