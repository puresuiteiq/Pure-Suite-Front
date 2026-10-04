import { useCallback, useEffect, useRef, useState } from 'react'
import { menuService } from '../services/menuService'

const DEFAULT_PAGE_SIZE = 10

function mergeCategories(current, next) {
  const byId = new Map(current.map((category) => [category.id, { ...category, items: [...category.items] }]))
  for (const category of next) {
    if (!byId.has(category.id)) {
      byId.set(category.id, { ...category, items: [...category.items] })
      continue
    }
    const existing = byId.get(category.id)
    const seen = new Set(existing.items.map((item) => item.id))
    existing.items.push(...category.items.filter((item) => !seen.has(item.id)))
  }
  return [...byId.values()]
}

/**
 * Loads and mutates the authenticated merchant's menu (categories + nested
 * items). The merchant is derived from the JWT server-side, so no id is passed.
 * Each mutation calls the service, then applies an optimistic update to local
 * state and returns the created/updated entity so callers can close modals on
 * success. Exposes { categories, loading, error, ...mutations }.
 */
export function useMenu({ pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [totalItems, setTotalItems] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    menuService
      .listMenu({ limit: pageSize, offset: 0 })
      .then((data) => {
        if (!active) return
        if (Array.isArray(data)) {
          setCategories(data)
          setTotalItems(data.reduce((sum, category) => sum + category.items.length, 0))
          setHasMore(false)
          return
        }
        setCategories(data.categories ?? [])
        setTotalItems(data.page?.total ?? 0)
        setHasMore(Boolean(data.page?.hasMore))
      })
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [pageSize])

  const loadedItems = useCallback(
    () => categories.reduce((sum, category) => sum + category.items.length, 0),
    [categories],
  )

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const data = await menuService.listMenu({ limit: pageSize, offset: loadedItems() })
      setCategories((prev) => mergeCategories(prev, data.categories ?? []))
      setTotalItems(data.page?.total ?? null)
      setHasMore(Boolean(data.page?.hasMore))
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [hasMore, loadedItems, pageSize])

  const addCategory = useCallback(async (data) => {
    const category = await menuService.createCategory(data)
    setCategories((prev) => [...prev, category])
    return category
  }, [])

  const editCategory = useCallback(async (categoryId, data) => {
    const updated = await menuService.updateCategory(categoryId, data)
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, ...updated } : c)),
    )
    return updated
  }, [])

  const removeCategory = useCallback(async (categoryId) => {
    await menuService.deleteCategory(categoryId)
    setCategories((prev) => prev.filter((c) => c.id !== categoryId))
  }, [])

  const addItem = useCallback(async (categoryId, data) => {
    const item = await menuService.createItem(categoryId, data)
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, items: [...c.items, item] } : c,
      ),
    )
    setTotalItems((prev) => (prev == null ? prev : prev + 1))
    return item
  }, [])

  const editItem = useCallback(async (categoryId, itemId, data) => {
    const item = await menuService.updateItem(itemId, data)
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, items: c.items.map((i) => (i.id === itemId ? item : i)) }
          : c,
      ),
    )
    return item
  }, [])

  const removeItem = useCallback(async (categoryId, itemId) => {
    await menuService.deleteItem(itemId)
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
          : c,
      ),
    )
    setTotalItems((prev) => (prev == null ? prev : Math.max(0, prev - 1)))
  }, [])

  const getItem = useCallback((itemId) => menuService.getItem(itemId), [])

  // Drag-and-drop order. Applied at once (the dragged row is already where the
  // merchant dropped it), then saved; a refused save puts the old order back
  // and rethrows so the page can say so.
  const reorderCategories = useCallback(
    async (nextIds) => {
      const previous = categories
      const byId = new Map(categories.map((category) => [category.id, category]))
      setCategories(nextIds.map((id) => byId.get(id)).filter(Boolean))
      try {
        await menuService.reorderCategories(nextIds)
      } catch (err) {
        setCategories(previous)
        throw err
      }
    },
    [categories],
  )

  const reorderItems = useCallback(
    async (categoryId, nextIds) => {
      const previous = categories
      setCategories((prev) =>
        prev.map((category) => {
          if (category.id !== categoryId) return category
          const byId = new Map(category.items.map((item) => [item.id, item]))
          return { ...category, items: nextIds.map((id) => byId.get(id)).filter(Boolean) }
        }),
      )
      try {
        await menuService.reorderItems(categoryId, nextIds)
      } catch (err) {
        setCategories(previous)
        throw err
      }
    },
    [categories],
  )

  return {
    categories,
    loading,
    loadingMore,
    error,
    totalItems,
    hasMore,
    loadMore,
    addCategory,
    editCategory,
    removeCategory,
    addItem,
    getItem,
    editItem,
    removeItem,
    reorderCategories,
    reorderItems,
  }
}
