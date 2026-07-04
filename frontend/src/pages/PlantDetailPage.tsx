import { useParams } from 'react-router-dom'
import { AssetsPage } from './AssetsPage'
import { parsePositiveNumber } from '../shared/utils'

export function PlantDetailPage() {
  const params = useParams()
  const plantId = parsePositiveNumber(params.plantId)

  return <AssetsPage forcedPlantId={plantId ?? null} />
}
