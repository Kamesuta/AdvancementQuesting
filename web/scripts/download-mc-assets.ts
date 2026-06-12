import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MCMETA_ASSETS, MCMETA_ASSETS_JSON, MCMETA_REGISTRIES } from './mc-version.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_MC = join(__dirname, '..', 'public', 'mc')

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

async function download(url: string, dest: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const buf = await res.arrayBuffer()
  writeFileSync(dest, Buffer.from(buf))
}

async function downloadIfMissing(url: string, dest: string) {
  if (existsSync(dest)) {
    console.log(`  skip (cached): ${dest.replace(PUBLIC_MC, '')}`)
    return
  }
  await download(url, dest)
  console.log(`  downloaded: ${dest.replace(PUBLIC_MC, '')}`)
}

async function downloadLangFiles() {
  console.log('\n[lang] 言語ファイルをダウンロード中...')
  const langDir = join(PUBLIC_MC, 'lang')
  ensureDir(langDir)

  for (const lang of ['ja_jp', 'en_us']) {
    const url = `${MCMETA_ASSETS_JSON}/assets/minecraft/lang/${lang}.json`
    await downloadIfMissing(url, join(langDir, `${lang}.json`))
  }
}

async function downloadItemRegistry() {
  console.log('\n[registry] アイテムレジストリをダウンロード中...')
  const registryDir = join(PUBLIC_MC, 'registry')
  ensureDir(registryDir)

  const url = `${MCMETA_REGISTRIES}/item/data.json`
  await downloadIfMissing(url, join(registryDir, 'item.json'))
}

async function downloadTextures(itemIds: string[]) {
  console.log('\n[textures] テクスチャをダウンロード中...')
  const itemDir = join(PUBLIC_MC, 'textures', 'item')
  const blockDir = join(PUBLIC_MC, 'textures', 'block')
  ensureDir(itemDir)
  ensureDir(blockDir)

  let downloaded = 0
  let skipped = 0
  let failed = 0

  for (const id of itemIds) {
    // アイテムテクスチャを優先、なければブロックテクスチャを試みる
    const itemDest = join(itemDir, `${id}.png`)
    const blockDest = join(blockDir, `${id}.png`)

    if (existsSync(itemDest)) {
      skipped++
      continue
    }

    // まずアイテムテクスチャを試みる
    const itemUrl = `${MCMETA_ASSETS}/assets/minecraft/textures/item/${id}.png`
    const res = await fetch(itemUrl)
    if (res.ok) {
      const buf = await res.arrayBuffer()
      writeFileSync(itemDest, Buffer.from(buf))
      downloaded++
      continue
    }

    // ブロックテクスチャにフォールバック
    if (!existsSync(blockDest)) {
      const blockUrl = `${MCMETA_ASSETS}/assets/minecraft/textures/block/${id}.png`
      const bres = await fetch(blockUrl)
      if (bres.ok) {
        const buf = await bres.arrayBuffer()
        writeFileSync(blockDest, Buffer.from(buf))
        downloaded++
        continue
      }
    } else {
      skipped++
      continue
    }

    // テクスチャが存在しないアイテム (一部の内部アイテムなど) はスキップ
    failed++
  }

  console.log(`  downloaded: ${downloaded}, skipped: ${skipped}, no-texture: ${failed}`)
}

async function main() {
  console.log('Minecraft アセットのダウンロードを開始します...')
  ensureDir(PUBLIC_MC)

  await downloadLangFiles()
  await downloadItemRegistry()

  // アイテムIDを読んでテクスチャをダウンロード
  const registryPath = join(PUBLIC_MC, 'registry', 'item.json')
  const itemIds: string[] = JSON.parse(readFileSync(registryPath, 'utf-8'))
  await downloadTextures(itemIds)

  console.log('\n完了!')
}

main().catch((e) => {
  console.error('エラー:', e.message)
  process.exit(1)
})
