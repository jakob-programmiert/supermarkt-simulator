import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const [inputPath, outputDirectory] = process.argv.slice(2)
if (!inputPath || !outputDirectory) {
  throw new Error('Usage: node scripts/extract-customer-frames.mjs <atlas.png> <output-directory>')
}

const source = PNG.sync.read(readFileSync(inputPath))
mkdirSync(outputDirectory, { recursive: true })

const columns = 3
const rows = 2
const cellWidth = Math.floor(source.width / columns)
const cellHeight = Math.floor(source.height / rows)
const crops = Array.from({ length: columns * rows }, (_, index) => {
  const cellX = (index % columns) * cellWidth
  const cellY = Math.floor(index / columns) * cellHeight
  const cellMaxX = index % columns === columns - 1 ? source.width : cellX + cellWidth
  const cellMaxY = Math.floor(index / columns) === rows - 1 ? source.height : cellY + cellHeight
  let minX = cellMaxX
  let minY = cellMaxY
  let maxX = -1
  let maxY = -1

  for (let y = cellY; y < cellMaxY; y += 1) {
    for (let x = cellX; x < cellMaxX; x += 1) {
      if (source.data[(y * source.width + x) * 4 + 3] <= 8) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < minX || maxY < minY) throw new Error(`No visible sprite in cell ${index}`)
  const atlasPadding = 4
  minX = Math.max(cellX, minX - atlasPadding)
  minY = Math.max(cellY, minY - atlasPadding)
  maxX = Math.min(cellMaxX - 1, maxX + atlasPadding)
  maxY = Math.min(cellMaxY - 1, maxY + atlasPadding)
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
})

crops.forEach((crop, index) => {
  const padding = 24
  const output = new PNG({ width: crop.width + padding * 2, height: crop.height + padding * 2 })
  PNG.bitblt(source, output, crop.x, crop.y, crop.width, crop.height, padding, padding)
  writeFileSync(`${outputDirectory}/customer-${index}.png`, PNG.sync.write(output))
})

const metadata = crops.map((crop) => {
  const footPixels = []
  for (let y = crop.y + Math.max(0, crop.height - 24); y < crop.y + crop.height; y += 1) {
    for (let x = crop.x; x < crop.x + crop.width; x += 1) {
      if (source.data[(y * source.width + x) * 4 + 3] > 24) footPixels.push(x)
    }
  }
  const footMin = Math.min(...footPixels)
  const footMax = Math.max(...footPixels)
  return {
    ...crop,
    footOriginX: Number((((footMin + footMax) / 2 - crop.x) / crop.width).toFixed(3)),
  }
})
console.log(JSON.stringify(metadata, null, 2))
