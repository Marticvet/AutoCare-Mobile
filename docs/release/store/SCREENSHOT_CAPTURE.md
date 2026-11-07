# Screenshot capture workflow

One real screenshot was captured without fabrication: `ios-iphone-17-pro-launch.png`. It is a sanitized AutoCare Hub launch/login screen from an iPhone 17 Pro simulator, 1206 × 2622 PNG, with no personal data or debug overlays. This dimension is accepted for the current 6.3-inch iPhone screenshot class; reconfirm the current App Store Connect requirements immediately before upload.

Authenticated screens remain intentionally uncaptured because no sanitized demo account was available. Capture only real release-candidate screens with representative, non-personal data.

## Proposed sequence

1. Dashboard with representative totals and one or more vehicles.
2. Vehicles list and vehicle detail.
3. Expense tracking or expense detail.
4. Reminder list/detail with a real scheduled reminder.
5. Documents/trips/reports feature that is enabled in the candidate.
6. Optional subscription screen showing an actual configured offering; do not use placeholder pricing.

## Manual simulator workflow

1. Use Xcode 26+ and a current iPhone simulator matching the store’s current accepted display class.
2. Run the signed/release-candidate app, sign into a sanitized demo account, and turn off developer overlays.
3. Capture with Xcode Devices and Simulators or `xcrun simctl io booted screenshot <path>.png`.
4. Inspect every image at native dimensions: no alpha/transparency, no status/debug overlays, no credentials, personal data, mock prices, or unsupported features.
5. Upload only dimensions/formats currently requested by the store console. Recheck Apple’s current screenshot specifications immediately before upload.

Use the same flow for Android listing screenshots, adapting the target device requirements in Play Console.
