/**
 * RGB/Thermal 결함 표시 taxonomy
 *
 * 확정 기준 클래스:
 *  RGB    : bitki (식생), dust (먼지), missing (누락), shading (음영), broken (손상)
 *  Thermal: diode (다이오드), hotspot (핫스팟), substring (서브스트링)
 *
 * 매핑 원칙:
 *  - 위 8종에 명확히 대응되는 값만 해당 taxonomy 라벨로 표시한다.
 *  - 확정 대응이 없는 값(OVERHEATING, ABNORMAL_HEAT 등)은 원문을 포함해
 *    '기타 열화상 (원문)' 형태로 표시하며 오분류하지 않는다.
 *  - Backend enum / API 계약은 변경하지 않는다.
 */
import type { DefectType, DefectSource } from './types'

export type TaxonomyEntry = {
  label: string
  /** 원본 taxonomy 클래스명 (영문) */
  className: string
  source: 'RGB' | 'THERMAL' | 'COMMON'
}

export const RGB_TAXONOMY: TaxonomyEntry[] = [
  { label: '식생 (Bitki)', className: 'bitki', source: 'RGB' },
  { label: '먼지 (Dust)', className: 'dust', source: 'RGB' },
  { label: '외관 누락 (Missing)', className: 'missing', source: 'RGB' },
  { label: '음영 (Shading)', className: 'shading', source: 'RGB' },
  { label: '외관 손상 (Broken)', className: 'broken', source: 'RGB' },
]

export const THERMAL_TAXONOMY: TaxonomyEntry[] = [
  { label: '다이오드 결함 (Diode)', className: 'diode', source: 'THERMAL' },
  { label: '핫스팟 (Hotspot)', className: 'hotspot', source: 'THERMAL' },
  { label: '서브스트링 결함 (Substring)', className: 'substring', source: 'THERMAL' },
]

export const ALL_TAXONOMY = [...RGB_TAXONOMY, ...THERMAL_TAXONOMY]

/**
 * Backend DefectType enum → taxonomy 표시 라벨 매핑.
 *
 * 규칙:
 *  - 8종 taxonomy에 확실히 대응되는 경우만 해당 라벨을 사용한다.
 *  - OVERHEATING / ABNORMAL_HEAT 는 일반 열화상 이상 상태이므로
 *    thermal taxonomy(diode/hotspot/substring)와 동일시하지 않는다.
 *  - UNKNOWN 및 미등록 값은 getDefectTaxonomyLabel 함수에서 원문 포함 처리한다.
 */
const DEFECT_TYPE_LABEL_MAP: Partial<Record<DefectType, string>> = {
  // RGB taxonomy 대응
  VEGETATION: '식생 (Bitki)',
  DUST: '먼지 (Dust)',
  APPEARANCE_DAMAGE: '외관 손상 (Missing/Broken)',
  SHADING: '음영 (Shading)',

  // RGB taxonomy 외 RGB 계열 — 원문 포함 표시
  CONTAMINATION: '오염',
  LEAF: '낙엽',
  BIRD_DROPPING: '조류 배설물',

  // Thermal taxonomy 확정 대응
  HOTSPOT: '핫스팟 (Hotspot)',

  // 일반 열화상 이상 상태 — taxonomy 오분류 방지를 위해 별도 표시
  OVERHEATING: '기타 열화상 (과열)',
  ABNORMAL_HEAT: '기타 열화상 (이상 발열)',

  // 미분류
  UNKNOWN: '기타',
}

/**
 * DefectType → 사용자 표시 라벨.
 *
 * - 알 수 없는 값(enum 외 문자열 포함)은 원문을 함께 표시한다.
 * - 원문이 없으면 '기타'로 표시한다.
 * - isKnown: taxonomy 8종 중 하나에 확정 대응되는지 여부.
 */
export function getDefectTaxonomyLabel(
  defectType?: DefectType | string | null,
): { label: string; isKnown: boolean } {
  if (!defectType) return { label: '-', isKnown: false }

  const mapped = DEFECT_TYPE_LABEL_MAP[defectType as DefectType]
  if (mapped) {
    const isCoreMatch = ALL_TAXONOMY.some((t) =>
      mapped.toLowerCase().includes(t.className),
    )
    return { label: mapped, isKnown: isCoreMatch }
  }

  return { label: `기타 (${defectType})`, isKnown: false }
}

/** DefectSource → 이미지 유형 라벨 */
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

/** 결과의 입력 유형 (inputType) → 이미지 유형 라벨 */
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
