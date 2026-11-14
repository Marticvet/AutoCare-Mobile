#!/usr/bin/env swift
import AppKit
import CoreGraphics
import ImageIO

// Composes an authentic raw simulator PNG into an opaque App Store image.
// It never changes pixels inside the captured app screen.
// Usage: swift compose.swift <raw.png> <output.png> <headline> <width> <height>
let args = CommandLine.arguments
guard args.count == 6, let width = Int(args[4]), let height = Int(args[5]),
      let raw = NSImage(contentsOfFile: args[1]) else {
    fputs("Usage: compose.swift <raw.png> <output.png> <headline> <width> <height>\n", stderr); exit(64)
}
let canvasWidth = CGFloat(width); let canvasHeight = CGFloat(height)
let size = NSSize(width: canvasWidth, height: canvasHeight)
guard let bitmapContext = CGContext(
    data: nil,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
) else {
    fputs("Unable to allocate opaque RGB canvas.\n", stderr); exit(1)
}
let context = NSGraphicsContext(cgContext: bitmapContext, flipped: false)
guard context.cgContext.width == width else {
    fputs("Unable to create AppKit drawing context.\n", stderr); exit(1)
}
NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = context
NSColor(calibratedRed: 23/255, green: 35/255, blue: 63/255, alpha: 1).setFill()
NSBezierPath(rect: NSRect(origin: .zero, size: size)).fill()
NSColor(calibratedRed: 47/255, green: 107/255, blue: 1, alpha: 0.18).setFill()
NSBezierPath(ovalIn: NSRect(x: canvasWidth * 0.35, y: canvasHeight * 0.63, width: canvasWidth * 0.9, height: canvasHeight * 0.42)).fill()
let headline = args[3] as NSString
let font = NSFont.systemFont(ofSize: CGFloat(width) * 0.07, weight: .bold)
let paragraph = NSMutableParagraphStyle(); paragraph.alignment = .center
headline.draw(in: NSRect(x: canvasWidth * 0.08, y: canvasHeight * 0.82, width: canvasWidth * 0.84, height: canvasHeight * 0.13), withAttributes: [.font: font, .foregroundColor: NSColor.white, .paragraphStyle: paragraph])
let margin = CGFloat(width) * 0.075
let top = CGFloat(height) * 0.045
let available = NSSize(width: CGFloat(width) - 2 * margin, height: CGFloat(height) * 0.77)
let scale = min(available.width / raw.size.width, available.height / raw.size.height)
let drawSize = NSSize(width: raw.size.width * scale, height: raw.size.height * scale)
let frame = NSRect(x: (CGFloat(width) - drawSize.width) / 2, y: top, width: drawSize.width, height: drawSize.height)
NSColor(calibratedWhite: 0, alpha: 0.22).setFill(); NSBezierPath(roundedRect: frame.insetBy(dx: -10, dy: -10), xRadius: 36, yRadius: 36).fill()
raw.draw(in: frame, from: .zero, operation: .sourceOver, fraction: 1)
NSGraphicsContext.restoreGraphicsState()
guard let image = bitmapContext.makeImage(),
      let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[2]) as CFURL, "public.png" as CFString, 1, nil) else {
    fputs("Unable to encode composed PNG.\n", stderr); exit(1)
}
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else {
    fputs("Unable to finalize composed PNG.\n", stderr); exit(1)
}
