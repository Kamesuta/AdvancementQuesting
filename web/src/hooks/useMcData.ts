import { useQuery } from '@tanstack/react-query'

export interface McItemEntry {
  id: string
  name: string
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.json() as Promise<T>
}

/** ja_jp.json + en_us.json をロードして返す */
export function useMcLang() {
  return useQuery({
    queryKey: ['mc-lang'],
    queryFn: async () => {
      const [ja, en] = await Promise.all([
        fetchJson<Record<string, string>>('/mc/lang/ja_jp.json'),
        fetchJson<Record<string, string>>('/mc/lang/en_us.json'),
      ])
      return { ja, en }
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** アイテム名を解決する (ja優先、enフォールバック、なければid) */
export function getItemName(
  lang: { ja: Record<string, string>; en: Record<string, string> } | undefined,
  id: string,
): string {
  if (!lang) return id
  return (
    lang.ja[`item.minecraft.${id}`] ??
    lang.ja[`block.minecraft.${id}`] ??
    lang.en[`item.minecraft.${id}`] ??
    lang.en[`block.minecraft.${id}`] ??
    id
  )
}

/** アイテムテクスチャURLを返す (item優先、blockフォールバック) */
export function getItemTextureUrl(id: string): string {
  return `/mc/textures/item/${id}.png`
}

export function getBlockTextureUrl(id: string): string {
  return `/mc/textures/block/${id}.png`
}

/** アドバンスメント名を lang ファイルから解決する */
export function getAdvancementName(
  lang: { ja: Record<string, string>; en: Record<string, string> } | undefined,
  id: string,
): string {
  if (!lang) return id
  // "minecraft:story/mine_wood" → "advancements.story.mine_wood.title"
  const key = id.replace('minecraft:', 'advancements.').replace(/\//g, '.')
  return lang.ja[`${key}.title`] ?? lang.en[`${key}.title`] ?? id
}

/** カスタム統計名を lang ファイルから解決する */
export function getCustomStatName(
  lang: { ja: Record<string, string>; en: Record<string, string> } | undefined,
  id: string,
): string {
  if (!lang) return id
  // "minecraft:jump" → "stat.minecraft.jump"
  const key = id.replace(':', '.')
  return lang.ja[`stat.${key}`] ?? lang.en[`stat.${key}`] ?? id
}

/** アドバンスメントID一覧をロードして名前付きエントリとして返す */
export function useMcAdvancements() {
  const langQuery = useMcLang()

  const advQuery = useQuery({
    queryKey: ['mc-advancements'],
    queryFn: () => fetchJson<string[]>('/mc/registry/advancement.json'),
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const advancements: McItemEntry[] | undefined =
    advQuery.data && langQuery.data
      ? advQuery.data.map((id) => ({
          id,
          name: getAdvancementName(langQuery.data, id),
        }))
      : undefined

  return {
    advancements,
    isLoading: advQuery.isLoading || langQuery.isLoading,
    lang: langQuery.data,
  }
}

/** カスタム統計ID一覧をロードして名前付きエントリとして返す */
export function useMcCustomStats() {
  const langQuery = useMcLang()

  const statQuery = useQuery({
    queryKey: ['mc-custom-stats'],
    queryFn: () => fetchJson<string[]>('/mc/registry/custom_stat.json'),
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const stats: McItemEntry[] | undefined =
    statQuery.data && langQuery.data
      ? statQuery.data.map((id) => ({
          id,
          name: getCustomStatName(langQuery.data, id),
        }))
      : undefined

  return {
    stats,
    isLoading: statQuery.isLoading || langQuery.isLoading,
    lang: langQuery.data,
  }
}

/** アイテムID一覧をロードして名前付きエントリとして返す */
export function useMcItems() {
  const langQuery = useMcLang()

  const itemsQuery = useQuery({
    queryKey: ['mc-items'],
    queryFn: () => fetchJson<string[]>('/mc/registry/item.json'),
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const items: McItemEntry[] | undefined =
    itemsQuery.data && langQuery.data
      ? itemsQuery.data.map((id) => ({
          id,
          name: getItemName(langQuery.data, id),
        }))
      : undefined

  return {
    items,
    isLoading: itemsQuery.isLoading || langQuery.isLoading,
    error: itemsQuery.error ?? langQuery.error,
    lang: langQuery.data,
  }
}
