import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
if (typeof window !== "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: window.localStorage,
    configurable: true,
  });
}
afterEach(() => {
  cleanup();
  if (typeof window !== "undefined") window.localStorage.clear();
});
