/**
 * Client-side mirror of `backend/src/utils/slug.js`, used only to preview and
 * pre-fill the storefront link while the admin types a business name.
 *
 * The backend stays authoritative — it re-validates, resolves collisions and
 * may hand back a different slug (mamo → mamo-2). Treat what this returns as a
 * suggestion, never as the final link.
 */
const ARABIC = 'ء-غف-يٮ-ۓ۰-۹ݐ-ݿ'
const TASHKEEL = /[ً-ْٰـ]/g

export const SLUG_MAX = 80

export function slugify(value) {
  if (value == null) return ''
  let s = String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(TASHKEEL, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_./\\]+/g, '-')
    .replace(new RegExp(`[^a-z0-9${ARABIC}-]`, 'g'), '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!s) return ''
  if (/^\d+$/.test(s)) s = `m-${s}`
  return s.slice(0, SLUG_MAX).replace(/-+$/g, '')
}
