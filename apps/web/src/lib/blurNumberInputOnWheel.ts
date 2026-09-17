import type { WheelEvent } from "react";

/**
 * A number input's value changes when the user scrolls over it while it's
 * focused — a native browser behavior that has nothing to do with the
 * spinner arrows (removed globally in globals.css) and isn't affected by
 * removing them. Clicking into a field, entering a value, then scrolling the
 * page without first clicking elsewhere silently changes what was just
 * typed. Pass this as the input's onWheel handler: it blurs the field so the
 * scroll just scrolls the page, and the value can only be changed by typing.
 */
export function blurNumberInputOnWheel(event: WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur();
}
