import { useTranslation } from 'react-i18next'
import Modal from './Modal'
import Button from './Button'
import Icon from './Icon'
import { useToast } from '../../hooks/useToast'

/**
 * Reusable confirmation dialog built on <Modal>.
 * `onConfirm` may be async; pass `loading` to disable buttons while it runs.
 * Labels fall back to translated defaults when not provided.
 *
 * Sized `sm`: a confirmation is one short sentence, and at the default width it
 * read as a mostly-empty panel with the buttons stranded in a far corner.
 *
 * The icon does the work the copy shouldn't have to — its tint states the
 * stakes before the message is read — and the two actions split the footer so
 * the choice looks like a choice, rather than an afterthought. `icon` defaults
 * to a warning for destructive prompts; pass a fitting glyph (`logout`,
 * `trash`) to make it specific.
 *
 * `loadingLabel` overrides the generic "Working…" on the confirm button while
 * `onConfirm` runs — pass the verb that fits ("Deleting…") so the busy state
 * still says what is happening.
 *
 * `error` renders a failure in place. The caller still owns error reporting —
 * it catches, decides the message, and passes it back down — but the message
 * belongs *here* rather than on the page behind: this dialog is modal, so a
 * banner underneath it is invisible until the user dismisses the very thing
 * that failed. Without it, a rejected `onConfirm` was swallowed silently and
 * the dialog simply sat there looking like the click had done nothing.
 * Callers must clear `error` when re-opening the dialog.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  loadingLabel,
  destructive = false,
  icon,
  loading = false,
  error,
  onConfirm,
  onCancel,
  // When set, a success toast with this text is shown after `onConfirm`
  // resolves without throwing (e.g. "Deleted successfully").
  successMessage,
}) {
  const { t } = useTranslation()
  const showToast = useToast()

  // Run the confirm action, then announce success via a toast. If it throws,
  // the caller surfaces the error and no success toast is shown.
  const handleConfirm = async () => {
    try {
      await onConfirm?.()
      if (successMessage) showToast(successMessage, { type: 'success' })
    } catch {
      // swallow: the caller owns error reporting; just skip the success toast
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !loading && onCancel?.()}
      size="sm"
      hideHeader
      footer={
        // `min-w-0` lets both buttons shrink to an equal share (flex items
        // otherwise refuse to go below their text width, so a long confirm
        // label made that button wider); `items-stretch` keeps them the same
        // height even when one label wraps to two lines.
        <div className="flex w-full items-stretch gap-3">
          <Button
            variant="secondary"
            className="min-w-0 flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            className="min-w-0 flex-1"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading
              ? (loadingLabel ?? t('common.working'))
              : (confirmLabel ?? t('common.create'))}
          </Button>
        </div>
      }
    >
      {/* Centered layout: a haloed icon states the stakes, then the heading and
          message, so the prompt reads as a single focused moment. */}
      <div className="pt-1 text-center">
        <span
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            destructive
              ? 'bg-red-100 text-red-600 ring-8 ring-red-50 dark:bg-red-500/15 dark:text-red-400 dark:ring-red-500/5'
              : 'bg-amber-100 text-amber-600 ring-8 ring-amber-50 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/5'
          }`}
        >
          <Icon name={icon ?? (destructive ? 'trash' : 'alert')} className="h-7 w-7" />
        </span>
        {title && (
          <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
        )}
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">
          {message}
        </p>
        {error && (
          <p
            role="alert"
            className="mx-auto mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
