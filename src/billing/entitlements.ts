export const ENTITLEMENTS = {
    plusFeatures: "plus_features",
    sharedGarage: "shared_garage",
} as const;

export type EntitlementId = (typeof ENTITLEMENTS)[keyof typeof ENTITLEMENTS];
