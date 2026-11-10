# App Store screenshot workflow

1. Generate the local, deterministic fixture manifest: `node generate-demo-data.mjs`.
2. In an owner-approved **disposable staging account**, create the records through supported application/staging workflows. Do not use a real account, registration number, VIN, payment, or production entitlement.
3. Capture each authentic screen with `capture-raw.sh <UDID> <screen>` after navigating the running release-style build to it. Required names: `dashboard`, `expenses`, `reports`, `vehicle`, `reminders`, `documents`, `garage`.
4. Compose and validate only after all seven raw captures exist. The final screenshots must be opaque PNGs at the native accepted size for the simulator used.

For each device family run `./compose-set.sh iphone` or `./compose-set.sh ipad`, then `./validate-set.sh iphone` or `./validate-set.sh ipad`. Create a review image with `swift contact-sheet.swift ../final/iphone ../contact-sheet-iphone.png` (and the iPad equivalent).

Current Apple reference: <https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/>. iPhone screenshots require a Dynamic-Island display; iPadOS support requires at least one 13-inch iPad screenshot. The project supports iPad, so capture the same seven screens on an iPad Pro 13-inch (M5) simulator, adapting composition to its native aspect ratio.

`Plus documents` and `Family Shared Garage` must be captured only after Test Store entitlement and actual staging membership are visibly active. Do not stage UI states or fabricate a membership.
