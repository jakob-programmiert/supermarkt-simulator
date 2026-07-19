import { readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const [inputPath, outputPath, targetHeightText = '560'] = process.argv.slice(2)
if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/trim-resize-png.mjs <input.png> <output.png> [target-height]')
}

const source = PNG.sync.read(readFileSync(inputPath))
let minX = source.width
let minY = source.height
let maxX = -1
let maxY = -1

for (let y = 0; y < source.height; y += 1) {
  for (let x = 0; x < source.width; x += 1) {
    if (source.data[(y * source.width + x) * 4 + 3] <= 8) continue
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
}

if (maxX < minX || maxY < minY) throw new Error(`No visible pixels in ${inputPath}`)

const sidePadding = 6
minX = Math.max(0, minX - sidePadding)
maxX = Math.min(source.width - 1, maxX + sidePadding)
minY = Math.max(0, minY - sidePadding)
const cropWidth = maxX - minX + 1
const cropHeight = maxY - minY + 1
const targetHeight = Number(targetHeightText)
const targetWidth = Math.max(1, Math.round((cropWidth / cropHeight) * targetHeight))
const output = new PNG({ width: targetWidth, height: targetHeight })

for (let y = 0; y < targetHeight; y += 1) {
  const sourceY = minY + ((y + 0.5) * cropHeight) / targetHeight - 0.5
  const y0 = Math.max(minY, Math.floor(sourceY))
  const y1 = Math.min(maxY, y0 + 1)
  const weightY = Math.max(0, Math.min(1, sourceY - y0))
  for (let x = 0; x < targetWidth; x += 1) {
    const sourceX = minX + ((x + 0.5) * cropWidth) / targetWidth - 0.5
    const x0 = Math.max(minX, Math.floor(sourceX))
    const x1 = Math.min(maxX, x0 + 1)
    const weightX = Math.max(0, Math.min(1, sourceX - x0))
    const outputOffset = (y * targetWidth + x) * 4
    for (let channel = 0; channel < 4; channel += 1) {
      const topLeft = source.data[(y0 * source.width + x0) * 4 + channel]
      const topRight = source.data[(y0 * source.width + x1) * 4 + channel]
      const bottomLeft = source.data[(y1 * source.width + x0) * 4 + channel]
      const bottomRight = source.data[(y1 * source.width + x1) * 4 + channel]
      const top = topLeft + (topRight - topLeft) * weightX
      const bottom = bottomLeft + (bottomRight - bottomLeft) * weightX
      output.data[outputOffset + channel] = Math.round(top + (bottom - top) * weightY)
    }
  }
}

writeFileSync(outputPath, PNG.sync.write(output))

const footPixels = []
for (let y = Math.max(0, targetHeight - 20); y < targetHeight; y += 1) {
  for (let x = 0; x < targetWidth; x += 1) {
    if (output.data[(y * targetWidth + x) * 4 + 3] > 24) footPixels.push(x)
  }
}
const footMin = Math.min(...footPixels)
const footMax = Math.max(...footPixels)
const footOriginX = ((footMin + footMax) / 2 / targetWidth).toFixed(3)
console.log(JSON.stringify({ outputPath, width: targetWidth, height: targetHeight, footOriginX }))
