import { describe, it, expect } from "vitest";
import { guestOrderMatches, normalizePostcode } from "@/lib/guest-order-match";

const realOrder = {
  email: "Jane.Doe@Example.com",
  shippingAddress: { zip: "SW1A 1AA" },
};

describe("normalizePostcode", () => {
  it("uppercases and strips whitespace", () => {
    expect(normalizePostcode("sw1a 1aa")).toBe("SW1A1AA");
    expect(normalizePostcode("  SW1A   1AA  ")).toBe("SW1A1AA");
  });
});

describe("guestOrderMatches — the second factor beyond email", () => {
  it("matches when both email and postcode are correct (any casing/spacing)", () => {
    expect(guestOrderMatches(realOrder, "jane.doe@example.com", "SW1A 1AA")).toBe(true);
    expect(guestOrderMatches(realOrder, "JANE.DOE@EXAMPLE.COM", "sw1a1aa")).toBe(true);
    expect(guestOrderMatches(realOrder, "jane.doe@example.com", "  sw1a   1aa ")).toBe(true);
  });

  it("rejects correct email but WRONG postcode — proves postcode is enforced, not decorative", () => {
    expect(guestOrderMatches(realOrder, "jane.doe@example.com", "EC1A 1BB")).toBe(false);
  });

  it("rejects correct postcode but wrong email", () => {
    expect(guestOrderMatches(realOrder, "someone-else@example.com", "SW1A 1AA")).toBe(false);
  });

  it("rejects when both are wrong", () => {
    expect(guestOrderMatches(realOrder, "attacker@evil.com", "00000")).toBe(false);
  });

  it("rejects an empty/missing candidate postcode", () => {
    expect(guestOrderMatches(realOrder, "jane.doe@example.com", "")).toBe(false);
  });

  it("rejects when the order has no email on file", () => {
    expect(guestOrderMatches({ email: null, shippingAddress: { zip: "SW1A 1AA" } }, "jane.doe@example.com", "SW1A 1AA")).toBe(false);
  });

  it("rejects when the order has no shipping postcode on file (e.g. digital order)", () => {
    expect(guestOrderMatches({ email: "jane.doe@example.com", shippingAddress: null }, "jane.doe@example.com", "SW1A 1AA")).toBe(false);
  });

  it("rejects a null order (no matching order number found)", () => {
    expect(guestOrderMatches(null, "jane.doe@example.com", "SW1A 1AA")).toBe(false);
  });
});
