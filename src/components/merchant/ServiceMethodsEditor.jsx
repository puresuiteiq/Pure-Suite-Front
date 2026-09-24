import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import Select from '../ui/Select'
import { currencySuffix } from '../../utils/format'
import { serviceMethodKeysForMode, methodLabelKey } from '../../config/serviceMethods'
import { modeForBusinessType } from '../../config/businessCategories'
import { IRAQ_GOVERNORATES } from '../../config/iraqGovernorates'

// Same pill toggle used by the availability/reviews switches on this page.
const TOGGLE =
  'relative h-7 w-12 rounded-full bg-slate-300 shadow-inner transition-all duration-300 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-300 peer-checked:bg-emerald-500 peer-checked:shadow-[0_0_22px_rgba(16,185,129,.45)] peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 dark:bg-slate-800'

const METHOD_ICON = { delivery: 'send', dinein: 'store', pickup: 'cart' }

/**
 * Merchant "Service & delivery" settings — enable the methods the store offers
 * (delivery / dine-in / pickup) and, for delivery, define zones each with a fee.
 * Controlled by the profile form (value = normalized config, onChange = updated
 * config), saved with the page's main Save button.
 */
export default function ServiceMethodsEditor({ businessType, value, onChange }) {
  const { t } = useTranslation()
  // Restaurants offer dine-in; stores only delivery + pickup.
  const methodKeys = serviceMethodKeysForMode(modeForBusinessType(businessType))
  // Delivery zones are chosen from Iraq's governorates. Store the translated
  // label as the value, so the storefront + order message show it as-is.
  const governorateOptions = IRAQ_GOVERNORATES.map((g) => ({
    value: t(`governorates.${g}`),
    label: t(`governorates.${g}`),
  }))

  const toggle = (key) => (e) =>
    onChange({ ...value, [key]: { ...value[key], enabled: e.target.checked } })

  const setZones = (zones) =>
    onChange({ ...value, delivery: { ...value.delivery, zones } })
  const addZone = () => setZones([...value.delivery.zones, { name: '', fee: 0 }])
  const updateZone = (i, field, v) =>
    setZones(value.delivery.zones.map((z, idx) => (idx === i ? { ...z, [field]: v } : z)))
  const removeZone = (i) => setZones(value.delivery.zones.filter((_, idx) => idx !== i))

  return (
    <section className="profile-glass luxury-card p-6 lg:col-span-3">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
        {t('profile.service.title')}
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {t('profile.service.hint')}
      </p>

      <div className="mt-5 space-y-3">
        {methodKeys.map((key) => (
          <div
            key={key}
            className="rounded-2xl border border-slate-200/70 p-4 dark:border-white/10"
          >
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <Icon name={METHOD_ICON[key]} className="h-4 w-4 text-slate-400" />
                {t(methodLabelKey(key))}
              </span>
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={value[key].enabled}
                  onChange={toggle(key)}
                  className="peer sr-only"
                />
                <span className={TOGGLE} />
              </span>
            </label>

            {key === 'delivery' && value.delivery.enabled && (
              <div className="mt-4 border-t border-slate-200/70 pt-4 dark:border-white/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t('profile.service.deliveryZonesTitle')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {t('profile.service.deliveryZonesHint')}
                </p>

                <div className="mt-3 space-y-2">
                  {value.delivery.zones.length === 0 && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      {t('profile.service.noZones')}
                    </p>
                  )}
                  {value.delivery.zones.map((zone, i) => (
                    // Below sm the governorate picker takes its own full-width
                    // row, with the fee and delete button under it. On one row
                    // it pushed them off a phone's screen, and squeezed
                    // "Choose a governorate" to a few letters.
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex">
                      <div className="col-span-2 min-w-0 sm:flex-1">
                        <Select
                          value={zone.name}
                          onChange={(v) => updateZone(i, 'name', v)}
                          placeholder={t('profile.service.zoneNamePlaceholder')}
                          options={governorateOptions}
                        />
                      </div>
                      <div className="relative w-full sm:w-32 sm:shrink-0">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={zone.fee}
                          onChange={(e) =>
                            updateZone(i, 'fee', Math.max(0, Math.round(Number(e.target.value) || 0)))
                          }
                          className="form-input pe-12 text-start"
                          aria-label={t('profile.service.zoneFee')}
                        />
                        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {currencySuffix()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeZone(i)}
                        className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        aria-label={t('profile.service.removeZone')}
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addZone}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:hover:bg-white/5"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  {t('profile.service.addZone')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
