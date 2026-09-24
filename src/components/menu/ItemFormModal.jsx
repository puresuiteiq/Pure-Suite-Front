import { useEffect, useRef, useState } from 'react'
import { useVerticalT } from '../../hooks/useVerticalT'
import { useMerchantProfile } from '../../hooks/useMerchantProfile'
import { optionExampleGroup, supportsAgeRange } from '../../config/businessCategories'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import { controlClass } from '../../utils/form'
import TranslationFields from './TranslationFields'
import { LANGUAGE_CODES } from '../../i18n/languages'
import { filesToDataUrls, MAX_DIMENSION } from '../../utils/image'
import { translateApiError } from '../../utils/apiError'
import { uid } from '../../utils/uid'

const AVAILABILITY = ['available', 'unavailable', 'out_of_stock']
// Quick-fill presets per trade: a clothing shop gets sizes, an electronics shop
// gets storage tiers. Shops with no natural preset (grocery, furniture…) fall
// back to a plain "Add group" prompt and no quick-add chips.
const OPTION_PRESETS = {
  clothing: { nameKey: 'menu.sizeGroupName', labelKey: 'menu.quickSizes', values: ['S', 'M', 'L', 'XL', 'XXL'] },
  jewellery: { nameKey: 'menu.karatGroupName', labelKey: 'menu.quickKarat', values: ['18K', '21K', '24K'] },
  electronics: { nameKey: 'menu.storageGroupName', labelKey: 'menu.quickStorage', values: ['64GB', '128GB', '256GB', '512GB'] },
  pharmacy: { nameKey: 'menu.strengthGroupName', labelKey: 'menu.quickStrength', values: ['250mg', '500mg', '1000mg'] },
  market: { nameKey: 'menu.weightGroupName', labelKey: 'menu.quickWeights', values: ['250g', '500g', '1kg'] },
}

/** Blank value per supported language, so translation inputs stay controlled. */
const EMPTY_I18N = Object.fromEntries(LANGUAGE_CODES.map((code) => [code, '']))

const EMPTY = {
  name: '', description: '', price: '', originalPrice: '',
  nameI18n: EMPTY_I18N, descriptionI18n: EMPTY_I18N,
  optionName: '', brand: '', stock: '', images: [],
  ageMin: '', ageMax: '',
  availability: 'available',
  hasVariants: false, variants: [],
  attributes: [],
}

/**
 * Create/edit a product. `item` null → create mode.
 * Restaurant fields: name, description, price, image, size variants.
 * Store fields add brand, stock, a named option group, and an image gallery —
 * shown only when the merchant's vertical is 'store'.
 * Calls async `onSubmit(itemData)` and closes on success.
 */
