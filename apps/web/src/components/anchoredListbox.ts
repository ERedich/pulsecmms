import { useLayoutEffect, useState, type RefObject } from "react";

export type AnchoredListbox = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

const LIST_MAX = 240;
const GAP = 4;

/** Fixed position for a listbox so it is not clipped by overflow:hidden ancestors. */
export function useAnchoredListbox(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
): AnchoredListbox | null {
  const [box, setBox] = useState<AnchoredListbox | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!open || !anchor) {
      setBox(null);
      return;
    }

    function update() {
      const node = anchorRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - GAP;
      const spaceAbove = rect.top - GAP;
      const openUp = spaceBelow < LIST_MAX && spaceAbove > spaceBelow;
      const available = openUp ? spaceAbove : spaceBelow;
      setBox({
        top: openUp ? rect.top - GAP : rect.bottom + GAP,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(LIST_MAX, Math.max(120, available)),
        openUp,
      });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef]);

  return box;
}
