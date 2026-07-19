import { describe, expect, it } from 'vitest'
import { PRODUCTS, type ProductId } from './config'
import {
  ENTRANCE,
  PRODUCT_ACCESS,
  PRODUCT_ROW,
  SELF_CHECKOUTS,
  pathToBottleReturn,
  pathToCheckout,
  pathToExit,
  pathToProduct,
  pathToSelfCheckout,
  type AisleRow,
  type PathPoint,
} from './navigation'

const shelfObstacles = [
  { left: 455, right: 685, top: 205, bottom: 305 },
  { left: 845, right: 1075, top: 205, bottom: 305 },
  { left: 435, right: 665, top: 330, bottom: 435 },
  { left: 855, right: 1085, top: 330, bottom: 435 },
  { left: 415, right: 645, top: 475, bottom: 585 },
  { left: 865, right: 1095, top: 475, bottom: 585 },
  { left: 365, right: 595, top: 650, bottom: 810 },
  { left: 895, right: 1125, top: 650, bottom: 810 },
]

const segmentAvoidsShelves = (start: PathPoint, end: PathPoint) =>
  Array.from({ length: 31 }, (_, index) => index / 30).every((progress) => {
    const x = start.x + (end.x - start.x) * progress
    const y = start.y + (end.y - start.y) * progress
    return shelfObstacles.every((rect) => x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom)
  })

describe('customer aisle navigation', () => {
  it('routes refrigerated products to the cooling wall in the main market', () => {
    expect(PRODUCT_ACCESS.milk.x).toBeLessThan(300)
    expect(PRODUCT_ACCESS.cheese.x).toBeLessThan(300)
    expect(PRODUCT_ACCESS.yogurt.x).toBeLessThan(300)
    expect(PRODUCT_ROW.milk).toBe('upperMiddle')
    expect(PRODUCT_ROW.cheese).toBe('lowerMiddle')
    expect(PRODUCT_ROW.yogurt).toBe('bottom')
  })

  it('keeps every entrance, shelf, checkout and exit route out of shelf geometry', () => {
    let bottlePrevious = ENTRANCE
    pathToBottleReturn().forEach((next) => {
      expect(segmentAvoidsShelves(bottlePrevious, next)).toBe(true)
      bottlePrevious = next
    })

    const starts: Array<{ row: AisleRow | null; point: PathPoint }> = [
      { row: null, point: ENTRANCE },
      ...PRODUCTS.map(({ id }) => ({ row: PRODUCT_ROW[id], point: PRODUCT_ACCESS[id] })),
    ]

    starts.forEach(({ row, point }) => {
      PRODUCTS.forEach(({ id }) => {
        const route = pathToProduct(row, id as ProductId)
        let previous = point
        route.forEach((next) => {
          expect(segmentAvoidsShelves(previous, next)).toBe(true)
          previous = next
        })
      })
      if (row) {
        ;[
          pathToCheckout(row),
          ...SELF_CHECKOUTS.map((_, station) => pathToSelfCheckout(row, station as 0 | 1 | 2 | 3)),
          pathToExit(row),
        ].forEach((route) => {
          let previous = point
          route.forEach((next) => {
            expect(segmentAvoidsShelves(previous, next)).toBe(true)
            previous = next
          })
        })
      }
    })
  })
})
