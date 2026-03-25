import { useEffect, useRef, useMemo, useState } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import { drag as d3Drag } from 'd3-drag'
import { select } from 'd3-selection'
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom'
import { Input } from '@/components/ui/input'
import { X, Search } from 'lucide-react'
import type { Issue, ProjectUser, IssueType } from '@/types/issue'

/* ── Types ─────────────────────────────────────────── */

interface GraphNode extends SimulationNodeDatum {
  id: string
  label: string
  shortLabel?: string
  type: 'person' | 'issue'
  group?: string
  issueCount?: number
  status?: string
  title?: string
  colorIndex?: number
  unassigned?: boolean
  unresolvedUser?: boolean
}

type LinkRole = 'assigns' | 'receives'

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
  role: LinkRole
}

interface Props {
  issues: Issue[]
  users: ProjectUser[]
  issueTypes: IssueType[]
}

/* ── Color palette ─────────────────────────────────── */

// Single color for all person nodes
const PERSON_COLOR = '#3b82f6' // blue

// Issue node outline colors (varied)
const ISSUE_OUTLINE_PALETTE = [
  '#f97316', // orange
  '#06b6d4', // cyan
  '#8b5cf6', // purple
  '#22c55e', // green
  '#ec4899', // pink
  '#eab308', // yellow
  '#3b82f6', // blue
  '#ef4444', // red
]

const CREATOR_LINK_COLOR = '#f97316'
const ASSIGNEE_LINK_COLOR = '#22c55e'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  pending: 'Pendiente',
  in_review: 'En revisión',
  closed: 'Cerrado',
  void: 'Anulado',
}

function normalizeUserKey(value: string | null | undefined) {
  if (!value) return null

  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  return normalized
}

function looksLikeOpaqueUserId(value: string) {
  const trimmed = value.trim()
  return /^[A-Z0-9]{10,}$/i.test(trimmed) && !trimmed.includes(' ')
}

