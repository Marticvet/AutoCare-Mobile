# App Store screenshot workflow

1. Generate the local, deterministic fixture manifest: `node generate-demo-data.mjs`.
2. In an owner-approved **disposable staging account**, create the records through supported application/staging workflows. Do not use a real account, registration number, VIN, payment, or production entitlement.
3. Capture each authentic screen with `capture-raw.sh <UDID> <screen>` after navigating the running release-style build to it. Required names: `dashboard`, `expenses`, `reports`, `vehicle`, `reminders`, `documents`, `garage`.
4. Compose and validate only after all seven raw captures exist. The final screenshots must be opaque PNGs at the native accepted size for the simulator used.

For each device family run `./compose-set.sh iphone` or `./compose-set.sh ipad`, then `./validate-set.sh iphone` or `./validate-set.sh ipad`. Create a review image with `swift contact-sheet.swift ../final/iphone ../contact-sheet-iphone.png` (and the iPad equivalent).

Current Apple reference: <https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/>. iPhone screenshots require a Dynamic-Island display; iPadOS support requires at least one 13-inch iPad screenshot. The project supports iPad, so capture the same seven screens on an iPad Pro 13-inch (M5) simulator, adapting composition to its native aspect ratio.

## Release-candidate marketing set

The v1 release-candidate workflow keeps each application language, device, and stage separate under `release-v1/<locale>/<device>/{raw,final}`. Compose a verified six-image set with:

```bash
node compose-release-set.mjs en iphone
node compose-release-set.mjs en ipad
```

The iPhone 17 Pro Max export is 1320 × 2868 and the iPad Pro 13-inch export is 2064 × 2752. `marketing-copy.json` contains reviewed layout copy for every in-app locale, but a locale may be composed only after all six raw captures show the app in that same language. Never place localized marketing text over an English application capture.

`Plus documents` and `Family Shared Garage` must be captured only after Test Store entitlement and actual staging membership are visibly active. Do not stage UI states or fabricate a membership.
