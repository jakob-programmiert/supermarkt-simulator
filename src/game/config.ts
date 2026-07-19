export type RoomId = 'main' | 'beverage' | 'fresh'
export type ExpansionRoomId = Exclude<RoomId, 'main'>
export type ProductAtlas = 'base' | 'expansion'
export type ProductId =
  | 'bread' | 'milk' | 'apple' | 'cookies' | 'nutellaRoll' | 'cheese' | 'juice' | 'yogurt'
  | 'water' | 'cola' | 'lemonade' | 'appleJuice' | 'icedTea' | 'energyDrink'
  | 'eggs' | 'butter' | 'muesli' | 'coffee'
export type UpgradeId = 'shelf' | 'storage' | 'checkout'
export type HelperId = 'restock' | 'cashier' | 'order'

export interface ProductDefinition {
  id: ProductId
  name: string
  singular: string
  emoji: string
  room: RoomId
  atlas: ProductAtlas
  buyPrice: number
  sellPrice: number
  orderSize: number
  deposit?: number
  atlasPosition: `${number}% ${number}%`
  shelfPosition: { x: number; y: number }
  accent: string
}

export const ROOM_INFO: Record<RoomId, {
  name: string
  icon: string
  description: string
  price: number
}> = {
  main: {
    name: 'Hauptmarkt',
    icon: '🏪',
    description: 'Dein großer Hauptverkaufsraum.',
    price: 0,
  },
  beverage: {
    name: 'Getränkemarkt',
    icon: '🥤',
    description: 'Sechs neue Getränke und ein Pfandautomat.',
    price: 25_000,
  },
  fresh: {
    name: 'Kühl- & Frischmarkt',
    icon: '🥚',
    description: 'Ein eigener Kühl- und Frischeanbau für Eier, Butter, Müsli und Kaffee.',
    price: 40_000,
  },
}

export const EXPANSION_ROOMS = ['beverage', 'fresh'] as const satisfies readonly ExpansionRoomId[]

export const PRODUCTS: readonly ProductDefinition[] = [
  {
    id: 'bread', name: 'Brot', singular: 'Brot', emoji: '🍞', room: 'main', atlas: 'base',
    buyPrice: 100, sellPrice: 200, orderSize: 8, atlasPosition: '0% 0%',
    shelfPosition: { x: 570, y: 250 }, accent: '#d99132',
  },
  {
    id: 'milk', name: 'Milch', singular: 'Milch', emoji: '🥛', room: 'main', atlas: 'base',
    buyPrice: 125, sellPrice: 250, orderSize: 8, atlasPosition: '33.333% 0%',
    shelfPosition: { x: 960, y: 250 }, accent: '#4f91d8',
  },
  {
    id: 'apple', name: 'Äpfel', singular: 'Apfel', emoji: '🍎', room: 'main', atlas: 'base',
    buyPrice: 50, sellPrice: 150, orderSize: 8, atlasPosition: '66.667% 0%',
    shelfPosition: { x: 550, y: 380 }, accent: '#df4b3f',
  },
  {
    id: 'cookies', name: 'Kekse', singular: 'Kekse', emoji: '🍪', room: 'main', atlas: 'base',
    buyPrice: 150, sellPrice: 300, orderSize: 8, atlasPosition: '100% 0%',
    shelfPosition: { x: 970, y: 380 }, accent: '#f0a42f',
  },
  {
    id: 'nutellaRoll', name: 'Nutella-Brötchen', singular: 'Nutella-Brötchen', emoji: '🥐', room: 'main', atlas: 'base',
    buyPrice: 120, sellPrice: 280, orderSize: 8, atlasPosition: '0% 100%',
    shelfPosition: { x: 530, y: 528 }, accent: '#9a5a2b',
  },
  {
    id: 'cheese', name: 'Käse', singular: 'Käse', emoji: '🧀', room: 'main', atlas: 'base',
    buyPrice: 175, sellPrice: 350, orderSize: 8, atlasPosition: '33.333% 100%',
    shelfPosition: { x: 980, y: 528 }, accent: '#e7b82f',
  },
  {
    id: 'juice', name: 'Orangensaft', singular: 'Orangensaft', emoji: '🧃', room: 'main', atlas: 'base',
    buyPrice: 110, sellPrice: 240, orderSize: 8, atlasPosition: '66.667% 100%',
    shelfPosition: { x: 480, y: 702 }, accent: '#ef8d25',
  },
  {
    id: 'yogurt', name: 'Joghurt', singular: 'Joghurt', emoji: '🥛', room: 'main', atlas: 'base',
    buyPrice: 80, sellPrice: 180, orderSize: 8, atlasPosition: '100% 100%',
    shelfPosition: { x: 1010, y: 702 }, accent: '#6ea7d8',
  },
  {
    id: 'water', name: 'Mineralwasser', singular: 'Mineralwasser', emoji: '💧', room: 'beverage', atlas: 'expansion',
    buyPrice: 60, sellPrice: 150, orderSize: 8, deposit: 25, atlasPosition: '0% 0%',
    shelfPosition: { x: 570, y: 250 }, accent: '#4f9ed8',
  },
  {
    id: 'cola', name: 'Cola', singular: 'Cola', emoji: '🥤', room: 'beverage', atlas: 'expansion',
    buyPrice: 90, sellPrice: 220, orderSize: 8, deposit: 25, atlasPosition: '25% 0%',
    shelfPosition: { x: 960, y: 250 }, accent: '#7a352d',
  },
  {
    id: 'lemonade', name: 'Zitronenlimonade', singular: 'Zitronenlimonade', emoji: '🍋', room: 'beverage', atlas: 'expansion',
    buyPrice: 85, sellPrice: 210, orderSize: 8, deposit: 25, atlasPosition: '50% 0%',
    shelfPosition: { x: 550, y: 380 }, accent: '#e8c82e',
  },
  {
    id: 'appleJuice', name: 'Apfelsaft', singular: 'Apfelsaft', emoji: '🧃', room: 'beverage', atlas: 'expansion',
    buyPrice: 105, sellPrice: 250, orderSize: 8, deposit: 25, atlasPosition: '75% 0%',
    shelfPosition: { x: 970, y: 380 }, accent: '#72a73a',
  },
  {
    id: 'icedTea', name: 'Eistee', singular: 'Eistee', emoji: '🧋', room: 'beverage', atlas: 'expansion',
    buyPrice: 95, sellPrice: 230, orderSize: 8, deposit: 25, atlasPosition: '100% 0%',
    shelfPosition: { x: 530, y: 528 }, accent: '#d77d35',
  },
  {
    id: 'energyDrink', name: 'Energy-Drink', singular: 'Energy-Drink', emoji: '⚡', room: 'beverage', atlas: 'expansion',
    buyPrice: 120, sellPrice: 290, orderSize: 8, deposit: 25, atlasPosition: '0% 100%',
    shelfPosition: { x: 980, y: 528 }, accent: '#4f83cb',
  },
  {
    id: 'eggs', name: 'Eier', singular: 'Ei', emoji: '🥚', room: 'fresh', atlas: 'expansion',
    buyPrice: 140, sellPrice: 320, orderSize: 8, atlasPosition: '25% 100%',
    shelfPosition: { x: 570, y: 250 }, accent: '#d6b37b',
  },
  {
    id: 'butter', name: 'Butter', singular: 'Butter', emoji: '🧈', room: 'fresh', atlas: 'expansion',
    buyPrice: 130, sellPrice: 300, orderSize: 8, atlasPosition: '50% 100%',
    shelfPosition: { x: 960, y: 250 }, accent: '#e6bd3b',
  },
  {
    id: 'muesli', name: 'Müsli', singular: 'Müsli', emoji: '🥣', room: 'fresh', atlas: 'expansion',
    buyPrice: 160, sellPrice: 360, orderSize: 8, atlasPosition: '75% 100%',
    shelfPosition: { x: 550, y: 380 }, accent: '#c88b42',
  },
  {
    id: 'coffee', name: 'Kaffee', singular: 'Kaffee', emoji: '☕', room: 'fresh', atlas: 'expansion',
    buyPrice: 220, sellPrice: 480, orderSize: 8, atlasPosition: '100% 100%',
    shelfPosition: { x: 970, y: 380 }, accent: '#78442f',
  },
] as const