function readStringCandidate(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function readNestedName(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  return (
    readStringCandidate(record.name) ||
    readStringCandidate(record.displayName) ||
    readStringCandidate(record.fullName) ||
    readStringCandidate(record.userName)
  )
}

/** Convert hex to rgba */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/* ── Component ─────────────────────────────────────── */

export default function ForceGraph({ issues, users, issueTypes }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 })
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [isSettling, setIsSettling] = useState(true)

  const userMap = useMemo(() => {
    const map = new Map<string, ProjectUser>()
    for (const user of users) {
      for (const key of [user.id, user.autodeskId, user.userId].filter(Boolean) as string[]) {
        map.set(key, user)

        const normalizedKey = normalizeUserKey(key)
        if (normalizedKey) {
          map.set(normalizedKey, user)
        }
      }
    }
    return map
  }, [users])

  const typeMap = useMemo(
    () => new Map(issueTypes.map((t) => [t.id, t.title])),
    [issueTypes]
  )

  const issueUserNameHints = useMemo(() => {
    const hints = new Map<string, string>()

    function addHint(userId: string | null | undefined, ...candidates: Array<unknown>) {
      const normalizedKey = normalizeUserKey(userId)
      if (!normalizedKey || hints.has(normalizedKey)) return

      const candidate =
        candidates
          .map((value) => readStringCandidate(value) || readNestedName(value))
          .find((value): value is string => Boolean(value && !looksLikeOpaqueUserId(value))) ?? null

      if (candidate) {
        hints.set(normalizedKey, candidate)
      }
    }

    for (const issue of issues) {
      const rawIssue = issue as unknown as Record<string, unknown>

      addHint(
        issue.assignedTo,
        rawIssue.assignedToName,
        rawIssue.assignedToDisplayName,
        rawIssue.assignedToFullName,
        rawIssue.assignedToUserName,
        rawIssue.assigneeName,
        rawIssue.assigneeDisplayName,
        rawIssue.assignedToUser,
        rawIssue.assignee,
      )

      addHint(
        issue.ownerId ?? issue.createdBy,
        rawIssue.ownerName,
        rawIssue.ownerName,
        rawIssue.ownerDisplayName,
        rawIssue.ownerFullName,
        rawIssue.createdByName,
        rawIssue.createdByDisplayName,
        rawIssue.createdByFullName,
        rawIssue.creatorName,
        rawIssue.owner,
        rawIssue.createdByUser,
        rawIssue.creator,
      )
    }

    return hints
  }, [issues])

  function getUserDisplayName(userId: string) {
    const hintedName = normalizeUserKey(userId) ? issueUserNameHints.get(normalizeUserKey(userId)!) : null
    if (hintedName) {
      return { label: hintedName, unresolved: false }
    }

    const directMatch = userMap.get(userId)
    if (directMatch?.name?.trim()) {
      return { label: directMatch.name.trim(), unresolved: false }
    }

    const normalizedUserId = normalizeUserKey(userId)
    const normalizedMatch = normalizedUserId
      ? userMap.get(normalizedUserId)
      : undefined

    if (normalizedMatch?.name?.trim()) {
      return { label: normalizedMatch.name.trim(), unresolved: false }
    }

    const fallbackMatch = users.find((user) => {
      const keys = [user.id, user.autodeskId, user.userId]
        .filter((key): key is string => Boolean(key))
        .map((key) => key.trim().toLowerCase())

      const target = userId.trim().toLowerCase()
      return keys.some((key) => key === target || key.endsWith(target) || target.endsWith(key))
    })

    if (fallbackMatch?.name?.trim()) {
      return { label: fallbackMatch.name.trim(), unresolved: false }
    }

    if (looksLikeOpaqueUserId(userId)) {
      return { label: 'Usuario sin nombre', unresolved: true }
    }

    return { label: 'Usuario sin nombre', unresolved: true }
  }

  // Build graph data
  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>()
    const linkList: GraphLink[] = []

    const personIssueCounts = new Map<string, number>()
    for (const issue of issues) {
      if (issue.assignedTo) {
        personIssueCounts.set(issue.assignedTo, (personIssueCounts.get(issue.assignedTo) ?? 0) + 1)
      }
      const creatorId = issue.ownerId ?? issue.createdBy
      if (creatorId) {
        personIssueCounts.set(creatorId, (personIssueCounts.get(creatorId) ?? 0) + 1)
      }
    }

    let personColorIdx = 0
    function ensurePersonNode(personId: string) {
      const key = `person-${personId}`
      if (!nodeMap.has(key)) {
        const display = getUserDisplayName(personId)
        nodeMap.set(key, {
          id: key,
          label: display.label,
          shortLabel: display.unresolved ? undefined : display.label,
          type: 'person',
          issueCount: personIssueCounts.get(personId) ?? 0,
          colorIndex: personColorIdx++,
          unresolvedUser: display.unresolved,
        })
      }
    }

    let issueColorIdx = 0
    for (const issue of issues) {
      const hasAssignee = !!issue.assignedTo
      const creatorId = issue.ownerId ?? issue.createdBy
      const hasCreator = !!creatorId

      if (!hasAssignee && !hasCreator) continue

      const issueNodeId = `issue-${issue.id}`
      const typeName = issue.issueTypeId ? typeMap.get(issue.issueTypeId) : null
      nodeMap.set(issueNodeId, {
        id: issueNodeId,
        label: `#${issue.displayId}`,
        type: 'issue',
        status: issue.status,
        group: typeName ?? undefined,
        title: issue.title,
        colorIndex: issueColorIdx++,
        unassigned: !hasAssignee,
      })

      if (hasCreator) {
        ensurePersonNode(creatorId!)
        linkList.push({
          source: `person-${creatorId}`,
          target: issueNodeId,
          role: 'assigns',
        })
      }

      if (hasAssignee) {
        ensurePersonNode(issue.assignedTo!)
        if (!hasCreator || creatorId !== issue.assignedTo) {
          linkList.push({
            source: issueNodeId,
            target: `person-${issue.assignedTo}`,
            role: 'receives',
          })
        }
      }
    }

    return { nodes: Array.from(nodeMap.values()), links: linkList }
  }, [issues, userMap, typeMap, issueUserNameHints])

  // Search filter
  const matchedIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return null

    const matchedPersonIds = new Set<string>()
    for (const n of nodes) {
      if (n.type === 'person' && n.label.toLowerCase().includes(q)) {
        matchedPersonIds.add(n.id)
      }
    }

    const visibleIds = new Set<string>(matchedPersonIds)
    for (const l of links) {
      const sId = typeof l.source === 'object' ? l.source.id : l.source
      const tId = typeof l.target === 'object' ? l.target.id : l.target
      if (matchedPersonIds.has(sId)) visibleIds.add(tId)
      if (matchedPersonIds.has(tId)) visibleIds.add(sId)
    }

    return visibleIds
  }, [searchQuery, nodes, links])

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setDimensions({ width, height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // D3 simulation
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) {
      setIsSettling(false)
      return
    }

    const svg = select(svgRef.current)
    const { width, height } = dimensions
    setIsSettling(true)

    svg.selectAll('*').remove()

    const defs = svg.append('defs')

    // Grid pattern
    const pattern = defs
      .append('pattern')
      .attr('id', 'grid')
      .attr('width', 40)
      .attr('height', 40)
      .attr('patternUnits', 'userSpaceOnUse')
    pattern
      .append('path')
      .attr('d', 'M 40 0 L 0 0 0 40')
      .attr('fill', 'none')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.06)
      .attr('stroke-width', 1)

    // Background rect with grid
    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#grid)')

    // Arrow markers — refX=10 so the tip (point of triangle) touches the circle
    defs
      .append('marker')
      .attr('id', 'arrow-assigns')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L10,0L0,4')
      .attr('fill', CREATOR_LINK_COLOR)
      .attr('opacity', 0.7)

    defs
      .append('marker')
      .attr('id', 'arrow-receives')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L10,0L0,4')
      .attr('fill', ASSIGNEE_LINK_COLOR)
      .attr('opacity', 0.7)

    const g = svg.append('g')

    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform))

    svg.call(zoomBehavior)

    const simNodes: GraphNode[] = nodes.map((n) => ({ ...n }))
    const simLinks: GraphLink[] = links.map((l) => ({ ...l }))

    function fitGraph() {
      const validNodes = simNodes.filter(
        (n) => Number.isFinite(n.x) && Number.isFinite(n.y)
      )
      if (validNodes.length === 0) return

      const allX = validNodes.map((n) => n.x as number)
      const allY = validNodes.map((n) => n.y as number)
      const minX = Math.min(...allX)
      const maxX = Math.max(...allX)
      const minY = Math.min(...allY)
      const maxY = Math.max(...allY)
      const padding = 80
      const boundsWidth = Math.max(maxX - minX, 1) + padding * 2
      const boundsHeight = Math.max(maxY - minY, 1) + padding * 2
      const scale = Math.max(0.1, Math.min(width / boundsWidth, height / boundsHeight, 1))
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const transform = zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-cx, -cy)

      svg.call(zoomBehavior.transform, transform)
    }

    let initialFitDone = false

    // Double middle-click → fit all nodes
    let lastMiddleClickTime = 0
    svg.on('auxclick.fitall', (event: MouseEvent) => {
      if (event.button !== 1) return
      const now = Date.now()
      if (now - lastMiddleClickTime < 400) {
        event.preventDefault()
        fitGraph()
        lastMiddleClickTime = 0
      } else {
        lastMiddleClickTime = now
      }
    })

    const simulation = forceSimulation(simNodes)
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(simLinks)
          .id((d) => d.id)
          .distance(70)
          .strength(0.25)
      )
      .force('charge', forceManyBody().strength(-150))
      .force('center', forceCenter(0, 0))
      .force(
        'collide',
        forceCollide().radius((node) => {
          const d = node as GraphNode
          return d.type === 'person' ? 30 : 10
        })
      )

    // Helper: get person color
    function getPersonColor(_d: GraphNode): string {
      return PERSON_COLOR
    }

    // Helper: get issue outline color
    function getIssueColor(d: GraphNode): string {
      return ISSUE_OUTLINE_PALETTE[(d.colorIndex ?? 0) % ISSUE_OUTLINE_PALETTE.length]
    }

    // Helper: person radius
    function personRadius(d: GraphNode): number {
      return Math.max(14, Math.min(40, 10 + (d.issueCount ?? 0) * 2))
    }

    // Draw links — curved paths
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGPathElement, GraphLink>('path')
      .data(simLinks)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', (d) => (d.role === 'assigns' ? CREATOR_LINK_COLOR : ASSIGNEE_LINK_COLOR))
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', 1.2)
      .attr('marker-end', (d) => `url(#arrow-${d.role})`)

    // Draw nodes
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'grab')

    // Person nodes — thick outline, light fill
    node
      .filter((d) => d.type === 'person')
      .append('circle')
      .attr('r', personRadius)
      .attr('fill', (d) => hexToRgba(getPersonColor(d), 0.15))
      .attr('stroke', getPersonColor)
      .attr('stroke-width', 3)

    // Issue nodes — assigned: outlined circles; unassigned: dashed gray
    const UNASSIGNED_COLOR = '#94a3b8'

    node
      .filter((d) => d.type === 'issue' && !d.unassigned)
      .append('circle')
      .attr('r', 6)
      .attr('fill', (d) => hexToRgba(getIssueColor(d), 0.18))
      .attr('stroke', getIssueColor)
      .attr('stroke-width', 2)

    node
      .filter((d) => d.type === 'issue' && !!d.unassigned)
      .append('circle')
      .attr('r', 6)
      .attr('fill', hexToRgba(UNASSIGNED_COLOR, 0.1))
      .attr('stroke', UNASSIGNED_COLOR)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '3,2')

    // Labels for person nodes
    node
      .filter((d) => d.type === 'person')
      .append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => -(personRadius(d) + 8))
      .attr('fill', 'currentColor')
      .attr('class', 'text-[11px] font-semibold pointer-events-none')
      .attr('paint-order', 'stroke')
      .attr('stroke', 'var(--background, #fff)')
      .attr('stroke-width', 3)

    // Apply search filter visibility
    function applySearchFilter() {
      if (!matchedIds) return
      node.attr('opacity', (d) => (matchedIds.has(d.id) ? 1 : 0.06))
      link.attr('stroke-opacity', (l) => {
        const sId = typeof l.source === 'object' ? l.source.id : l.source
        const tId = typeof l.target === 'object' ? l.target.id : l.target
        return matchedIds.has(sId) && matchedIds.has(tId) ? 0.5 : 0.02
      })
    }
    applySearchFilter()

    // Hover
    node.on('mouseenter', function (event, d) {
      setHoveredNode(d)
      setTooltipPos({ x: event.clientX, y: event.clientY })

      const connectedIds = new Set<string>()
      connectedIds.add(d.id)
      simLinks.forEach((l) => {
        const sId = typeof l.source === 'object' ? l.source.id : l.source
        const tId = typeof l.target === 'object' ? l.target.id : l.target
        if (sId === d.id) connectedIds.add(tId)
        if (tId === d.id) connectedIds.add(sId)
      })

      node.attr('opacity', (n) => (connectedIds.has(n.id) ? 1 : 0.06))
      link
        .attr('stroke-opacity', (l) => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source
          const tId = typeof l.target === 'object' ? l.target.id : l.target
          return sId === d.id || tId === d.id ? 0.7 : 0.02
        })
        .attr('stroke-width', (l) => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source
          const tId = typeof l.target === 'object' ? l.target.id : l.target
          return sId === d.id || tId === d.id ? 2.5 : 1
        })
    })

    node.on('mouseleave', function () {
      setHoveredNode(null)
      if (matchedIds) {
        node.attr('opacity', (d) => (matchedIds.has(d.id) ? 1 : 0.06))
        link
          .attr('stroke-opacity', (l) => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source
            const tId = typeof l.target === 'object' ? l.target.id : l.target
            return matchedIds.has(sId) && matchedIds.has(tId) ? 0.5 : 0.02
          })
          .attr('stroke-width', 1.2)
      } else {
        node.attr('opacity', 1)
        link.attr('stroke-opacity', 0.25).attr('stroke-width', 1.2)
      }
    })

    node.on('mousemove', function (event) {
      setTooltipPos({ x: event.clientX, y: event.clientY })
    })

    // Drag
    const dragBehavior = d3Drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    node.call(dragBehavior)

    // Helper: get node radius
    function nodeRadius(d: GraphNode): number {
      return d.type === 'person' ? personRadius(d) : 6
    }

    // Tick
    simulation.on('tick', () => {
      link.attr('d', (d) => {
        const s = d.source as GraphNode
        const t = d.target as GraphNode
        const dx = t.x! - s.x!
        const dy = t.y! - s.y!
        const dist = Math.sqrt(dx * dx + dy * dy) || 1

        const rSource = nodeRadius(s) + 1
        const rTarget = nodeRadius(t) + 3

        // Shorten start and end to sit outside the circles
        const sx = s.x! + (dx / dist) * rSource
        const sy = s.y! + (dy / dist) * rSource
        const tx = t.x! - (dx / dist) * rTarget
        const ty = t.y! - (dy / dist) * rTarget

        // Perpendicular offset for curve
        const shortened = Math.sqrt((tx - sx) ** 2 + (ty - sy) ** 2) || 1
        const offset = Math.min(30, shortened * 0.2)
        const mx = (sx + tx) / 2 - (dy / dist) * offset
        const my = (sy + ty) / 2 + (dx / dist) * offset

        return `M${sx},${sy} Q${mx},${my} ${tx},${ty}`
      })

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)

      if (!initialFitDone) {
        fitGraph()
        initialFitDone = true
      }
    })

    simulation.on('end', () => {
      fitGraph()
      setIsSettling(false)
    })

    return () => {
      simulation.stop()
    }
  }, [nodes, links, dimensions, matchedIds])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl" ref={containerRef}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      {isSettling && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70">
          <div className="rounded-lg border border-border bg-popover/95 px-4 py-3 shadow-sm">
            <p className="text-sm font-medium">Cargando...</p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="absolute top-3 left-3 z-10">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar persona…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-56 text-sm pl-8 pr-8 bg-popover/90 border-border shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {matchedIds && (
          <p className="text-[11px] text-muted-foreground mt-1 ml-1">
            {[...matchedIds].filter((id) => id.startsWith('person-')).length} persona(s) encontrada(s)
          </p>
        )}
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="fixed z-50 pointer-events-none bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-sm max-w-64"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 12 }}
        >
          <p className="font-semibold">{hoveredNode.label}</p>
          {hoveredNode.type === 'person' && (
            <>
              <p className="text-muted-foreground text-xs">
                {hoveredNode.issueCount} issue{hoveredNode.issueCount !== 1 ? 's' : ''} vinculados
              </p>
              {hoveredNode.unresolvedUser && (
                <p className="text-muted-foreground text-xs">
                  No se pudo resolver el nombre desde ACC para este usuario.
                </p>
              )}
            </>
          )}
          {hoveredNode.type === 'issue' && (
            <>
              {hoveredNode.title && (
                <p className="text-xs line-clamp-2">{hoveredNode.title}</p>
              )}
              {hoveredNode.unassigned && (
                <p className="text-xs font-medium text-amber-500">Sin asignar</p>
              )}
              <p className="text-xs text-muted-foreground">
                Estado: {STATUS_LABELS[hoveredNode.status ?? ''] ?? hoveredNode.status}
              </p>
              {hoveredNode.group && (
                <p className="text-xs text-muted-foreground">Tipo: {hoveredNode.group}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-popover/90 border border-border rounded-lg px-3 py-2 text-xs space-y-1.5 shadow-sm">
        <p className="font-medium text-[11px] text-muted-foreground mb-1">Nodos</p>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-blue-500/15" />
          <span>Persona</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-orange-400 bg-orange-400/15" />
          <span>Issue asignado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-dashed border-slate-400 bg-slate-400/10" />
          <span>Issue sin asignar</span>
        </div>
        <div className="border-t border-border/50 my-1" />
        <p className="font-medium text-[11px] text-muted-foreground mb-1">Flechas</p>
        <div className="flex items-center gap-2">
          <svg width="20" height="10" className="shrink-0">
            <line x1="0" y1="5" x2="14" y2="5" stroke={CREATOR_LINK_COLOR} strokeWidth="2" />
            <polygon points="14,1 20,5 14,9" fill={CREATOR_LINK_COLOR} />
          </svg>
          <span>Crea / asigna</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="20" height="10" className="shrink-0">
            <line x1="0" y1="5" x2="14" y2="5" stroke={ASSIGNEE_LINK_COLOR} strokeWidth="2" />
            <polygon points="14,1 20,5 14,9" fill={ASSIGNEE_LINK_COLOR} />
          </svg>
          <span>Recibe</span>
        </div>
      </div>
    </div>
  )
}
