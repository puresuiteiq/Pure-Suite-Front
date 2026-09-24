import { useEffect, useState } from 'react'
import { useVerticalT } from '../../hooks/useVerticalT'
import { useMerchantProfile } from '../../hooks/useMerchantProfile'
import { optionExampleGroup } from '../../config/businessCategories'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import FormField from '../ui/FormField'
import { controlClass } from '../../utils/form'
import TranslationFields from './TranslationFields'
import { LANGUAGE_CODES } from '../../i18n/languages'
import { translateApiError } from '../../utils/apiError'

/** A blank value per supported language, so the inputs are always controlled. */
const EMPTY_I18N = Object.fromEntries(LANGUAGE_CODES.map((code) => [code, '']))

/**
 * Create/edit a menu category. `category` null → create mode.
 *
 * Calls async `onSubmit({ name, nameI18n })` and closes on success. This used
 * to pass a bare string; it carries an object so per-category fields cost no
 * further contract change, matching how items already submit.
 */
export default function CategoryFormModal({ open, onClose, onSubmit, category }) {
  const { t } = useVerticalT()
  const { profile } = useMerchantProfile()
  // Example placeholder set for the merchant's business type (coffee, clothing…).
  const exGroup = optionExampleGroup(profile?.businessType)
  const isEdit = Boolean(category)
  const [name, setName] = useState('')
  const [nameI18n, setNameI18n] = useState(EMPTY_I18N)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(category?.name ?? '')
      // Spread-merge so every language is present even when only some are
      // stored — otherwise those inputs would flip from uncontrolled.
      setNameI18n({ ...EMPTY_I18N, ...(category?.nameI18n ?? {}) })
      setError(null)
      setSubmitting(false)
    }
  }, [open, category])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('menu.categoryNameRequired'))
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), nameI18n })
      onClose()
    } catch (err) {
      setError(translateApiError(err, t, 'menu.somethingWrong'))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('menu.editCategoryTitle') : t('menu.addCategoryTitle')}
      icon="book"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="category-form" disabled={submitting}>
            {submitting
              ? t('common.saving')
              : isEdit
                ? t('common.saveShort')
                : t('menu.addCategory')}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <FormField label={t('menu.categoryName')} icon="book">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            placeholder={t(`menu.optionExamples.${exGroup}.category`)}
            autoFocus
            className={controlClass()}
          />
        </FormField>
        <TranslationFields
          value={nameI18n}
          onChange={(lang, text) => setNameI18n((prev) => ({ ...prev, [lang]: text }))}
          fallback={name}
        />
      </form>
    </Modal>
  )
}
