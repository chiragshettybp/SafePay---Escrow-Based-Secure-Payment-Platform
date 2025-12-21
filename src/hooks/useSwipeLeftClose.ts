import { useMemo, useRef } from "react";
import type React from "react";

type Options = {
  enabled: boolean;
  onClose: () => void;
  thresholdPx?: number;
};

/**
 * Robust swipe-left-to-close handler for mobile sidebars.
 * Uses Pointer Events + touch-action for consistent behavior on iOS/Android.
 */
export function useSwipeLeftClose({ enabled, onClose, thresholdPx = 60 }: Options) {
  const start = useRef({ x: 0, y: 0 });
  const last = useRef({ x: 0, y: 0 });
  const active = useRef(false);

  return useMemo(
    () => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (!enabled || e.pointerType !== "touch") return;
        active.current = true;
        start.current = { x: e.clientX, y: e.clientY };
        last.current = { x: e.clientX, y: e.clientY };
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (!active.current || e.pointerType !== "touch") return;
        last.current = { x: e.clientX, y: e.clientY };
      },
      onPointerUp: (e: React.PointerEvent) => {
        if (!active.current || e.pointerType !== "touch") return;
        active.current = false;

        const dx = start.current.x - last.current.x;
        const dy = start.current.y - last.current.y;

        // Close only on a deliberate left swipe (avoid scroll/taps)
        if (dx > thresholdPx && Math.abs(dx) > Math.abs(dy) * 1.2) {
          onClose();
        }
      },
      onPointerCancel: () => {
        active.current = false;
      },
    }),
    [enabled, onClose, thresholdPx]
  );
}
