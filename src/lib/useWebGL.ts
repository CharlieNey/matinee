"use client";

import { useSyncExternalStore } from "react";

let cached: boolean | null = null;

function webglSupported(): boolean {
  if (cached === null) {
    try {
      const canvas = document.createElement("canvas");
      cached = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      cached = false;
    }
  }
  return cached;
}

const subscribe = () => () => {};

/**
 * True once the client confirms WebGL support; false on the server and in
 * browsers without GL. Shader surfaces must check this before mounting a
 * canvas — @paper-design/shaders-react throws an *unhandled* promise
 * rejection when WebGL is missing, so DESIGN.md §11's "degrades gracefully"
 * only holds if the canvas never mounts.
 */
export function useWebGL(): boolean {
  return useSyncExternalStore(subscribe, webglSupported, () => false);
}
