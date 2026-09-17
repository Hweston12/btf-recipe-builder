import { describe, expect, it, vi } from "vitest";
import { blurNumberInputOnWheel } from "./blurNumberInputOnWheel";

describe("blurNumberInputOnWheel", () => {
  it("blurs the event's target element", () => {
    const blur = vi.fn();
    // Only currentTarget.blur is read by the handler.
    const event = { currentTarget: { blur } } as unknown as Parameters<
      typeof blurNumberInputOnWheel
    >[0];

    blurNumberInputOnWheel(event);

    expect(blur).toHaveBeenCalledOnce();
  });
});
