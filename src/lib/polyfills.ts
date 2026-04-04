/**
 * Polyfills for browser APIs needed by pdf-parse in Node.js environment
 */
export function setupPdfPolyfills() {
  if (typeof (global as any).DOMMatrix === 'undefined') {
    (global as any).DOMMatrix = class DOMMatrix {
      constructor() {}
      get is2D() { return true; }
      get isIdentity() { return true; }
    };
  }
  if (typeof (global as any).Path2D === 'undefined') {
    (global as any).Path2D = class Path2D { constructor() {} };
  }
  if (typeof (global as any).DOMPoint === 'undefined') {
    (global as any).DOMPoint = class DOMPoint { constructor() {} };
  }
}
