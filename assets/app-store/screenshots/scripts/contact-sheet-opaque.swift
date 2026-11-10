#!/usr/bin/env swift
import CoreGraphics
import Foundation
import ImageIO

let args = CommandLine.arguments
guard args.count == 3 else { fputs("Usage: contact-sheet-opaque.swift <final-directory> <output.png>\n", stderr); exit(64) }
let files = try FileManager.default.contentsOfDirectory(at: URL(fileURLWithPath: args[1]), includingPropertiesForKeys: nil)
    .filter { $0.pathExtension.lowercased() == "png" }.sorted { $0.lastPathComponent < $1.lastPathComponent }
guard !files.isEmpty else { exit(1) }
let images = files.compactMap { url -> CGImage? in
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
    return CGImageSourceCreateImageAtIndex(source, 0, nil)
}
guard images.count == files.count else { exit(1) }
let tileWidth = 360
let tileHeight = Int(Double(tileWidth) * Double(images[0].height) / Double(images[0].width))
let width = tileWidth * images.count, height = tileHeight
guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue), let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[2]) as CFURL, "public.png" as CFString, 1, nil) else { exit(1) }
context.setFillColor(CGColor(red: 244/255, green: 246/255, blue: 250/255, alpha: 1)); context.fill(CGRect(x: 0, y: 0, width: width, height: height))
for (index, image) in images.enumerated() { context.draw(image, in: CGRect(x: index * tileWidth, y: 0, width: tileWidth, height: tileHeight)) }
guard let sheet = context.makeImage() else { exit(1) }
CGImageDestinationAddImage(destination, sheet, nil)
guard CGImageDestinationFinalize(destination) else { exit(1) }
