/**
 * The 19 governorates of Iraq. Used to populate the delivery-zone picker so a
 * merchant chooses a province (each with its own fee) instead of typing a name.
 * Labels live in i18n under `governorates.<key>`; a stored zone name that isn't
 * a known key is shown as-is (so older free-text zones still work).
 */
export const IRAQ_GOVERNORATES = [
  'baghdad',
  'basra',
  'nineveh',
  'erbil',
  'sulaymaniyah',
  'duhok',
  'kirkuk',
  'najaf',
  'karbala',
  'wasit',
  'maysan',
  'dhiqar',
  'muthanna',
  'qadisiyyah',
  'babil',
  'diyala',
  'anbar',
  'saladin',
  'halabja',
]

const KNOWN = new Set(IRAQ_GOVERNORATES)

/** Display label for a stored zone value: a translated governorate, or the raw
 *  string when it's a custom/legacy name. `t` is a translation function. */
export const governorateLabel = (value, t) =>
  KNOWN.has(value) ? t(`governorates.${value}`) : value
