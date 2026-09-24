import { useEffect, useRef, useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Select from '../ui/Select'
import Switch from '../ui/Switch'
import FormField from '../ui/FormField'
import BannerArtwork from '../public/BannerArtwork'
import { useVerticalT } from '../../hooks/useVerticalT'
import { controlClass } from '../../utils/form'
import { fileToDataUrl, MAX_DIMENSION } from '../../utils/image'
import { translateApiError } from '../../utils/apiError'

// Matches merchant_banners.title.
const TITLE_MAX = 120
const FORM_ID = 'banner-form'

const EMPTY = {
  image: null,
  imageChanged: false,
  title: '',
  linkType: 'none',
  linkId: null,
  isActive: true,
}

/**
 * Create or edit one storefront banner. `banner` null → create.
 *
 * The previews use the storefront's own BannerArtwork at the storefront's two
 * shapes — 2:1 at phone width, 3:1 wider — so what the merchant sees here is
 * what customers get.
 *
 * Calls async `onSubmit(data)` and closes on success. An edit sends `image`
 * only when a new picture was chosen, so the one customers have cached stays.
 */
export default function BannerFormModal({ open, banner, linkTargets, onClose, onSubmit }) {
  const { t } = useVerticalT()
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(EMPTY)
  const [processing, setProcessing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Seed the form each time the modal opens.
  useEffect(() => {
    if (!open) return
    setForm(
      banner
        ? {
            image: banner.image,
            imageChanged: false,
            title: banner.title ?? '',
            linkType: banner.linkType ?? 'none',
            linkId: banner.linkId ?? null,
            isActive: banner.isActive !== false,
          }
        : EMPTY,
    )
    setError(null)
    setProcessing(false)
    setSubmitting(false)
  }, [open, banner])

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const onImageSelect = async (event) => {
    const file = event.target.files?.[0]
    // Clear the input so picking the same file again still fires change.
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    setError(null)
    setProcessing(true)
    try {
      // rasterize: the server accepts banners only as ordinary pictures (an SVG
      // can carry script), so an SVG from the device becomes one here instead
      // of being refused after upload.
      const image = await fileToDataUrl(file, { maxDim: MAX_DIMENSION.banner, rasterize: true })
      update({ image, imageChanged: true })
    } catch (err) {
      setError(translateApiError(err, t))
    } finally {
      setProcessing(false)
    }
  }

  const productOptions = linkTargets.flatMap((category) =>
    category.items.map((item) => ({ value: item.id, label: `${item.name} · ${category.name}` })),
  )
  const categoryOptions = linkTargets.map((category) => ({ value: category.id, label: category.name }))
  const targetOptions =
    form.linkType === 'product' ? productOptions : form.linkType === 'category' ? categoryOptions : []

  const submit = async (event) => {
    event.preventDefault()
    if (!form.image) {
      setError(t('banners.imageRequired'))
      return
    }
    if (form.linkType !== 'none' && !targetOptions.some((option) => option.value === form.linkId)) {
      setError(t('banners.linkRequired'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: form.title.trim(),
        linkType: form.linkType,
        linkId: form.linkType === 'none' ? null : form.linkId,
        isActive: form.isActive,
        ...(!banner || form.imageChanged ? { image: form.image } : {}),
      })
      onClose()
    } catch (err) {
      setError(translateApiError(err, t, 'banners.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const pickImage = () => fileInputRef.current?.click()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={banner ? t('banners.editTitle') : t('banners.addTitle')}
      icon="image"
      size="lg"
      footer={
        <div className="flex w-full items-stretch gap-3">
          <Button variant="secondary" className="min-w-0 flex-1" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            className="min-w-0 flex-1"
            disabled={submitting || processing}
          >
            {submitting ? t('common.saving') : t('common.saveShort')}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="space-y-6">
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div>
          <span className="form-label">{t('banners.image')}</span>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onImageSelect} className="hidden" />
          {form.image ? (
            <div className="space-y-4">
              <Preview label={t('banners.previewPhone')} frameClass="aspect-[2/1] max-w-[390px]">
                <BannerArtwork src={form.image} title={form.title.trim()} eager size="phone" />
              </Preview>
              <Preview label={t('banners.previewWide')} frameClass="aspect-[3/1]">
                <BannerArtwork src={form.image} title={form.title.trim()} eager size="compact" />
              </Preview>
              <Button variant="secondary" size="sm" icon="upload" onClick={pickImage} disabled={processing}>
                {processing ? t('banners.processing') : t('banners.replaceImage')}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={pickImage}
              disabled={processing}
              className="flex aspect-[2/1] w-full max-w-[390px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-500 transition hover:border-slate-400 hover:text-slate-700 disabled:opacity-60 dark:border-white/15 dark:text-slate-400 dark:hover:border-white/30 dark:hover:text-slate-200"
            >
              <Icon name="upload" className="h-7 w-7" />
              {processing ? t('banners.processing') : t('banners.chooseImage')}
            </button>
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('banners.sizeHint')}</p>
        </div>

        <FormField label={t('banners.titleLabel')} hint={t('banners.titleHint')}>
          <input
            type="text"
            value={form.title}
            maxLength={TITLE_MAX}
            onChange={(event) => update({ title: event.target.value })}
            placeholder={t('banners.titlePlaceholder')}
            className={controlClass()}
          />
        </FormField>

        {/* Not <label>s: Select's trigger is a button, and a wrapping label
            would forward every click on the caption to it. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="form-label">{t('banners.link')}</span>
            <Select
              value={form.linkType}
              onChange={(linkType) => update({ linkType, linkId: null })}
              options={[
                { value: 'none', label: t('banners.linkNone') },
                { value: 'product', label: t('banners.linkProduct') },
                { value: 'category', label: t('banners.linkCategory') },
              ]}
            />
          </div>
          {form.linkType !== 'none' && (
            <div>
              <span className="form-label">
                {form.linkType === 'product' ? t('banners.pickProduct') : t('banners.pickCategory')}
              </span>
              {targetOptions.length ? (
                <Select
                  value={form.linkId}
                  onChange={(linkId) => update({ linkId })}
                  options={targetOptions}
                  placeholder={form.linkType === 'product' ? t('banners.pickProduct') : t('banners.pickCategory')}
                />
              ) : (
                <p className="py-3 text-sm text-slate-500 dark:text-slate-400">
                  {form.linkType === 'product' ? t('banners.noProducts') : t('banners.noCategories')}
                </p>
              )}
            </div>
          )}
        </div>

        <Switch
          checked={form.isActive}
          onChange={(isActive) => update({ isActive })}
          label={t('banners.active')}
        />
      </form>
    </Modal>
  )
}

/** A captioned frame in the storefront carousel's own colours. */
function Preview({ label, frameClass, children }) {
  return (
    <figure>
      <figcaption className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</figcaption>
      <div className={`public-carousel relative w-full overflow-hidden rounded-2xl ${frameClass}`}>{children}</div>
    </figure>
  )
}
