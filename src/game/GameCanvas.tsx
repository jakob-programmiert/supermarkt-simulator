import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { MarketScene } from './MarketScene'

export function GameCanvas() {
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!parentRef.current) return
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 1536,
      height: 864,
      parent: parentRef.current,
      backgroundColor: '#173c3a',
      scene: [MarketScene],
      render: { antialias: true, pixelArt: false },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    })
    return () => game.destroy(true)
  }, [])

  return <div className="game-canvas" ref={parentRef} aria-label="Isometrische Supermarkt-Spielfläche" />
}
