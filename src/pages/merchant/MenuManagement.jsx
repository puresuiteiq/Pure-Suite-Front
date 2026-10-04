import { useEffect, useRef, useState } from 'react'
import { useVerticalT } from '../../hooks/useVerticalT'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import MenuCategory from '../../components/menu/MenuCategory'
import SortableList from '../../components/menu/SortableList'
import CategoryFormModal from '../../components/menu/CategoryFormModal'
import ItemFormModal from '../../components/menu/ItemFormModal'
import { useMenu } from '../../hooks/useMenu'
import AnimatedSection from '../../components/ui/AnimatedSection'
import { translateApiError } from '../../utils/apiError'

const MENU_PAGE_SIZE = 10
const MENU_PREFETCH_PX = 2600

export default function MenuManagement() {
  const { t } = useVerticalT()
  const {
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
  } = useMenu({ pageSize: MENU_PAGE_SIZE })
  const loadMoreRef = useRef(null)

  // { open, category } — category null = create
  const [categoryModal, setCategoryModal] = useState({ open: false, category: null })
  // { open, categoryId, categoryName, item } — item null = create
  const [itemModal, setItemModal] = useState({ open: false, categoryId: null, item: null })
  // { open, kind, category, item, loading }
  const [confirm, setConfirm] = useState({ open: false })
  const [itemLoadError, setItemLoadError] = useState(null)
  // Categories are reordered in a compact list of their names: dragging a
  // whole open category, items and all, is unwieldy on a phone.
  const [arranging, setArranging] = useState(false)
  const [reorderError, setReorderError] = useState(null)

  // A reorder is applied at once and saved behind it; a refused save has put
  // the old order back (useMenu) — say so here.
  const saveOrder = async (save) => {
    setReorderError(null)
    try {
      await save()
    } catch (err) {
      setReorderError(translateApiError(err, t, 'menu.reorder.failed'))
    }
  }

  const loadedItems = categories.reduce((sum, c) => sum + c.items.length, 0)
  const menuItemsTotal = totalItems ?? loadedItems
  const lastLoadedCategoryId = [...categories].reverse().find((category) => category.items.length > 0)?.id ?? null

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading || loadingMore) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore()
      },
      { rootMargin: `${MENU_PREFETCH_PX}px 0px` },
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadMore, loading, loadingMore])

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return undefined
    let frame = 0
    const checkDistance = () => {
      frame = 0
      const marker = loadMoreRef.current
      if (!marker) return
      if (marker.getBoundingClientRect().top - window.innerHeight < MENU_PREFETCH_PX) loadMore()
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(checkDistance)
    }
    checkDistance()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [hasMore, loadMore, loading, loadingMore, lastLoadedCategoryId])

  // ---- Category handlers ----
  const submitCategory = (data) =>
    categoryModal.category
      ? editCategory(categoryModal.category.id, data)
      : addCategory(data)

  // ---- Item handlers ----
  const submitItem = (data) =>
    itemModal.item
      ? editItem(itemModal.categoryId, itemModal.item.id, data)
      : addItem(itemModal.categoryId, data)

  const openItemEditor = async (category, item) => {
    setItemLoadError(null)
    try {
      const fullItem = await getItem(item.id)
      setItemModal({
        open: true,
        categoryId: category.id,
        categoryName: category.name,
        item: fullItem,
      })
    } catch (err) {
      setItemLoadError(translateApiError(err, t))
    }
  }

  // ---- Delete confirm ----
  const runDelete = async () => {
    setConfirm((c) => ({ ...c, loading: true, error: null }))
    try {
      if (confirm.kind === 'category') await removeCategory(confirm.category.id)
      else await removeItem(confirm.categoryId, confirm.item.id)
      setConfirm({ open: false })
    } catch (err) {
      // The message used to be discarded entirely, so a failed delete looked
      // exactly like a button that does nothing.
      setConfirm((c) => ({ ...c, loading: false, error: translateApiError(err, t) }))
      throw err // skip ConfirmDialog's success toast
    }
  }

  const confirmMessage =
    confirm.kind === 'category'
      ? t('menu.deleteCategoryConfirm', {
          name: confirm.category?.name,
          count: confirm.category?.items.length,
        })
      : t('menu.deleteItemConfirm', { name: confirm.item?.name })

  return (
    <div>
      <PageHeader
        title={t('menu.title')}
        subtitle={
          loading
            ? t('menu.subtitleLoading')
            : t('menu.subtitle', {
                categories: categories.length,
                items: menuItemsTotal,
              })
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {categories.length > 1 && (
              <Button
                variant="secondary"
                icon={arranging ? 'check' : 'grip'}
                onClick={() => (setReorderError(null), setArranging((on) => !on))}
              >
                {arranging ? t('menu.reorder.done') : t('menu.reorder.categories')}
              </Button>
            )}
            {!arranging && (
              <Button
                icon="plus"
                onClick={() => setCategoryModal({ open: true, category: null })}
              >
                {t('menu.addCategory')}
              </Button>
            )}
          </div>
        }
      />

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {t('menu.loading')}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-red-600 shadow-sm">
          {t('menu.loadFailed')}
        </div>
      )}

      {reorderError && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm">
          {reorderError}
        </div>
      )}

      {itemLoadError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm">
          {itemLoadError}
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon name="book" className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-900">
            {t('menu.emptyTitle')}
          </p>
          <p className="mt-1 text-sm text-slate-500">{t('menu.emptyHint')}</p>
          <Button
            icon="plus"
            className="mt-4 whitespace-nowrap"
            onClick={() => setCategoryModal({ open: true, category: null })}
          >
            {t('menu.addFirstCategory')}
          </Button>
        </div>
      )}

      {/* Arranging: the categories as a compact list of names to drag. */}
      {!loading && !error && arranging && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-sm text-slate-500">
            <Icon name="grip" className="h-4 w-4 shrink-0" />
            {t('menu.reorder.categoriesHint')}
          </p>
          <SortableList
            items={categories}
            onCommit={(ids) => saveOrder(() => reorderCategories(ids))}
            className="space-y-2"
            renderItem={(category, handle) => (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                {handle}
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{category.name}</span>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {t('menu.items', { count: category.items.length })}
                </span>
              </div>
            )}
          />
        </div>
      )}

      {!loading && !error && !arranging && categories.length > 0 && (
        <div className="space-y-4">
          {categories.map((category, index) => (
            <div key={category.id}>
              <AnimatedSection delay={index * 0.05} className="rounded-2xl">
                <MenuCategory
                category={category}
                onEditCategory={() => setCategoryModal({ open: true, category })}
                onDeleteCategory={() =>
                  setConfirm({ open: true, error: null, kind: 'category', category })
                }
                onAddItem={() =>
                  setItemModal({
                    open: true,
                    categoryId: category.id,
                    categoryName: category.name,
                    item: null,
                  })
                }
                onEditItem={(item) => openItemEditor(category, item)}
                onReorderItems={(ids) => saveOrder(() => reorderItems(category.id, ids))}
                onDeleteItem={(item) =>
                  setConfirm({
                    open: true,
                    error: null,
                    kind: 'item',
                    categoryId: category.id,
                    item,
                  })
                }
                />
              </AnimatedSection>
              {category.id === lastLoadedCategoryId && <div ref={loadMoreRef} className="h-2" />}
            </div>
          ))}
          {!lastLoadedCategoryId && <div ref={loadMoreRef} className="h-2" />}
          {loadingMore && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 shadow-sm">
              {t('menu.loadingMore')}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CategoryFormModal
        open={categoryModal.open}
        category={categoryModal.category}
        onClose={() => setCategoryModal({ open: false, category: null })}
        onSubmit={submitCategory}
      />

      <ItemFormModal
        open={itemModal.open}
        item={itemModal.item}
        categoryName={itemModal.categoryName}
        onClose={() =>
          setItemModal({ open: false, categoryId: null, item: null })
        }
        onSubmit={submitItem}
      />

      <ConfirmDialog
        open={confirm.open}
        destructive
        icon="trash"
        successMessage={t('common.deletedSuccess')}
        title={
          confirm.kind === 'category'
            ? t('menu.deleteCategoryTitle')
            : t('menu.deleteItemTitle')
        }
        message={confirm.open ? confirmMessage : ''}
        confirmLabel={t('common.delete')}
        loading={confirm.loading}
        error={confirm.error}
        onConfirm={runDelete}
        onCancel={() => setConfirm({ open: false })}
      />
    </div>
  )
}
