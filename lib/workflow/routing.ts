import {
  findApprovedVendorByCategory,
  getAsset,
  getMaintenanceHistory,
  getSlaForCategory,
  getVendor,
  listApprovedVendors,
  listAssets,
} from "@/lib/db/repositories";
import type { Asset, AssociationContext, IssueCategory, Vendor } from "@/lib/types";

export const ISSUE_CATEGORIES: IssueCategory[] = [
  "POOL_GATE",
  "IRRIGATION_LEAK",
  "SITE_LIGHTING",
  "GENERAL_MAINTENANCE",
];

const CATEGORY_TO_ASSET_TYPE: Record<string, string> = {
  POOL_GATE: "pool_gate",
  IRRIGATION_LEAK: "irrigation",
  SITE_LIGHTING: "site_light",
};

const CATEGORY_TO_VENDOR_CATEGORY: Record<string, string> = {
  POOL_GATE: "GATE_AND_ACCESS",
  IRRIGATION_LEAK: "IRRIGATION",
  SITE_LIGHTING: "ELECTRICAL",
  GENERAL_MAINTENANCE: "GENERAL_MAINTENANCE",
};

export function normalizeCategory(raw: string | null | undefined): IssueCategory {
  const value = (raw ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if ((ISSUE_CATEGORIES as string[]).includes(value)) return value as IssueCategory;
  if (value.includes("GATE") || value.includes("POOL")) return "POOL_GATE";
  if (value.includes("IRRIGATION") || value.includes("LEAK") || value.includes("WATER")) {
    return "IRRIGATION_LEAK";
  }
  if (value.includes("LIGHT") || value.includes("ELECTRIC")) return "SITE_LIGHTING";
  if (value === "" || value === "UNKNOWN") return "UNKNOWN";
  return "GENERAL_MAINTENANCE";
}

export function normalizeAssetType(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function locationScore(assetLocation: string, hints: string[]): number {
  const assetTokens = new Set(tokenize(assetLocation));
  let score = 0;
  for (const hint of hints) {
    for (const token of tokenize(hint)) {
      if (assetTokens.has(token)) score += 1;
    }
  }
  return score;
}

export interface AssetMatchInput {
  issueCategory: IssueCategory;
  assetType: string | null;
  locationHint: string | null;
  submittedLocation: string;
}

export interface AssetMatchResult {
  asset: Asset | null;
  method: string;
}

/** Deterministic: category first, then asset type, then location token overlap. */
export function matchAsset(assets: Asset[], input: AssetMatchInput): AssetMatchResult {
  const hints = [input.locationHint ?? "", input.submittedLocation].filter(Boolean);
  const targetType =
    CATEGORY_TO_ASSET_TYPE[input.issueCategory] ?? normalizeAssetType(input.assetType);

  const byType = targetType
    ? assets.filter((asset) => normalizeAssetType(asset.asset_type) === targetType)
    : [];

  const pickBest = (candidates: Asset[], method: string): AssetMatchResult | null => {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) {
      return { asset: candidates[0] ?? null, method };
    }
    const ranked = [...candidates].sort((a, b) => {
      const diff = locationScore(b.location, hints) - locationScore(a.location, hints);
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });
    return { asset: ranked[0] ?? null, method: `${method} + location match` };
  };

  const typeMatch = pickBest(byType, "asset type match");
  if (typeMatch) return typeMatch;

  const locationMatches = assets.filter((asset) => locationScore(asset.location, hints) > 0);
  const locationMatch = pickBest(locationMatches, "location match");
  if (locationMatch) return locationMatch;

  return { asset: null, method: "no match" };
}

export function warrantyActive(expiration: string | null, asOf: Date = new Date()): boolean {
  if (!expiration) return false;
  const expires = Date.parse(`${expiration}T23:59:59Z`);
  return Number.isFinite(expires) && expires >= asOf.getTime();
}

export interface VendorRoute {
  vendor: Vendor | null;
  reason: string;
}

/**
 * Vendor selection is an application rule, never a model output:
 * active warranty provider, then asset preferred vendor, then approved
 * vendor for the issue category.
 */
export function selectVendor(
  asset: Asset | null,
  lookupVendor: (id: string) => Vendor | undefined,
  lookupCategoryVendor: (category: string) => Vendor | undefined,
  issueCategory: IssueCategory,
  asOf: Date = new Date(),
): VendorRoute {
  if (asset?.warranty_vendor_id && warrantyActive(asset.warranty_expiration, asOf)) {
    const vendor = lookupVendor(asset.warranty_vendor_id);
    if (vendor?.approved) {
      return { vendor, reason: "Active warranty provider for the matched asset." };
    }
  }

  if (asset?.preferred_vendor_id) {
    const vendor = lookupVendor(asset.preferred_vendor_id);
    if (vendor?.approved) {
      return { vendor, reason: "Preferred vendor recorded on the matched asset." };
    }
  }

  const vendorCategory = CATEGORY_TO_VENDOR_CATEGORY[issueCategory] ?? "GENERAL_MAINTENANCE";
  const categoryVendor = lookupCategoryVendor(vendorCategory);
  if (categoryVendor) {
    return { vendor: categoryVendor, reason: `Approved ${vendorCategory} vendor for this issue category.` };
  }

  return { vendor: null, reason: "No approved vendor matched; manager routing required." };
}

const CONTEXT_EXCLUDED = [
  "Resident financial records",
  "Unrelated resident records",
  "Legal correspondence",
  "Executive-session material",
  "Violation and enforcement history",
  "Unrelated community data",
];

export function buildAssociationContext(input: AssetMatchInput): AssociationContext {
  const match = matchAsset(listAssets(), input);
  const asset = match.asset;
  const history = asset ? getMaintenanceHistory(asset.id, 3) : [];
  const sla = getSlaForCategory(input.issueCategory) ?? getSlaForCategory("GENERAL_MAINTENANCE") ?? null;
  const isWarrantyActive = warrantyActive(asset?.warranty_expiration ?? null);
  const warrantyVendor = asset?.warranty_vendor_id ? getVendor(asset.warranty_vendor_id) : undefined;

  const route = selectVendor(
    asset,
    (id) => getVendor(id),
    (category) => findApprovedVendorByCategory(category),
    input.issueCategory,
  );

  const contextUsed = [
    "Submitted photo",
    "Resident's note",
    `Submitted location: ${input.submittedLocation}`,
  ];
  if (asset) {
    contextUsed.push(`Matched asset ${asset.id} — ${asset.name}`);
    contextUsed.push(`Last ${history.length} maintenance record(s) for ${asset.id}`);
    contextUsed.push(
      asset.warranty_expiration
        ? `${asset.id} warranty details (expires ${asset.warranty_expiration})`
        : `${asset.id} warranty details (no warranty on file)`,
    );
  }
  if (sla) contextUsed.push(`Applicable maintenance SLA: ${sla.id}`);
  contextUsed.push("Approved maintenance-vendor routing data");

  return {
    asset,
    matchMethod: match.method,
    warranty: {
      vendorId: asset?.warranty_vendor_id ?? null,
      vendorName: warrantyVendor?.name ?? null,
      expiration: asset?.warranty_expiration ?? null,
      active: isWarrantyActive,
    },
    maintenanceHistory: history,
    sla,
    approvedVendors: listApprovedVendors(),
    recommendedVendorId: route.vendor?.id ?? null,
    recommendedVendorName: route.vendor?.name ?? null,
    routingReason: route.reason,
    contextUsed,
    contextExcluded: CONTEXT_EXCLUDED,
  };
}

export function getAssetOrNull(id: string | null): Asset | null {
  return id ? (getAsset(id) ?? null) : null;
}
