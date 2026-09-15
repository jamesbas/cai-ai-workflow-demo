import { describe, expect, it } from "vitest";
import { SEED_ASSETS, SEED_VENDORS } from "@/lib/db/seed";
import {
  matchAsset,
  normalizeCategory,
  selectVendor,
  warrantyActive,
} from "@/lib/workflow/routing";
import type { Vendor } from "@/lib/types";

const vendorById = (id: string): Vendor | undefined =>
  SEED_VENDORS.find((vendor) => vendor.id === id);
const vendorByCategory = (category: string): Vendor | undefined =>
  SEED_VENDORS.find((vendor) => vendor.category === category && vendor.approved === 1);

const asOf = new Date("2026-09-15T12:00:00Z");

describe("category normalization", () => {
  it("accepts the canonical values", () => {
    expect(normalizeCategory("POOL_GATE")).toBe("POOL_GATE");
    expect(normalizeCategory("IRRIGATION_LEAK")).toBe("IRRIGATION_LEAK");
    expect(normalizeCategory("SITE_LIGHTING")).toBe("SITE_LIGHTING");
  });

  it("maps loose model wording onto known categories", () => {
    expect(normalizeCategory("pool gate latch failure")).toBe("POOL_GATE");
    expect(normalizeCategory("water leak")).toBe("IRRIGATION_LEAK");
    expect(normalizeCategory("exterior lighting")).toBe("SITE_LIGHTING");
    expect(normalizeCategory("")).toBe("UNKNOWN");
    expect(normalizeCategory("fence panel")).toBe("GENERAL_MAINTENANCE");
  });
});

describe("asset matching", () => {
  it("matches the keynote pool gate", () => {
    const result = matchAsset(SEED_ASSETS, {
      issueCategory: "POOL_GATE",
      assetType: "pool_gate",
      locationHint: "East Pool Entrance",
      submittedLocation: "East Pool Entrance",
    });
    expect(result.asset?.id).toBe("PG-002");
  });

  it("matches the irrigation and lighting scenarios", () => {
    expect(
      matchAsset(SEED_ASSETS, {
        issueCategory: "IRRIGATION_LEAK",
        assetType: "irrigation",
        locationHint: "Greenway near Lot 42",
        submittedLocation: "Greenway near Lot 42",
      }).asset?.id,
    ).toBe("IRR-014");

    expect(
      matchAsset(SEED_ASSETS, {
        issueCategory: "SITE_LIGHTING",
        assetType: "site_light",
        locationHint: "East Walking Trail",
        submittedLocation: "East Walking Trail",
      }).asset?.id,
    ).toBe("LIGHT-009");
  });

  it("falls back to location tokens when the category is unknown", () => {
    const result = matchAsset(SEED_ASSETS, {
      issueCategory: "UNKNOWN",
      assetType: null,
      locationHint: null,
      submittedLocation: "East Walking Trail",
    });
    expect(result.asset?.id).toBe("LIGHT-009");
    expect(result.method).toContain("location");
  });

  it("returns no match when nothing is comparable", () => {
    const result = matchAsset(SEED_ASSETS, {
      issueCategory: "GENERAL_MAINTENANCE",
      assetType: "mailbox",
      locationHint: "Clubhouse basement",
      submittedLocation: "Clubhouse basement",
    });
    expect(result.asset).toBeNull();
  });
});

describe("warranty evaluation", () => {
  it("treats a future expiration as active", () => {
    expect(warrantyActive("2027-05-31", asOf)).toBe(true);
  });

  it("treats a past or missing expiration as inactive", () => {
    expect(warrantyActive("2025-01-01", asOf)).toBe(false);
    expect(warrantyActive(null, asOf)).toBe(false);
  });
});

describe("vendor routing", () => {
  const poolGate = SEED_ASSETS.find((asset) => asset.id === "PG-002")!;
  const irrigation = SEED_ASSETS.find((asset) => asset.id === "IRR-014")!;

  it("prefers the active warranty provider", () => {
    const route = selectVendor(poolGate, vendorById, vendorByCategory, "POOL_GATE", asOf);
    expect(route.vendor?.id).toBe("VEND-001");
    expect(route.reason).toContain("warranty");
  });

  it("falls back to the asset preferred vendor when the warranty has lapsed", () => {
    const expired = { ...poolGate, warranty_expiration: "2024-01-01" };
    const route = selectVendor(expired, vendorById, vendorByCategory, "POOL_GATE", asOf);
    expect(route.vendor?.id).toBe("VEND-002");
    expect(route.reason).toContain("Preferred");
  });

  it("uses the asset preferred vendor when there is no warranty at all", () => {
    const route = selectVendor(irrigation, vendorById, vendorByCategory, "IRRIGATION_LEAK", asOf);
    expect(route.vendor?.id).toBe("VEND-003");
  });

  it("falls back to the approved category vendor when no asset matched", () => {
    const route = selectVendor(null, vendorById, vendorByCategory, "SITE_LIGHTING", asOf);
    expect(route.vendor?.id).toBe("VEND-004");
  });

  it("never routes to an unapproved vendor", () => {
    const unapproved = (id: string): Vendor | undefined => {
      const vendor = vendorById(id);
      return vendor ? { ...vendor, approved: 0 } : undefined;
    };
    const route = selectVendor(poolGate, unapproved, () => undefined, "POOL_GATE", asOf);
    expect(route.vendor).toBeNull();
  });
});
