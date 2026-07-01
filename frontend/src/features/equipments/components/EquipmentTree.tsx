import { StatusBadge } from '../../../shared/components/state/StatusBadge'
import {
  getResourceStatusLabel,
  getResourceStatusTone,
} from '../../plants/types'
import { EquipmentTreeNode, getEquipmentTypeLabel } from '../types'

type EquipmentTreeProps = {
  nodes: EquipmentTreeNode[]
  onEdit: (node: EquipmentTreeNode) => void
  onDeactivate: (node: EquipmentTreeNode) => void
}

export function EquipmentTree({
  nodes,
  onEdit,
  onDeactivate,
}: EquipmentTreeProps) {
  return (
    <div className="tree-list">
      {nodes.map((node) => (
        <EquipmentTreeCard
          key={node.equipmentId}
          node={node}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
        />
      ))}
    </div>
  )
}

type EquipmentTreeCardProps = {
  node: EquipmentTreeNode
  onEdit: (node: EquipmentTreeNode) => void
  onDeactivate: (node: EquipmentTreeNode) => void
}

function EquipmentTreeCard({
  node,
  onEdit,
  onDeactivate,
}: EquipmentTreeCardProps) {
  return (
    <article className="tree-node">
      <div className="tree-node-header">
        <div className="stack-sm">
          <div className="inline-actions">
            <StatusBadge label={getEquipmentTypeLabel(node.equipmentType)} />
            <StatusBadge
              label={getResourceStatusLabel(node.status)}
              tone={getResourceStatusTone(node.status)}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{node.name}</h3>
            <p className="text-sm text-slate-600">
              {node.positionCode ? `위치 코드 ${node.positionCode}` : '위치 코드 없음'}
            </p>
          </div>
        </div>
        <div className="inline-actions">
          <button className="text-button" type="button" onClick={() => onEdit(node)}>
            수정
          </button>
          <button
            className="text-button text-button-danger"
            type="button"
            onClick={() => onDeactivate(node)}
          >
            비활성화
          </button>
        </div>
      </div>
      {node.children.length > 0 ? (
        <div className="tree-node-children">
          {node.children.map((child) => (
            <EquipmentTreeCard
              key={child.equipmentId}
              node={child}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
            />
          ))}
        </div>
      ) : null}
    </article>
  )
}
