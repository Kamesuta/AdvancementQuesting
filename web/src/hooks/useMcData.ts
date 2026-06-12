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
