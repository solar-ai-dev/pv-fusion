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

export type RgbDefectChip =
  | {
      kind: 'single'
      className: RgbClassName
      label: string
      hex: string
    }
  | {
      kind: 'split'
      classNames: [RgbClassName, RgbClassName]
      label: string
      hexes: [string, string]
      note: string
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

export function getRgbDefectChip(defect: DetectedDefect): RgbDefectChip | null {
  if (defect.defectSource !== 'RGB') {
    return null
  }

  switch (defect.defectType) {
    case 'VEGETATION':
      return {
        kind: 'single',
        className: 'bitki',
        label: RGB_PALETTE_BY_CLASS.bitki.label,
        hex: RGB_PALETTE_BY_CLASS.bitki.hex,
      }
    case 'DUST':
      return {
        kind: 'single',
        className: 'dusty',
        label: RGB_PALETTE_BY_CLASS.dusty.label,
        hex: RGB_PALETTE_BY_CLASS.dusty.hex,
      }
    case 'SHADING':
      return {
        kind: 'single',
        className: 'shading',
        label: RGB_PALETTE_BY_CLASS.shading.label,
        hex: RGB_PALETTE_BY_CLASS.shading.hex,
      }
    case 'APPEARANCE_DAMAGE':
      return {
        kind: 'split',
        classNames: ['broken', 'missing'],
        label: '파손/누락',
        hexes: [RGB_PALETTE_BY_CLASS.broken.hex, RGB_PALETTE_BY_CLASS.missing.hex],
        note: '현재 Public API에는 원본 RGB class 정보가 없어 broken/missing를 분리할 수 없습니다.',
      }
    default:
      return null
  }
}
