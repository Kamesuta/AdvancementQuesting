import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { MCMETA_ASSETS_JSON, MCMETA_REGISTRIES, MCMETA_ATLAS } from './mc-version.js'

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

async function downloadRegistries() {
  console.log('\n[registry] レジストリをダウンロード中...')
  const registryDir = join(PUBLIC_MC, 'registry')
  ensureDir(registryDir)

  await downloadIfMissing(
    `${MCMETA_REGISTRIES}/item/data.json`,
    join(registryDir, 'item.json'),
  )
  await downloadIfMissing(
    `${MCMETA_REGISTRIES}/advancement/data.json`,
    join(registryDir, 'advancement.json'),
  )
  // custom_stat は registries ブランチにない場合があるためスキップしない
  const customStatUrl = `${MCMETA_REGISTRIES}/custom_stat/data.json`
  const customStatDest = join(registryDir, 'custom_stat.json')
  if (!existsSync(customStatDest)) {
    const res = await fetch(customStatUrl)
    if (res.ok) {
      writeFileSync(customStatDest, Buffer.from(await res.arrayBuffer()))
      console.log(`  downloaded: /registry/custom_stat.json`)
    } else {
      console.log(`  skip (not found): /registry/custom_stat.json`)
    }
  } else {
    console.log(`  skip (cached): /registry/custom_stat.json`)
  }
}

async function downloadItemAtlas() {
  console.log('\n[item-atlas] misode items テクスチャアトラスをダウンロード中...')
  const atlasDir = join(PUBLIC_MC, 'atlas')
  ensureDir(atlasDir)

  const pngPath = join(atlasDir, 'items.png')
  const jsonPath = join(atlasDir, 'items.json')
  const sizePath = join(atlasDir, 'items-size.json')

  await downloadIfMissing(`${MCMETA_ATLAS}/items/atlas.png`, pngPath)
  await downloadIfMissing(`${MCMETA_ATLAS}/items/data.json`, jsonPath)

  // items atlas の実際のサイズを記録 (ItemIcon の backgroundSize 計算に使用)
  if (!existsSync(sizePath)) {
    const meta = await sharp(pngPath).metadata()
    writeFileSync(sizePath, JSON.stringify({ w: meta.width ?? 512, h: meta.height ?? 512 }))
    console.log(`  items atlas size: ${meta.width}x${meta.height}`)
  }
}

async function main() {
  console.log('Minecraft アセットのダウンロードを開始します...')
  ensureDir(PUBLIC_MC)

  await downloadLangFiles()
  await downloadRegistries()
  await downloadItemAtlas()

  console.log('\n完了!')
  console.log('ヒント: ブロックアトラスを生成するには "npm run render-blocks" を実行してください。')
}

main().catch((e) => {
  console.error('エラー:', e.message)
  process.exit(1)
})
