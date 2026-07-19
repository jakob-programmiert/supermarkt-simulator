import { copyFileSync } from 'node:fs'

const builtFile = new URL('../dist/index.html', import.meta.url)
const standaloneFile = new URL('../index.html', import.meta.url)

copyFileSync(builtFile, standaloneFile)
console.log('Doppelklick-Version erstellt: index.html')
