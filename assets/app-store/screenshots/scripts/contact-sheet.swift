#!/usr/bin/env swift
import AppKit

// Usage: swift contact-sheet.swift <final-directory> <output.png>
let args = CommandLine.arguments
guard args.count == 3 else { exit(64) }
let urls = (try FileManager.default.contentsOfDirectory(at: URL(fileURLWithPath: args[1]), includingPropertiesForKeys: nil))
    .filter { $0.pathExtension.lowercased() == "png" }.sorted { $0.lastPathComponent < $1.lastPathComponent }
guard urls.count == 7 else { fputs("Expected seven final PNGs\n", stderr); exit(1) }
let width = 1800, height = 2100, cellW = 560, cellH = 980
guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 3, hasAlpha: false, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0), let context = NSGraphicsContext(bitmapImageRep: bitmap) else { exit(1) }
NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = context
NSColor(calibratedRed: 244/255, green: 246/255, blue: 250/255, alpha: 1).setFill(); NSBezierPath(rect: NSRect(x: 0, y: 0, width: width, height: height)).fill()
for (index, url) in urls.enumerated() {
  guard let image = NSImage(contentsOf: url) else { exit(1) }
  let col = index % 3, row = 1 - index / 3
  let box = NSRect(x: 60 + col * (cellW + 30), y: 60 + row * (cellH + 40), width: cellW, height: cellH)
  let scale = min(box.width / image.size.width, box.height / image.size.height)
  let size = NSSize(width: image.size.width * scale, height: image.size.height * scale)
  image.draw(in: NSRect(x: box.midX - size.width / 2, y: box.midY - size.height / 2, width: size.width, height: size.height))
}
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[2]))
