import type { ProductId } from './config'

export interface PathPoint {
  x: number
  y: number
}

export type AisleRow = 'top' | 'upperMiddle' | 'lowerMiddle' | 'bottom'

export const ENTRANCE: PathPoint = { x: 768, y: 155 }
export const ROW_HUBS: Record<AisleRow, PathPoint> = {
  top: { x: 760, y: 190 },
  upperMiddle: { x: 760, y: 315 },
  lowerMiddle: { x: 760, y: 465 },
  bottom: { x: 760, y: 635 },
}
export const CHECKOUT_HUB: PathPoint = { x: 1165, y: 635 }
export const CHECKOUT: PathPoint = { x: 1210, y: 385 }
export const BOTTLE_RETURN: PathPoint = { x: 185, y: 605 }
export const SELF_CHECKOUTS = [
  { x: 1190, y: 510 },
  { x: 1430, y: 535 },
  { x: 1190, y: 680 },
  { x: 1430, y: 705 },
] as const satisfies readonly PathPoint[]

export const PRODUCT_ACCESS: Record<ProductId, PathPoint> = {
  bread: { x: 570, y: 190 },
  milk: { x: 280, y: 315 },
  apple: { x: 550, y: 315 },
  cookies: { x: 970, y: 315 },
  nutellaRoll: { x: 530, y: 465 },
  cheese: { x: 265, y: 465 },
  juice: { x: 480, y: 635 },
  yogurt: { x: 250, y: 635 },
  water: { x: 570, y: 190 },
  cola: { x: 960, y: 190 },
  lemonade: { x: 550, y: 315 },
  appleJuice: { x: 970, y: 315 },
  icedTea: { x: 530, y: 465 },
  energyDrink: { x: 980, y: 465 },
  eggs: { x: 570, y: 190 },
  butter: { x: 960, y: 190 },
  muesli: { x: 550, y: 315 },
  coffee: { x: 970, y: 315 },
}

export const PRODUCT_ROW: Record<ProductId, AisleRow> = {
  bread: 'top',
  milk: 'upperMiddle',
  apple: 'upperMiddle',
  cookies: 'upperMiddle',
  nutellaRoll: 'lowerMiddle',
  cheese: 'lowerMiddle',
  juice: 'bottom',
  yogurt: 'bottom',
  water: 'top',
  cola: 'top',
  lemonade: 'upperMiddle',
  appleJuice: 'upperMiddle',
  icedTea: 'lowerMiddle',
  energyDrink: 'lowerMiddle',
  eggs: 'top',
  butter: 'top',
  muesli: 'upperMiddle',
  coffee: 'upperMiddle',
}

export const pathToProduct = (from: AisleRow | null, productId: ProductId): PathPoint[] => {
  const target = PRODUCT_ROW[productId]
  const access = PRODUCT_ACCESS[productId]
  if (from === null) return [ROW_HUBS[target], access]
  if (from === target) return [access]
  return [ROW_HUBS[from], ROW_HUBS[target], access]
}

const pathToCheckoutArea = (from: AisleRow, destination: PathPoint): PathPoint[] => {
  const route = [ROW_HUBS[from]]
  if (from !== 'bottom') route.push(ROW_HUBS.bottom)
  route.push(CHECKOUT_HUB, destination)
  return route
}

export const pathToCheckout = (from: AisleRow): PathPoint[] =>
  pathToCheckoutArea(from, CHECKOUT)

export const pathToSelfCheckout = (from: AisleRow, station: 0 | 1 | 2 | 3): PathPoint[] =>
  pathToCheckoutArea(from, SELF_CHECKOUTS[station])

export const pathToBottleReturn = (): PathPoint[] => [
  ROW_HUBS.top,
  ROW_HUBS.upperMiddle,
  ROW_HUBS.lowerMiddle,
  ROW_HUBS.bottom,
  { x: 300, y: ROW_HUBS.bottom.y },
  BOTTLE_RETURN,
]

export const pathToExit = (from: AisleRow): PathPoint[] => {
  const route = [ROW_HUBS[from]]
  if (from !== 'top') route.push(ROW_HUBS.top)
  route.push(ENTRANCE)
  return route
}
