import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  // Saved history must not leak between tests
  localStorage.clear();
});

// jsdom does not implement scrolling
window.scrollTo = () => {};
