import { useParams } from 'react-router-dom'
import { AssetsPage } from './AssetsPage'
import { parsePositiveNumber } from '../shared/utils'

export function ZoneDetailPage() {
  const params = useParams()
  const zoneId = parsePositiveNumber(params.zoneId)

  return <AssetsPage forcedZoneId={zoneId ?? null} />
}
