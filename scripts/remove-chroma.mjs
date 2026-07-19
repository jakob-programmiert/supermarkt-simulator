import { readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const [, , inputPath, outputPath] = process.argv
if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/remove-chroma.mjs <input.png> <output.png>')
}

const png = PNG.sync.read(readFileSync(inputPath))
const transparentDistance = 48
const opaqueDistance = 175

for (let index = 0; index < png.data.length; index += 4) {
  const red = png.data[index]
  const green = png.data[index + 1]
  const blue = png.data[index + 2]
  const distance = Math.hypot(255 - red, green, 255 - blue)
  const magentaDominance = Math.min(red, blue) - green
  const localOpaqueDistance = magentaDominance > 16 ? 245 : opaqueDistance

  if (distance <= transparentDistance) {
    png.data[index + 3] = 0
    continue
  }

  if (distance >= localOpaqueDistance) continue

  const t = (distance - transparentDistance) / (localOpaqueDistance - transparentDistance)
  const matte = t * t * (3 - 2 * t)
  const alpha = Math.max(0.04, matte)
  png.data[index] = Math.max(0, Math.min(255, Math.round((red - (1 - alpha) * 255) / alpha)))
  png.data[index + 1] = Math.max(0, Math.min(255, Math.round(green / alpha)))
  png.data[index + 2] = Math.max(0, Math.min(255, Math.round((blue - (1 - alpha) * 255) / alpha)))
  png.data[index + 3] = Math.round(255 * matte)
}

writeFileSync(outputPath, PNG.sync.write(png))
console.log(`Transparent sprite atlas written to ${outputPath}`)
