import { getRgbPaletteEntry } from './rgbClassPalette'
import type { DefectSource, DefectType, DetectedDefect } from './types'

export type TaxonomyEntry = {
  label: string
  className: string
  source: 'RGB' | 'THERMAL' | 'COMMON'
}

export const RGB_TAXONOMY: TaxonomyEntry[] = [
  { label: '식생', className: 'bitki', source: 'RGB' },
  { label: '먼지·오염', className: 'dusty', source: 'RGB' },
  { label: '누락', className: 'missing', source: 'RGB' },
  { label: '음영', className: 'shading', source: 'RGB' },
  { label: '파손', className: 'broken', source: 'RGB' },
]

export const THERMAL_TAXONOMY: TaxonomyEntry[] = [
  { label: '다이오드 결함 (Diode)', className: 'diode', source: 'THERMAL' },
  { label: '핫스팟 (Hotspot)', className: 'hotspot', source: 'THERMAL' },
  { label: '서브스트링 결함 (Substring)', className: 'substring', source: 'THERMAL' },
]

export const ALL_TAXONOMY = [...RGB_TAXONOMY, ...THERMAL_TAXONOMY]

const DEFECT_TYPE_LABEL_MAP: Partial<Record<DefectType, string>> = {
  VEGETATION: '식생',
  DUST: '먼지',
  CONTAMINATION: '오염',
  APPEARANCE_DAMAGE: '외관 이상',
  SHADING: '음영',
  LEAF: '낙엽',
  BIRD_DROPPING: '조류 배설물',
  HOTSPOT: '핫스팟 (Hotspot)',
  OVERHEATING: '기타 열화상 (과열)',
  ABNORMAL_HEAT: '기타 열화상 (이상 발열)',
  UNKNOWN: '기타',
}

export function getDefectTaxonomyLabel(
  defectType?: DefectType | string | null,
): { label: string; isKnown: boolean } {
  if (!defectType) {
    return { label: '-', isKnown: false }
  }

  const mapped = DEFECT_TYPE_LABEL_MAP[defectType as DefectType]
  if (mapped) {
    return { label: mapped, isKnown: true }
  }

  return { label: `기타 (${defectType})`, isKnown: false }
}

export function getResultDefectLabel(
  defect: Pick<
    DetectedDefect,
    'defectSource' | 'defectType' | 'modelClassId' | 'modelClassName'
  >,
): { label: string; isKnown: boolean } {
  if (defect.defectSource === 'RGB') {
    const paletteEntry = getRgbPaletteEntry(defect.modelClassName)
    if (paletteEntry) {
      return { label: paletteEntry.label, isKnown: true }
    }
  }

  return getDefectTaxonomyLabel(defect.defectType)
}

export function getDefectSourceLabel(source?: DefectSource | null): string {
  switch (source) {
    case 'RGB':
      return 'RGB'
    case 'THERMAL':
      return '열화상'
    default:
      return '-'
  }
}

export function getInputTypeShortLabel(inputType?: string | null): string {
  switch (inputType) {
    case 'RGB_SINGLE':
      return 'RGB'
    case 'THERMAL_SINGLE':
      return '열화상'
    default:
      return '-'
  }
}
