import { useCallback, useEffect, useState } from 'react'
import { menuService } from '../services/menuService'

/**
 * Loads and mutates the authenticated merchant's menu (categories + nested
 * items). The merchant is derived from the JWT server-side, so no id is passed.
 * Each mutation calls the service, then applies an optimistic update to local
 * state and returns the created/updated entity so callers can close modals on
 * success. Exposes { categories, loading, error, ...mutations }.
 */
export function useMenu() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    menuService
      .listMenu()
      .then((data) => active && setCategories(data))
      .catch((err) => active && setError(err))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

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
  }, [])

  return {
    categories,
    loading,
    error,
    addCategory,
    editCategory,
    removeCategory,
    addItem,
    editItem,
    removeItem,
  }
}
