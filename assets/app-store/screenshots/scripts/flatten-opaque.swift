#!/usr/bin/env swift
import CoreGraphics
import Foundation
import ImageIO

// Writes a pixel-identical RGB PNG from a Simulator RGBA capture. No crop,
// scale, overlay, or content edit is performed.
let args = CommandLine.arguments
guard args.count == 3 else { fputs("Usage: flatten-opaque.swift <input> <output>\n", stderr); exit(64) }
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])
guard let source = CGImageSourceCreateWithURL(input as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
      let context = CGContext(data: nil, width: image.width, height: image.height,
                              bitsPerComponent: 8, bytesPerRow: 0,
                              space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue),
      let destination = CGImageDestinationCreateWithURL(output as CFURL, "public.png" as CFString, 1, nil) else { exit(1) }
context.setFillColor(CGColor(red: 244/255, green: 246/255, blue: 250/255, alpha: 1))
context.fill(CGRect(x: 0, y: 0, width: image.width, height: image.height))
context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
guard let flattened = context.makeImage() else { exit(1) }
CGImageDestinationAddImage(destination, flattened, nil)
guard CGImageDestinationFinalize(destination) else { exit(1) }