export default function ItemFormModal({
  open,
  onClose,
  onSubmit,
  item,
  categoryName,
}) {
  const { t, vertical } = useVerticalT()
  const { profile } = useMerchantProfile()
  const isStore = vertical === 'store'
  // Example placeholders that match the merchant's trade (clothing / electronics
  // / food / generic), so a fashion shop isn't shown "256GB".
  const exGroup = optionExampleGroup(profile?.businessType)
  // Age range only for apparel/toys shops — never phones, groceries, etc.
  const showsAge = isStore && supportsAgeRange(profile?.businessType)
  // Quick option preset that fits the trade (sizes / storage / none).
  const optionPreset = OPTION_PRESETS[exGroup] ?? null
  const isEdit = Boolean(item)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  // Draft text per attribute group's "add a value" input, keyed by group id.
  const [valueDrafts, setValueDrafts] = useState({})

  useEffect(() => {
    if (open) {
      setForm(
        item
          ? {
              name: item.name ?? '',
              description: item.description ?? '',
              // Spread-merge: a partially translated item must still render a
              // controlled input for every language.
              nameI18n: { ...EMPTY_I18N, ...(item.nameI18n ?? {}) },
              descriptionI18n: { ...EMPTY_I18N, ...(item.descriptionI18n ?? {}) },
              price: String(item.price ?? ''),
              originalPrice: item.originalPrice == null ? '' : String(item.originalPrice),
              optionName: item.optionName ?? '',
              brand: item.brand ?? '',
              stock: item.stock == null ? '' : String(item.stock),
              ageMin: item.ageMin == null ? '' : String(item.ageMin),
              ageMax: item.ageMax == null ? '' : String(item.ageMax),
              availability: item.availability ?? 'available',
              images:
                Array.isArray(item.images) && item.images.length
                  ? item.images
                  : item.image
                    ? [item.image]
                    : [],
              // Restaurants keep priced size variants; stores don't (they use one
              // price + option groups), so a store's existing priced variants are
              // folded into a plain option group below.
              hasVariants: !isStore && Array.isArray(item.variants) && item.variants.length > 0,
              variants: !isStore && Array.isArray(item.variants)
                ? item.variants.map((variant) => ({
                    id: uid(),
                    value: variant.value ?? variant.size_name ?? '',
                    price: String(variant.price ?? ''),
                  }))
                : [],
              attributes: [
                ...(isStore && Array.isArray(item.variants) && item.variants.length
                  ? [{
                      id: uid(),
                      name: item.optionName || 'Size',
                      values: item.variants
                        .map((variant) => variant.value ?? variant.size_name ?? '')
                        .filter(Boolean),
                      colors: {},
                    }]
                  : []),
                ...(Array.isArray(item.attributes)
                  ? item.attributes.map((group) => ({
                      id: uid(),
                      name: group.name ?? '',
                      values: Array.isArray(group.values) ? group.values : [],
                      colors:
                        group.colors && typeof group.colors === 'object' ? { ...group.colors } : {},
                    }))
                  : []),
              ],
            }
          : EMPTY,
      )
      setErrors({})
      setSubmitError(null)
      setSubmitting(false)
    }
  }, [open, item, isStore])

  const updateI18n = (field, lang, text) => {
    setForm((prev) => ({ ...prev, [field]: { ...prev[field], [lang]: text } }))
  }

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  // Downscaled before upload and processed one file at a time — decoding
  // several multi-megapixel photos at once is what exhausts a mid-range phone.
  const onImageSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!files.length) return
    setSubmitError(null)
    // Partial success on purpose: one unusable file must not discard the rest
    // of the selection. Previously a rejected read never settled at all and the
    // images silently never appeared.
    const { images, failed } = await filesToDataUrls(files, { maxDim: MAX_DIMENSION.gallery })
    if (images.length) {
      setForm((prev) => ({ ...prev, images: [...prev.images, ...images] }))
    }
    if (failed.length) {
      setSubmitError(translateApiError(failed[0].error, t))
    }
  }

  const removeImage = (index) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  const toggleVariants = (enabled) => {
    setForm((prev) => ({ ...prev, hasVariants: enabled, variants: enabled ? prev.variants : [] }))
    setErrors((prev) => ({ ...prev, price: undefined, variants: undefined }))
  }

  const addVariant = () => {
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { id: uid(), value: '', price: '' }],
    }))
  }

  const updateVariant = (id, field, value) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant) =>
        variant.id === id ? { ...variant, [field]: value } : variant,
      ),
    }))
    setErrors((prev) => ({ ...prev, variants: undefined }))
  }

  const removeVariant = (id) => {
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((variant) => variant.id !== id) }))
  }

  // Extra option groups (e.g. Size, Color), picked alongside the priced variants.
  const addAttributeGroup = (name = '', values = []) =>
    setForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { id: uid(), name, values, colors: {} }],
    }))
  const updateAttributeName = (id, name) =>
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.map((g) => (g.id === id ? { ...g, name } : g)),
    }))
  const addAttributeValue = (id, value) => {
    const v = String(value).trim()
    if (!v) return
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.map((g) =>
        g.id === id && !g.values.includes(v) ? { ...g, values: [...g.values, v] } : g,
      ),
    }))
  }
  const removeAttributeValue = (id, value) =>
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.map((g) => {
        if (g.id !== id) return g
        const colors = { ...(g.colors ?? {}) }
        delete colors[value]
        return { ...g, values: g.values.filter((x) => x !== value), colors }
      }),
    }))
  // Set (or change) the swatch colour of one value in a group.
  const setValueColor = (id, value, hex) =>
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.map((g) =>
        g.id === id ? { ...g, colors: { ...(g.colors ?? {}), [value]: hex } } : g,
      ),
    }))
  const removeAttributeGroup = (id) =>
    setForm((prev) => ({ ...prev, attributes: prev.attributes.filter((g) => g.id !== id) }))
  // Quick group pre-filled from the trade's preset (sizes, storage, …).
  const addPreset = () =>
    optionPreset && addAttributeGroup(t(optionPreset.nameKey), [...optionPreset.values])

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = t('menu.itemNameRequired')
    if (!form.hasVariants && (
      form.price === '' ||
      Number.isNaN(Number(form.price)) ||
      Number(form.price) < 0
    ))
      next.price = t('menu.priceRequired')
    if (form.hasVariants && (!form.variants.length || form.variants.some((variant) => !variant.value.trim() || variant.price === '' || Number.isNaN(Number(variant.price)) || Number(variant.price) < 0))) {
      next.variants = t('menu.variantsRequired')
    }
    if (isStore && form.stock !== '' && (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0)) {
      next.stock = t('menu.stockInvalid')
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit({
        name: form.name,
        description: form.description,
        nameI18n: form.nameI18n,
        descriptionI18n: form.descriptionI18n,
        price: form.hasVariants ? null : Number(form.price),
        originalPrice: !isStore || form.hasVariants || form.originalPrice === '' ? null : Number(form.originalPrice),
        availability: form.availability,
        optionName: form.hasVariants ? form.optionName.trim() || undefined : undefined,
        brand: form.brand.trim() || undefined,
        stock: form.stock === '' ? null : Number(form.stock),
        ageMin: showsAge && form.ageMin !== '' ? Number(form.ageMin) : null,
        ageMax: showsAge && form.ageMax !== '' ? Number(form.ageMax) : null,
        images: form.images,
        image: form.images[0] ?? null,
        variants: form.hasVariants
          ? form.variants.map(({ value, price }) => ({ value: value.trim(), price: Number(price) }))
          : [],
        attributes: isStore
          ? form.attributes
              .map((g) => ({ name: g.name.trim(), values: g.values, colors: g.colors ?? {} }))
              .filter((g) => g.name && g.values.length)
          : [],
      })
      onClose()
    } catch (err) {
      setSubmitError(translateApiError(err, t, 'menu.somethingWrong'))
      setSubmitting(false)
    }
  }

  const title = isEdit
    ? t('menu.editItemTitle')
    : categoryName
      ? t('menu.addItemTitleIn', { category: categoryName })
      : t('menu.addItemTitle')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      /* The add title already names the category ("addItemTitleIn"); only the
         edit title needs the subtitle to say where the item lives. */
      subtitle={isEdit ? categoryName : undefined}
      icon="book"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="item-form" disabled={submitting}>
            {submitting
              ? t('common.saving')
              : isEdit
                ? t('common.saveShort')
                : t('menu.addItem')}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
        {submitError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </p>
        )}

        {/* Name */}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            {t('menu.itemName')}
            <span className="ms-0.5 text-red-500">*</span>
          </span>
          <input
            type="text"
            value={form.name}
            onChange={update('name')}
            placeholder={t(`menu.optionExamples.${exGroup}.productName`)}
            className={controlClass(errors.name)}
          />
          {errors.name && (
            <span className="mt-1 block text-xs text-red-600">{errors.name}</span>
          )}
        </label>

        <TranslationFields
          value={form.nameI18n}
          onChange={(lang, text) => updateI18n('nameI18n', lang, text)}
          fallback={form.name}
          inputClassName={controlClass()}
        />

        {/* Price + optional discount "was" price; hidden when priced by options.
            The discount ("was" price) is a retail feature — stores only. */}
        {!form.hasVariants && (
          <div className={`grid grid-cols-1 gap-4 ${isStore ? 'sm:grid-cols-2' : ''}`}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                {t('menu.price')}
                <span className="ms-0.5 text-red-500">*</span>
              </span>
              <input
                type="number" min="0" step="1"
                value={form.price}
                onChange={update('price')}
                placeholder="0"
                className={controlClass(errors.price)}
              />
              {errors.price && (
                <span className="mt-1 block text-xs text-red-600">{errors.price}</span>
              )}
            </label>
            {isStore && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('menu.originalPrice')}</span>
                <input
                  type="number" min="0" step="1"
                  value={form.originalPrice}
                  onChange={update('originalPrice')}
                  placeholder={t('menu.originalPricePlaceholder')}
                  className={controlClass()}
                />
                <span className="mt-1 block text-xs text-slate-400">{t('menu.originalPriceHint')}</span>
              </label>
            )}
          </div>
        )}

        {/* Brand + stock — stores only. */}
        {isStore && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('menu.brand')}</span>
              <input
                type="text"
                value={form.brand}
                onChange={update('brand')}
                placeholder={t(`menu.optionExamples.${exGroup}.brand`)}
                className={controlClass()}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('menu.stock')}</span>
              <input
                type="number" min="0" step="1"
                value={form.stock}
                onChange={update('stock')}
                placeholder={t('menu.stockPlaceholder')}
                className={controlClass(errors.stock)}
              />
              {errors.stock
                ? <span className="mt-1 block text-xs text-red-600">{errors.stock}</span>
                : <span className="mt-1 block text-xs text-slate-400">{t('menu.stockHint')}</span>}
            </label>
          </div>
        )}

        {/* Suitable age range (years) — apparel/toys shops only, optional. */}
        {showsAge && (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('menu.ageRange')}</span>
            <div className="flex items-center gap-3">
              <input
                type="number" min="0" max="150" step="1"
                value={form.ageMin}
                onChange={update('ageMin')}
                placeholder={t('menu.ageFrom')}
                className={controlClass()}
                aria-label={t('menu.ageFrom')}
              />
              <span className="shrink-0 text-sm text-slate-400">—</span>
              <input
                type="number" min="0" max="150" step="1"
                value={form.ageMax}
                onChange={update('ageMax')}
                placeholder={t('menu.ageTo')}
                className={controlClass()}
                aria-label={t('menu.ageTo')}
              />
            </div>
            <span className="mt-1 block text-xs text-slate-400">{t('menu.ageRangeHint')}</span>
          </div>
        )}

        {/* Availability — a full-width segmented control. */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('menu.availability')}</span>
          {/* Stacked below 400px: a third of a phone-width modal is too narrow
              for "Out of stock" / "نفذ من المخزون", which broke in two. */}
          <div className="grid grid-cols-1 gap-1 rounded-xl bg-slate-100 p-1 min-[400px]:grid-cols-3 dark:bg-white/5">
            {AVAILABILITY.map((state) => {
              const selected = form.availability === state
              const activeColor =
                // 600 shades: white on the 500s was 2.2–2.5:1 and hard to read.
                state === 'available'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : state === 'out_of_stock'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-red-600 text-white shadow-sm'
              return (
                <button
                  key={state}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, availability: state }))}
                  className={`whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition ${
                    selected ? activeColor : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {t(`menu.availabilityOptions.${state}`)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Images — a real drop area when empty, a thumbnail grid once filled. */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('menu.images')}</span>
          {form.images.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-8 text-slate-400 transition hover:border-brand-400 hover:text-brand-500 dark:border-white/15"
            >
              <Icon name="upload" className="h-6 w-6" />
              <span className="text-sm font-medium">{t('menu.addImage')}</span>
            </button>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {form.images.map((src, index) => (
                <div key={index} className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
                  <img src={src} alt="" className="h-full w-full object-cover object-top" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={t('common.remove')}
                    className="absolute end-1 top-1 rounded-full bg-slate-900/70 p-1 text-white hover:bg-slate-900"
                  >
                    <Icon name="close" className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-brand-400 hover:text-brand-500 dark:border-white/15"
              >
                <Icon name="plus" className="h-5 w-5" />
                <span className="text-[11px]">{t('menu.addImage')}</span>
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onImageSelect}
            className="hidden"
          />
        </div>

        {/* Description */}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            {t('menu.description')}
          </span>
          <textarea
            rows={3}
            value={form.description}
            onChange={update('description')}
            placeholder={t('menu.descriptionPlaceholder')}
            className={`${controlClass()} resize-none`}
          />
        </label>

        <TranslationFields
          value={form.descriptionI18n}
          onChange={(lang, text) => updateI18n('descriptionI18n', lang, text)}
          fallback={form.description}
          multiline
          inputClassName={`${controlClass()} resize-none`}
        />

        {/* Priced size variants — restaurants only (each size has its own price).
            Stores use one price + the option groups below instead. */}
        {!isStore && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('menu.hasVariants')}</span>
            <input type="checkbox" checked={form.hasVariants} onChange={(event) => toggleVariants(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          </label>

          {form.hasVariants && (
            <div className="mt-4 space-y-3">
              {/* The option group's label — "Size" for a restaurant, "Storage"/
                  "Color" for a store. Placeholder adapts to the vertical. */}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{t('menu.optionName')}</span>
                <input
                  value={form.optionName}
                  onChange={update('optionName')}
                  placeholder={t(`menu.optionExamples.${exGroup}.name`)}
                  className={controlClass()}
                />
              </label>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">{t('menu.variantsHint')}</p>
                <Button type="button" size="sm" variant="secondary" icon="plus" onClick={addVariant}>{t('menu.addSize')}</Button>
              </div>
              {form.variants.map((variant) => (
                <div key={variant.id} className="grid grid-cols-[1fr_120px_auto] gap-2 rounded-lg bg-white p-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10">
                  <input value={variant.value} onChange={(event) => updateVariant(variant.id, 'value', event.target.value)} placeholder={t(`menu.optionExamples.${exGroup}.value`)} className={controlClass(errors.variants)} />
                  <input type="number" min="0" step="1" value={variant.price} onChange={(event) => updateVariant(variant.id, 'price', event.target.value)} placeholder={t('menu.price')} className={controlClass(errors.variants)} />
                  <button type="button" onClick={() => removeVariant(variant.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={t('common.delete')}><Icon name="trash" className="h-5 w-5" /></button>
                </div>
              ))}
              {errors.variants && <p className="text-xs text-red-600">{errors.variants}</p>}
            </div>
          )}
        </section>
        )}

        {/* Store product options — one price (above) + the option groups the
            customer picks (Size, Color). Restaurants use priced sizes instead. */}
        {isStore && (
        <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <Icon name="dashboard" className="h-4 w-4 text-slate-400" />
                {t('menu.attributesTitle')}
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t('menu.attributesHint')}</p>
            </div>
            <Button type="button" size="sm" variant="secondary" icon="plus" onClick={() => addAttributeGroup()}>
              {t('menu.addOptionGroup')}
            </Button>
          </div>

          {form.attributes.length === 0 ? (
            <button
              type="button"
              onClick={optionPreset ? addPreset : () => addAttributeGroup()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-white/15 dark:text-slate-300"
            >
              <Icon name="plus" className="h-4 w-4" />
              {optionPreset ? t(optionPreset.labelKey) : t('menu.addOptionGroup')}
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              {form.attributes.map((group) => (
                <div key={group.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
                  {/* Group name + delete */}
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('menu.optionGroupLabel')}</span>
                    <button type="button" onClick={() => removeAttributeGroup(group.id)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" aria-label={t('common.delete')}>
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    value={group.name}
                    onChange={(e) => updateAttributeName(group.id, e.target.value)}
                    placeholder={t('menu.optionGroupNamePlaceholder')}
                    className={`${controlClass()} font-semibold`}
                  />

                  {/* Values */}
                  <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-white/10">
                    <span className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">{t('menu.valuesLabel')}</span>
                    {group.values.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {group.values.map((v) => (
                          <span key={v} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pe-2 ps-1.5 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200">
                            {/* Optional colour swatch — click to pick this value's colour. */}
                            <label
                              className="relative flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-slate-300 dark:border-white/20"
                              style={group.colors?.[v] ? { backgroundColor: group.colors[v] } : undefined}
                              title={t('menu.setColor')}
                            >
                              {!group.colors?.[v] && <Icon name="droplet" className="h-2.5 w-2.5 text-slate-400" />}
                              <input
                                type="color"
                                value={group.colors?.[v] || '#000000'}
                                onChange={(e) => setValueColor(group.id, v, e.target.value)}
                                className="absolute inset-0 cursor-pointer opacity-0"
                                aria-label={t('menu.setColor')}
                              />
                            </label>
                            {v}
                            <button type="button" onClick={() => removeAttributeValue(group.id, v)} aria-label={t('common.remove')} className="text-slate-400 hover:text-red-600">
                              <Icon name="close" className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">{t('menu.noValuesHint')}</p>
                    )}

                    <div className="mt-2.5 flex gap-2">
                      <input
                        value={valueDrafts[group.id] ?? ''}
                        onChange={(e) => setValueDrafts((d) => ({ ...d, [group.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addAttributeValue(group.id, valueDrafts[group.id] ?? '')
                            setValueDrafts((d) => ({ ...d, [group.id]: '' }))
                          }
                        }}
                        placeholder={t('menu.addValuePlaceholder')}
                        className={controlClass()}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        icon="plus"
                        onClick={() => {
                          addAttributeValue(group.id, valueDrafts[group.id] ?? '')
                          setValueDrafts((d) => ({ ...d, [group.id]: '' }))
                        }}
                      >
                        {t('menu.addValue')}
                      </Button>
                    </div>

                    {optionPreset && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-400">{t('menu.quickAdd')}</span>
                        {optionPreset.values.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => addAttributeValue(group.id, s)}
                            className="rounded-md border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-white/10 dark:text-slate-300"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}
      </form>
    </Modal>
  )
}
