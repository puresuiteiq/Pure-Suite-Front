import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../ui/Icon'
import Select from '../ui/Select'
import { currencySuffix } from '../../utils/format'
import { serviceMethodKeysForMode, methodLabelKey } from '../../config/serviceMethods'
import { modeForBusinessType } from '../../config/businessCategories'
import { IRAQ_GOVERNORATES } from '../../config/iraqGovernorates'

const TOGGLE =
  'relative h-7 w-12 rounded-full bg-slate-300 shadow-inner transition-all duration-300 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-300 peer-checked:bg-emerald-500 peer-checked:shadow-[0_0_22px_rgba(16,185,129,.45)] peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5 dark:bg-slate-800'

const METHOD_ICON = { delivery: 'send', dinein: 'store', pickup: 'cart' }

const cleanFee = (value) => Math.max(0, Math.round(Number(value) || 0))
const cleanAreas = (areas) =>
  (Array.isArray(areas) ? areas : []).map((area) => ({
    name: String(area?.name ?? ''),
    fee: cleanFee(area?.fee),
  }))

export default function ServiceMethodsEditor({ businessType, value, onChange }) {
  const { t } = useTranslation()
  const [bulkFee, setBulkFee] = useState(0)
  const methodKeys = serviceMethodKeysForMode(modeForBusinessType(businessType))
  const governorateOptions = IRAQ_GOVERNORATES.map((g) => ({
    value: t(`governorates.${g}`),
    label: t(`governorates.${g}`),
  }))

  const zones = Array.isArray(value.delivery?.zones) ? value.delivery.zones : []

  const toggle = (key) => (e) =>
    onChange({ ...value, [key]: { ...value[key], enabled: e.target.checked } })

  const setZones = (nextZones) =>
    onChange({ ...value, delivery: { ...value.delivery, zones: nextZones } })

  const addZone = () => setZones([...zones, { name: '', fee: 0, areas: [] }])
  const addAllGovernorates = () => {
    const existing = new Set(zones.map((zone) => String(zone.name)))
    const additions = governorateOptions
      .filter((option) => !existing.has(option.value))
      .map((option) => ({ name: option.value, fee: cleanFee(bulkFee), areas: [] }))
    if (additions.length) setZones([...zones, ...additions])
  }
  const setAllFees = () =>
    setZones(zones.map((zone) => ({ ...zone, fee: cleanFee(bulkFee) })))
  const updateZone = (i, field, nextValue) =>
    setZones(zones.map((zone, idx) => (idx === i ? { ...zone, [field]: nextValue } : zone)))
  const removeZone = (i) => setZones(zones.filter((_, idx) => idx !== i))

  const addArea = (zoneIndex) =>
    setZones(zones.map((zone, idx) =>
      idx === zoneIndex
        ? { ...zone, areas: [...cleanAreas(zone.areas), { name: '', fee: cleanFee(zone.fee) }] }
        : zone,
    ))
  const updateArea = (zoneIndex, areaIndex, field, nextValue) =>
    setZones(zones.map((zone, idx) => {
      if (idx !== zoneIndex) return zone
      const areas = cleanAreas(zone.areas).map((area, aIdx) =>
        aIdx === areaIndex ? { ...area, [field]: nextValue } : area,
      )
      return { ...zone, areas }
    }))
  const removeArea = (zoneIndex, areaIndex) =>
    setZones(zones.map((zone, idx) =>
      idx === zoneIndex
        ? { ...zone, areas: cleanAreas(zone.areas).filter((_, aIdx) => aIdx !== areaIndex) }
        : zone,
    ))

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
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {t('profile.service.deliveryZonesTitle')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t('profile.service.deliveryZonesHint')}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="relative w-full sm:w-36">
                      <span className="mb-1 block text-[11px] font-semibold text-slate-400">
                        {t('profile.service.bulkFee')}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={bulkFee}
                        onChange={(event) => setBulkFee(cleanFee(event.target.value))}
                        className="form-input pe-12 text-start"
                      />
                      <span className="pointer-events-none absolute bottom-3 end-3 text-xs text-slate-400">
                        {currencySuffix()}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={addAllGovernorates}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                    >
                      <Icon name="plus" className="h-4 w-4" />
                      {t('profile.service.addAllGovernorates')}
                    </button>
                    {zones.length > 0 && (
                      <button
                        type="button"
                        onClick={setAllFees}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                      >
                        <Icon name="check" className="h-4 w-4" />
                        {t('profile.service.applyFeeToAll')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {zones.length === 0 && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      {t('profile.service.noZones')}
                    </p>
                  )}
                  {zones.map((zone, i) => {
                    const areas = cleanAreas(zone.areas)
                    return (
                      <div key={i} className="rounded-2xl border border-slate-200/80 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex">
                          <div className="col-span-2 min-w-0 sm:flex-1">
                            <Select
                              value={zone.name}
                              onChange={(next) => updateZone(i, 'name', next)}
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
                              onChange={(event) => updateZone(i, 'fee', cleanFee(event.target.value))}
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

                        <div className="mt-3 rounded-xl bg-slate-50/80 p-3 dark:bg-white/[0.04]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-slate-500">
                              {t('profile.service.areasTitle')}
                            </p>
                            <button
                              type="button"
                              onClick={() => addArea(i)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5"
                            >
                              <Icon name="plus" className="h-3.5 w-3.5" />
                              {t('profile.service.addArea')}
                            </button>
                          </div>

                          {areas.length === 0 ? (
                            <p className="mt-2 text-xs text-slate-400">
                              {t('profile.service.noAreas')}
                            </p>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {areas.map((area, areaIndex) => (
                                <div key={areaIndex} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
                                  <input
                                    type="text"
                                    value={area.name}
                                    onChange={(event) => updateArea(i, areaIndex, 'name', event.target.value)}
                                    placeholder={t('profile.service.areaNamePlaceholder')}
                                    className="form-input text-sm"
                                  />
                                  <div className="relative w-28">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={area.fee}
                                      onChange={(event) => updateArea(i, areaIndex, 'fee', cleanFee(event.target.value))}
                                      className="form-input pe-10 text-start text-sm"
                                      aria-label={t('profile.service.zoneFee')}
                                    />
                                    <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                                      {currencySuffix()}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeArea(i, areaIndex)}
                                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                    aria-label={t('profile.service.removeArea')}
                                  >
                                    <Icon name="trash" className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
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
