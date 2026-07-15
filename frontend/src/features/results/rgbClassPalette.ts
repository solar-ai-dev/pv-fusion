import type { AnalysisResult, DetectedDefect } from './types'

export type RgbClassName = 'broken' | 'bitki' | 'dusty' | 'missing' | 'shading'

export type RgbPaletteEntry = {
  classId: number
  className: RgbClassName
  label: string
  hex: string
  rgb: [number, number, number]
  openCvBgr: [number, number, number]
}

export type RgbDefectChip = {
  label: string
  hex: string
  isLegacyFallback: boolean
}

export const RGB_CLASS_PALETTE: RgbPaletteEntry[] = [
  {
    classId: 0,
    className: 'broken',
    label: '파손',
    hex: '#D55E00',
    rgb: [213, 94, 0],
    openCvBgr: [0, 94, 213],
  },
  {
    classId: 1,
    className: 'bitki',
    label: '식생',
    hex: '#009E73',
    rgb: [0, 158, 115],
    openCvBgr: [115, 158, 0],
  },
  {
    classId: 2,
    className: 'dusty',
    label: '먼지·오염',
    hex: '#E69F00',
    rgb: [230, 159, 0],
    openCvBgr: [0, 159, 230],
  },
  {
    classId: 3,
    className: 'missing',
    label: '누락',
    hex: '#CC79A7',
    rgb: [204, 121, 167],
    openCvBgr: [167, 121, 204],
  },
  {
    classId: 4,
    className: 'shading',
    label: '음영',
    hex: '#0072B2',
    rgb: [0, 114, 178],
    openCvBgr: [178, 114, 0],
  },
]

const RGB_PALETTE_BY_CLASS = Object.fromEntries(
  RGB_CLASS_PALETTE.map((entry) => [entry.className, entry]),
) as Record<RgbClassName, RgbPaletteEntry>

const LEGACY_RGB_CHIP: RgbDefectChip = {
  label: '외관 이상',
  hex: '#94A3B8',
  isLegacyFallback: true,
}

export function isRgbResult(result: AnalysisResult): boolean {
  return (
    result.inputType === 'RGB_SINGLE' ||
    result.modelType === 'RGB_ONLY' ||
    result.detections.some((defect) => defect.defectSource === 'RGB')
  )
}

export function getRgbLegendEntries(): RgbPaletteEntry[] {
  return RGB_CLASS_PALETTE
}

export function normalizeRgbClassName(modelClassName?: string | null): RgbClassName | null {
  const normalized = modelClassName?.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  return normalized in RGB_PALETTE_BY_CLASS ? (normalized as RgbClassName) : null
}

export function getRgbPaletteEntry(modelClassName?: string | null): RgbPaletteEntry | null {
  const className = normalizeRgbClassName(modelClassName)
  return className ? RGB_PALETTE_BY_CLASS[className] : null
}

function toSingleChip(entry: RgbPaletteEntry): RgbDefectChip {
  return {
    label: entry.label,
    hex: entry.hex,
    isLegacyFallback: false,
  }
}

export function getRgbDefectChip(
  defect: Pick<
    DetectedDefect,
    'defectSource' | 'defectType' | 'modelClassId' | 'modelClassName'
  >,
): RgbDefectChip | null {
  if (defect.defectSource !== 'RGB') {
    return null
  }

  const paletteEntry = getRgbPaletteEntry(defect.modelClassName)
  if (paletteEntry) {
    return toSingleChip(paletteEntry)
  }

  switch (defect.defectType) {
    case 'VEGETATION':
      return toSingleChip(RGB_PALETTE_BY_CLASS.bitki)
    case 'CONTAMINATION':
    case 'DUST':
      return toSingleChip(RGB_PALETTE_BY_CLASS.dusty)
    case 'SHADING':
      return toSingleChip(RGB_PALETTE_BY_CLASS.shading)
    case 'APPEARANCE_DAMAGE':
      return LEGACY_RGB_CHIP
    default:
      return null
  }
}
