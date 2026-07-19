# Supermarkt-Simulator

Eine responsive, deutschsprachige Web-Spielversion mit React, TypeScript, Vite und Phaser. Kunden betreten den vergrößerten Markt, kaufen zwei bis sechs Artikel aus acht Produktgruppen und nutzen die bediente Kasse oder vier Selbstkassen. An den Selbstkassen können Hilferufe auftreten, die direkt an der Station gelöst werden. Bestellungen, Regalauffüllung, kaufbare Regal-, Kassen- und Bestellhilfen, drei Upgrade-Arten, Notfallpaket und lokales Speichern sind ebenfalls enthalten.

## Starten

```powershell
npm install
npm run dev
```

Danach `http://127.0.0.1:5173` öffnen. Das Spiel ist für Desktop, Tablet und Smartphones im Querformat ausgelegt; im Hochformat erscheint ein Drehhinweis.

Alternativ kann die Datei **`index.html` im Projektordner direkt per Doppelklick geöffnet werden**. Sie enthält nach dem Build das vollständige Spiel einschließlich aller Grafiken und benötigt keinen lokalen Server.

## Prüfen

```powershell
npm test
npm run build
```

`npm run build` aktualisiert sowohl `dist/index.html` als auch die direkt öffnbare `index.html` im Projektordner.

## Bedienung

- Ein Regal in der Ladenansicht anklicken, um es aufzufüllen.
- Über **Bestellen** jeweils acht Einheiten ins Lager liefern lassen.
- An der Kasse alle Artikel nacheinander anklicken und scannen.
- Im Getränkemarkt geben Kunden leere Flaschen am Pfandautomaten für je 0,25 € zurück. Den ausgegebenen Pfandbon anschließend an der Kasse scannen; der Betrag wird als Rabatt abgezogen.
- Bei Barzahlung das Wechselgeld ausrechnen und in Euro eingeben; bei Kartenzahlung die kontaktlose Kartenanimation abwarten.
- Vier räumlich getrennte Selbstkassen werden parallel von Kunden genutzt. Eine rot blinkende Station oder den zugehörigen Hilfehinweis anklicken, wenn ein Kunde Unterstützung braucht.
- Kunden bewegen sich über feste, getestete Laufwege durch vier Regalreihen und zur Kasse, ohne Regalflächen zu durchqueren.
- Sechs eigenständige, realistisch proportionierte 3D-Kundenfiguren mit natürlichen Gesichtern, Haut-, Haar- und Kleidungsdetails werden perspektivisch skaliert, gespiegelt und mit einer dezenten Gehbewegung dargestellt.
- Über **Ausbauen** Regale, Lager und Scanner verbessern.
- Über **Helfer** eine Regalhilfe, Kassenhilfe oder Bestellhilfe kaufen, die ihre Aufgabe danach dauerhaft automatisch erledigt.
- Der Spielstand wird nach wichtigen Aktionen sowie alle 15 Sekunden im Browser gespeichert.

## Assets

Die vergrößerte Ladenansicht sowie Produkt- und Kundenatlanten wurden als eigenständige, markenfreie 3D-Grafiken für dieses Projekt erzeugt. Die aktuell verwendeten Laden- und Produktgrafiken liegen unter `src/assets/store-environment-expanded.png` und `src/assets/products-atlas-expanded.png`; der transparente Figurenatlas liegt unter `src/assets/customers-realistic-atlas.png`. Oberfläche, Logo, Symbole, Figurenbewegungen und Klänge entstehen zur Laufzeit aus eigenem CSS, Phaser und Web Audio.
