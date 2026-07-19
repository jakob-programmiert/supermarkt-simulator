import { readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const [inputPath, outputPath] = process.argv.slice(2)

if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/remove-gradient-chroma.mjs <input.png> <output.png>')
}

const image = PNG.sync.read(readFileSync(inputPath))
const { width, height, data } = image
const pixelCount = width * height
const background = new Uint8Array(pixelCount)
const queue = new Int32Array(pixelCount)
let head = 0
let tail = 0

const isChroma = (pixel) => {
  const offset = pixel * 4
  const red = data[offset]
  const green = data[offset + 1]
  const blue = data[offset + 2]
  const magentaDominance = Math.min(red, blue) - green
  return magentaDominance > 11 && Math.abs(red - blue) < 150 && red + blue > 28
}

const enqueue = (pixel) => {
  if (pixel < 0 || pixel >= pixelCount || background[pixel] || !isChroma(pixel)) return
  background[pixel] = 1
  queue[tail++] = pixel
}

for (let x = 0; x < width; x += 1) {
  enqueue(x)
  enqueue((height - 1) * width + x)
}
for (let y = 0; y < height; y += 1) {
  enqueue(y * width)
  enqueue(y * width + width - 1)
}

while (head < tail) {
  const pixel = queue[head++]
  const x = pixel % width
  if (x > 0) enqueue(pixel - 1)
  if (x < width - 1) enqueue(pixel + 1)
  if (pixel >= width) enqueue(pixel - width)
  if (pixel < pixelCount - width) enqueue(pixel + width)
}

for (let pixel = 0; pixel < pixelCount; pixel += 1) {
  if (isChroma(pixel)) background[pixel] = 1
}

for (let pixel = 0; pixel < pixelCount; pixel += 1) {
  if (background[pixel]) {
    const dataOffset = pixel * 4
    data[dataOffset] = 0
    data[dataOffset + 1] = 0
    data[dataOffset + 2] = 0
    data[dataOffset + 3] = 0
  }
}

for (let pixel = 0; pixel < pixelCount; pixel += 1) {
  if (background[pixel]) continue
  const x = pixel % width
  const y = Math.floor(pixel / width)
  let transparentNeighbours = 0
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) continue
      const neighbourX = x + offsetX
      const neighbourY = y + offsetY
      if (
        neighbourX < 0 ||
        neighbourX >= width ||
        neighbourY < 0 ||
        neighbourY >= height ||
        background[neighbourY * width + neighbourX]
      ) {
        transparentNeighbours += 1
      }
    }
  }
  if (transparentNeighbours === 0) continue
  const dataOffset = pixel * 4
  const red = data[dataOffset]
  const green = data[dataOffset + 1]
  const blue = data[dataOffset + 2]
  const spill = Math.max(0, Math.min(red, blue) - green)
  data[dataOffset] = Math.max(0, red - spill)
  data[dataOffset + 2] = Math.max(0, blue - spill)
  data[dataOffset + 3] = transparentNeighbours >= 5 ? 145 : transparentNeighbours >= 3 ? 190 : 225
}

writeFileSync(outputPath, PNG.sync.write(image))