export const PRODUCT_BY_ID = Object.fromEntries(
  PRODUCTS.map((product) => [product.id, product]),
) as Record<ProductId, ProductDefinition>

export const PRODUCTS_BY_ROOM = {
  main: PRODUCTS.filter((product) => product.room === 'main'),
  beverage: PRODUCTS.filter((product) => product.room === 'beverage'),
  fresh: PRODUCTS.filter((product) => product.room === 'fresh'),
} satisfies Record<RoomId, readonly ProductDefinition[]>

export const STARTING_MONEY = 10_000
export const SHELF_CAPACITY = [8, 12, 16, 24, 32] as const
export const STORAGE_CAPACITY = [80, 120, 160, 240, 320] as const
export const CHECKOUT_DURATION = [1200, 900, 600] as const
export const CASHIER_DURATION = [5000, 4000, 3000] as const
export const SELF_CHECKOUT_DURATION = 6500
export const SELF_CHECKOUT_ASSISTED_DURATION = 1800
export const SELF_CHECKOUT_HELP_CHANCE = 35
export const RESTOCK_HELPER_INTERVAL = 3000
export const ORDER_HELPER_INTERVAL = 6000
export const UPGRADE_PRICES: Record<UpgradeId, readonly number[]> = {
  shelf: [10_000, 20_000, 35_000, 50_000],
  storage: [12_500, 25_000, 40_000, 60_000],
  checkout: [15_000, 30_000],
}

export const UPGRADE_INFO: Record<UpgradeId, { name: string; icon: string; description: string }> = {
  shelf: { name: 'Regal-Ausbau', icon: '🪵', description: 'Mehr Platz für jedes freigeschaltete Produkt' },
  storage: { name: 'Lager-Ausbau', icon: '📦', description: 'Mehr Vorräte für alle Räume aufbewahren' },
  checkout: { name: 'Kassen-Ausbau', icon: '⚡', description: 'Produkte schneller scannen' },
}

export const HELPER_PRICES: Record<HelperId, number> = {
  restock: 5_000,
  cashier: 12_000,
  order: 8_000,
}

export const HELPER_INFO: Record<HelperId, { name: string; icon: string; description: string }> = {
  restock: { name: 'Regalhilfe', icon: '🧑‍🔧', description: 'Füllt die Regale aller freigeschalteten Räume automatisch auf.' },
  cashier: { name: 'Kassenhilfe', icon: '🧑‍💼', description: 'Bedient wartende Kunden automatisch. Ein besserer Scanner macht sie schneller.' },
  order: { name: 'Bestellhilfe', icon: '🧑‍💻', description: 'Bestellt automatisch neue Ware, sobald der Bestand eines freigeschalteten Produkts niedrig wird.' },
}

export const formatMoney = (cents: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cents / 100)
