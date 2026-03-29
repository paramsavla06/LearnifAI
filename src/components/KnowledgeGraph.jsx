import { useState, useEffect, useCallback, useMemo } from 'react'
import ReactFlow, {
    Background, Controls, MiniMap,
    useNodesState, useEdgesState,
    MarkerType, Panel, Handle, Position
} from 'reactflow'
import 'reactflow/dist/style.css'
import dagre from 'dagre'
import {
    X, Info, RefreshCw, GitBranch, Link,
    AlertTriangle, CheckCircle, TrendingUp,
    BookOpen, Zap, Target, ChevronRight
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'


const STATUS_COLOR = {
    weak: '#E24B4A',
    average: '#EF9F27',
    strong: '#639922',
    default: '#6b7280',
}

const NODE_W = 180
const NODE_H = 60

function applyDagreLayout(nodes, edges) {
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 })
    nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
    edges.forEach(e => { if (e.source && e.target) g.setEdge(e.source, e.target) })
    dagre.layout(g)
    return nodes.map(n => {
        const pos = g.node(n.id)
        return { ...n, position: { x: pos ? pos.x - NODE_W / 2 : 0, y: pos ? pos.y - NODE_H / 2 : 0 } }
    })
}

// UNCHANGED base node + NEW bottleneck badge
function ConceptNode({ data }) {
    const color = STATUS_COLOR[data.status] || STATUS_COLOR.default
    const dimmed = data.dimmed === true
    return (
        <div
            onClick={() => data.onSelect(data)}
            style={{
                borderColor: color,
                opacity: dimmed ? 0.12 : 1,
                transition: 'opacity 0.2s',
                position: 'relative'
            }}
            className="rounded-xl border-2 bg-[#0d0d0d] px-3 py-2 cursor-pointer hover:brightness-110 transition-all shadow-lg min-w-[140px] max-w-[180px]"
        >
            {/* NEW: bottleneck badge */}
            {data.bottleneck_score > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: -10,
                        right: -6,
                        background: data.bottleneck_score >= 2 ? '#E24B4A' : '#EF9F27',
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 6,
                        whiteSpace: 'nowrap',
                        zIndex: 10,
                        lineHeight: '14px'
                    }}
                >
                    ⚡ blocks {data.bottleneck_score}
                </div>
            )}
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <p className="text-white text-xs font-bold leading-tight truncate">{data.label}</p>
            </div>
            <p className="text-[10px] text-gray-400 truncate ml-3.5">{data.subject}</p>
            <p className="text-[10px] font-bold ml-3.5" style={{ color }}>
                {Math.round((data.accuracy ?? 0) * 100)}% · {data.attempts} attempts
            </p>
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </div>
    )
}

const nodeTypes = { concept: ConceptNode }

// EXTENDED buildFlowData — handles focus dimming + cooccurrence edges + bottleneck filter
function buildFlowData(apiNodes, apiEdges, filters, onSelect, focusedNodeId) {
    let visibleNodes = apiNodes

    // existing weak filter
    if (filters.weakOnly) visibleNodes = visibleNodes.filter(n => n.status === 'weak')

    // NEW: bottleneck filter
    if (filters.bottleneckOnly) visibleNodes = visibleNodes.filter(n => n.bottleneck_score > 0)

    const visibleIds = new Set(visibleNodes.map(n => n.id))

    // NEW: focus mode — compute 1-hop neighbourhood
    let focusSet = null
    if (focusedNodeId && visibleIds.has(focusedNodeId)) {
        focusSet = new Set([focusedNodeId])
        apiEdges.forEach(e => {
            if (e.source === focusedNodeId && visibleIds.has(e.target)) focusSet.add(e.target)
            if (e.target === focusedNodeId && visibleIds.has(e.source)) focusSet.add(e.source)
        })
    }

    const rfNodes = visibleNodes.map(n => ({
        id: n.id,
        type: 'concept',
        position: { x: 0, y: 0 },
        data: {
            ...n,
            onSelect,
            dimmed: focusSet ? !focusSet.has(n.id) : false
        },
    }))

    // filter edges
    let visibleEdges = apiEdges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target))
    if (!filters.showPrereqs) visibleEdges = visibleEdges.filter(e => e.type !== 'prerequisite')
    if (!filters.showSimilarity) visibleEdges = visibleEdges.filter(e => e.type !== 'similar')
    if (!filters.showCooccurrence) visibleEdges = visibleEdges.filter(e => e.type !== 'cooccurrence') // NEW

    const rfEdges = visibleEdges.map(e => {
        // NEW: cooccurrence style
        if (e.type === 'cooccurrence') {
            const w = Math.min(1 + (e.weight || 1), 4)
            const op = Math.min(0.4 + (e.weight || 1) * 0.1, 0.9)
            const edgeFocusDim = focusSet
                ? (!focusSet.has(e.source) || !focusSet.has(e.target) ? 0.04 : op)
                : op
            return {
                id: e.id || `${e.source}-${e.target}`,
                source: e.source,
                target: e.target,
                animated: false,
                style: {
                    stroke: '#EF9F27',
                    strokeWidth: w,
                    strokeDasharray: '4 3',
                    opacity: edgeFocusDim,
                },
            }
        }

        // UNCHANGED existing edge styles + focus dim applied
        const baseOp = focusSet
            ? (!focusSet.has(e.source) || !focusSet.has(e.target) ? 0.04 : 1)
            : 1
        return {
            id: e.id || `${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
            animated: e.type === 'root_cause',
            style: {
                stroke: e.type === 'root_cause' ? '#E24B4A'
                    : e.type === 'similar' ? '#60a5fa'
                        : '#6b7280',
                strokeWidth: 2,
                strokeDasharray: e.type === 'root_cause' ? '6 3'
                    : e.type === 'similar' ? '3 4'
                        : undefined,
                opacity: baseOp,
            },
            markerEnd: e.type !== 'similar' ? {
                type: MarkerType.ArrowClosed,
                color: e.type === 'root_cause' ? '#E24B4A' : '#6b7280',
            } : undefined,
        }
    })

    const laidOut = applyDagreLayout(rfNodes, rfEdges)
    return { nodes: laidOut, edges: rfEdges }
}

function StatusBadge({ status }) {
    const cfg = {
        weak: { icon: AlertTriangle, label: 'Weak', cls: 'text-red-400    bg-red-400/10    border-red-400/20' },
        average: { icon: TrendingUp, label: 'Average', cls: 'text-amber-400  bg-amber-400/10  border-amber-400/20' },
        strong: { icon: CheckCircle, label: 'Strong', cls: 'text-green-400  bg-green-400/10  border-green-400/20' },
    }[status] || { icon: Info, label: status, cls: 'text-gray-400 bg-gray-400/10 border-gray-400/20' }
    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
            <Icon className="w-3 h-3" />{cfg.label}
        </span>
    )
}

// NEW: Study path drawer
function StudyPathDrawer({ plan, onClose, onFocus, onMarkDone }) {
    if (!plan.length) return (
        <div className="absolute left-4 top-16 bottom-4 z-20 w-64 bg-[#0d0d0d]/95 border border-white/10 rounded-2xl p-4 backdrop-blur-xl flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-[#FFD85F] uppercase tracking-widest">Study path</p>
                <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">No weak concepts found. Keep it up!</p>
        </div>
    )
    return (
        <div className="absolute left-4 top-16 bottom-4 z-20 w-64 bg-[#0d0d0d]/95 border border-white/10 rounded-2xl backdrop-blur-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/10">
                <p className="text-xs font-bold text-[#FFD85F] uppercase tracking-widest">Study path</p>
                <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
                {plan.map((item, idx) => {
                    const acc = item.concept_performance?.accuracy ?? 0
                    const bs = item.concept_performance?.bottleneck_score ?? 0
                    const name = item.concepts?.name || item.concept_slug
                    const subj = item.concepts?.subjects?.name || ''
                    const statusColor = item.status === 'done' ? '#639922' : item.status === 'in_progress' ? '#EF9F27' : '#6b7280'
                    return (
                        <div key={item.concept_slug} className="rounded-xl border border-white/8 bg-white/4 p-3">
                            <div className="flex items-start justify-between gap-1 mb-1">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 mb-0.5">
                                        <span className="text-[10px] font-black text-gray-600">#{idx + 1}</span>
                                        <p className="text-xs font-bold text-white truncate">{name}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-500 truncate">{subj}</p>
                                </div>
                                <span
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0"
                                    style={{ color: statusColor, borderColor: statusColor + '40', background: statusColor + '15' }}
                                >
                                    {item.status}
                                </span>
                            </div>
                            {/* accuracy bar */}
                            <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-2">
                                <div className="h-full rounded-full bg-red-500/70" style={{ width: `${Math.round(acc * 100)}%` }} />
                            </div>
                            <div className="flex items-center gap-1.5">
                                {bs > 0 && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                        style={{ background: bs >= 2 ? '#E24B4A22' : '#EF9F2722', color: bs >= 2 ? '#E24B4A' : '#EF9F27' }}>
                                        ⚡ blocks {bs}
                                    </span>
                                )}
                                <button
                                    onClick={() => onFocus(item.concept_slug)}
                                    className="ml-auto text-[10px] font-bold text-gray-400 hover:text-white flex items-center gap-0.5"
                                >
                                    Focus <ChevronRight className="w-3 h-3" />
                                </button>
                                {item.status !== 'done' && (
                                    <button
                                        onClick={() => onMarkDone(item.concept_slug)}
                                        className="text-[10px] font-bold text-green-500 hover:text-green-400"
                                    >
                                        ✓ Done
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// NEW: Co-occurrence strip
function CooccurrenceStrip({ pairs }) {
    if (!pairs.length) return null
    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-[#0d0d0d]/90 border border-white/10 rounded-xl px-4 py-2 backdrop-blur-xl max-w-lg w-full">
            <p className="text-[10px] font-bold text-[#EF9F27] uppercase tracking-widest mb-1.5">Top co-occurring mistakes</p>
            <div className="flex flex-wrap gap-2">
                {pairs.map((p, i) => (
                    <span key={i} className="text-[10px] text-gray-300 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
                        {p.concept_a} ↔ {p.concept_b}
                        <span className="text-amber-400 font-bold ml-1">×{p.wrong_together}</span>
                    </span>
                ))}
            </div>
        </div>
    )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function KnowledgeGraph({ userId: propUserId }) {
    const userId = propUserId || localStorage.getItem('learnifai_user_id') || 'guest'

    const [apiData, setApiData] = useState({ nodes: [], edges: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selected, setSelected] = useState(null)
    const [rebuilding, setRebuilding] = useState(false)

    // UNCHANGED filter keys + NEW ones
    const [filters, setFilters] = useState({
        weakOnly: false,
        showPrereqs: true,
        showSimilarity: true,
        showCooccurrence: false,  // NEW — off by default
        bottleneckOnly: false,  // NEW
    })

    // NEW state
    const [focusedNodeId, setFocusedNodeId] = useState(null)
    const [studyPathOpen, setStudyPathOpen] = useState(false)
    const [studyPlan, setStudyPlan] = useState([])
    const [cooccPairs, setCooccPairs] = useState([])
    const [showCoocc, setShowCoocc] = useState(false)

    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])

    // UNCHANGED fetchGraph
    const fetchGraph = useCallback(async (rebuild = false) => {
        if (rebuild) setRebuilding(true)
        else setLoading(true)
        setError(null)
        try {
            const url = `${API_BASE}/graph?userId=${userId}${rebuild ? '&rebuild=true' : ''}`
            const res = await fetch(url)
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setApiData({ nodes: data.nodes || [], edges: data.edges || [] })
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
            setRebuilding(false)
        }
    }, [userId])

    useEffect(() => { fetchGraph() }, [fetchGraph])

    // NEW: fetch study plan from dedicated endpoint
    const fetchStudyPlan = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/study-plan?userId=${userId}`)
            const data = await res.json()
            // Handle new response shape: { total, strong, average, weak, weakConcepts, nodes, edges }
            // Fall back gracefully if the old array shape is returned
            if (Array.isArray(data)) {
                setStudyPlan(data)
            } else if (data && Array.isArray(data.nodes)) {
                // Map nodes to the drawer item shape the StudyPathDrawer expects
                setStudyPlan(data.nodes.map(n => ({
                    concept_slug: n.concept_slug,
                    status: n.status,
                    priority: n.priority,
                    concepts: { name: n.name, subjects: { name: n.subject } },
                    concept_performance: {
                        accuracy: n.accuracy,
                        bottleneck_score: n.bottleneck_score,
                        next_review_at: n.next_review_at
                    }
                })))
            }
        } catch (e) { console.warn('[StudyPlan]', e.message) }
    }, [userId])

    // NEW: fetch co-occurrence pairs
    const fetchCooccurrence = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/graph/cooccurrence?userId=${userId}`)
            const data = await res.json()
            if (Array.isArray(data)) setCooccPairs(data)
        } catch (e) { console.warn('[CoOccur]', e.message) }
    }, [userId])

    useEffect(() => { if (studyPathOpen) fetchStudyPlan() }, [studyPathOpen, fetchStudyPlan])
    useEffect(() => { if (showCoocc) fetchCooccurrence() }, [showCoocc, fetchCooccurrence])

    // UNCHANGED recompute + NEW focusedNodeId dependency
    useEffect(() => {
        const { nodes: fn, edges: fe } = buildFlowData(
            apiData.nodes, apiData.edges, filters, setSelected, focusedNodeId
        )
        setNodes(fn)
        setEdges(fe)
    }, [apiData, filters, focusedNodeId])

    // NEW: mark done handler — calls dedicated POST endpoint
    const handleMarkDone = useCallback(async (conceptSlug) => {
        await fetch(`${API_BASE}/study-plan/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, conceptSlug, status: 'done' })
        })
        fetchStudyPlan()
    }, [userId, fetchStudyPlan])

    // UNCHANGED stats
    const stats = useMemo(() => ({
        total: apiData.nodes.length,
        weak: apiData.nodes.filter(n => n.status === 'weak').length,
        average: apiData.nodes.filter(n => n.status === 'average').length,
        strong: apiData.nodes.filter(n => n.status === 'strong').length,
    }), [apiData.nodes])

    // NEW: focused node data for banner
    const focusedNode = useMemo(() =>
        focusedNodeId ? apiData.nodes.find(n => n.id === focusedNodeId) : null
        , [focusedNodeId, apiData.nodes])

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-10 h-10 border-2 border-primary-accent/30 border-t-primary-accent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 animate-pulse font-medium">Building your knowledge graph…</p>
        </div>
    )

    if (error) return (
        <div className="flex flex-col items-center justify-center h-96 gap-4 text-center px-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
            <p className="text-white font-bold">Could not load graph</p>
            <p className="text-sm text-gray-400">{error}</p>
            <button onClick={() => fetchGraph()} className="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-bold hover:bg-white/20">Retry</button>
        </div>
    )

    if (!apiData.nodes.length) return (
        <div className="flex flex-col items-center justify-center h-96 gap-4 text-center px-6">
            <GitBranch className="w-10 h-10 text-gray-500" />
            <p className="text-white font-bold">No graph data yet</p>
            <p className="text-sm text-gray-400">Complete a diagnostic test first. Your knowledge graph will appear here.</p>
        </div>
    )

    return (
        <div className="relative w-full h-[calc(100vh-180px)] min-h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-[#080808]">

            {/* UNCHANGED toolbar + NEW buttons appended */}
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                {[
                    { key: 'weakOnly', icon: AlertTriangle, label: 'Weak only' },
                    { key: 'showPrereqs', icon: GitBranch, label: 'Prerequisites' },
                    { key: 'showSimilarity', icon: Link, label: 'Similarity' },
                ].map(({ key, icon: Icon, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filters[key]
                                ? 'bg-primary-accent/15 border-primary-accent text-primary-accent'
                                : 'bg-black/60 border-white/10 text-gray-400 hover:border-white/30'
                            }`}
                    >
                        <Icon className="w-3 h-3" />{label}
                    </button>
                ))}

                {/* NEW buttons — same style as above */}
                <button
                    onClick={() => setFilters(f => ({ ...f, bottleneckOnly: !f.bottleneckOnly }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filters.bottleneckOnly
                            ? 'bg-red-500/15 border-red-500 text-red-400'
                            : 'bg-black/60 border-white/10 text-gray-400 hover:border-white/30'
                        }`}
                >
                    <Zap className="w-3 h-3" />Bottleneck
                </button>

                <button
                    onClick={() => setFilters(f => ({ ...f, showCooccurrence: !f.showCooccurrence }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filters.showCooccurrence
                            ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                            : 'bg-black/60 border-white/10 text-gray-400 hover:border-white/30'
                        }`}
                >
                    <Link className="w-3 h-3" />Co-occur
                </button>

                <button
                    onClick={() => { setStudyPathOpen(o => !o); if (!studyPathOpen) fetchStudyPlan() }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${studyPathOpen
                            ? 'bg-green-500/15 border-green-500 text-green-400'
                            : 'bg-black/60 border-white/10 text-gray-400 hover:border-white/30'
                        }`}
                >
                    <BookOpen className="w-3 h-3" />Study path
                </button>

                <button
                    onClick={() => fetchGraph(true)}
                    disabled={rebuilding}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 bg-black/60 text-gray-400 hover:border-white/30 disabled:opacity-40"
                >
                    <RefreshCw className={`w-3 h-3 ${rebuilding ? 'animate-spin' : ''}`} />
                    {rebuilding ? 'Rebuilding…' : 'Rebuild'}
                </button>
            </div>

            {/* UNCHANGED stats bar */}
            <div className="absolute top-4 right-4 z-10 flex gap-3">
                {[
                    { label: 'Total', val: stats.total, color: 'text-white' },
                    { label: 'Strong', val: stats.strong, color: 'text-green-400' },
                    { label: 'Average', val: stats.average, color: 'text-amber-400' },
                    { label: 'Weak', val: stats.weak, color: 'text-red-400' },
                ].map(s => (
                    <div key={s.label} className="text-center px-3 py-1.5 rounded-xl bg-black/70 border border-white/10 backdrop-blur">
                        <p className={`text-base font-black ${s.color}`}>{s.val}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* NEW: Focus mode banner */}
            {focusedNode && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-[#0d0d0d]/95 border border-white/15 rounded-full px-4 py-2 backdrop-blur-xl shadow-xl">
                    <Target className="w-3.5 h-3.5 text-[#FFD85F]" />
                    <span className="text-xs font-bold text-white">{focusedNode.label}</span>
                    <span className="text-xs text-gray-400">
                        {Math.round((focusedNode.accuracy ?? 0) * 100)}% · {focusedNode.attempts} attempts
                        {focusedNode.bottleneck_score > 0 && (
                            <span className="text-red-400 ml-1">· ⚡ blocks {focusedNode.bottleneck_score}</span>
                        )}
                    </span>
                    <button
                        onClick={() => setFocusedNodeId(null)}
                        className="text-gray-500 hover:text-white ml-1"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* UNCHANGED React Flow canvas */}
            <div style={{ width: '100%', height: '100%' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.2}
                    maxZoom={2}
                    proOptions={{ hideAttribution: true }}
                    elevateEdgesOnSelect={false}
                    edgesUpdatable={false}
                    defaultEdgeOptions={{ zIndex: 1 }}
                    onPaneClick={() => setFocusedNodeId(null)}  // NEW: click canvas to exit focus
                >
                    <Background color="#1a1a1a" gap={20} />
                    <Controls className="!bg-black/80 !border-white/10 !rounded-xl" />
                    <MiniMap
                        nodeColor={n => STATUS_COLOR[n.data?.status] || STATUS_COLOR.default}
                        className="!bg-black/80 !border-white/10 !rounded-xl"
                    />
                </ReactFlow>
            </div>

            {/* NEW: Study path drawer — left side, does not overlap existing sidebar */}
            {studyPathOpen && (
                <StudyPathDrawer
                    plan={studyPlan}
                    onClose={() => setStudyPathOpen(false)}
                    onFocus={(slug) => {
                        setFocusedNodeId(slug)
                        setStudyPathOpen(false)
                    }}
                    onMarkDone={handleMarkDone}
                />
            )}

            {/* NEW: Co-occurrence strip — bottom centre, only when toggle on */}
            {filters.showCooccurrence && showCoocc && (
                <CooccurrenceStrip pairs={cooccPairs} />
            )}

            {/* UNCHANGED: node detail sidebar — bottom right */}
            {selected && (
                <div className="absolute right-4 bottom-4 z-20 w-72 bg-[#0d0d0d]/95 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 pr-2">
                            <p className="text-xs font-bold text-[#FFD85F] uppercase tracking-widest mb-1">{selected.subject}</p>
                            <h3 className="text-base font-bold text-white leading-snug">{selected.label}</h3>
                        </div>
                        <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <StatusBadge status={selected.status} />

                    {/* NEW: Focus button inside sidebar */}
                    <button
                        onClick={() => setFocusedNodeId(selected.id)}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:border-white/30 transition-all"
                    >
                        <Target className="w-3 h-3" /> Focus on this node
                    </button>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                        {[
                            { label: 'Accuracy',   val: `${Math.round((selected.accuracy ?? 0) * 100)}%` },
                            { label: 'Attempts',   val: selected.attempts },
                            { label: 'Bottleneck Score', val: selected.bottleneck_score ?? 0 },
                            { label: 'Test Type',  val: selected.test_type || 'surface' },
                        ].map(stat => (
                            <div key={stat.label} className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{stat.label}</p>
                                <p className="text-sm font-bold text-white mt-0.5">{stat.val}</p>
                            </div>
                        ))}
                    </div>

                    {/* next_review_at */}
                    <div className="mt-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Next Review</p>
                        {selected.next_review_at ? (() => {
                            const daysLeft = Math.round((new Date(selected.next_review_at) - Date.now()) / 86400000)
                            return (
                                <p className="text-sm font-bold" style={{ color: daysLeft <= 0 ? '#E24B4A' : '#FFD85F' }}>
                                    {daysLeft <= 0 ? 'Due today' : `Review in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
                                </p>
                            )
                        })() : (
                            <p className="text-sm font-bold text-gray-500">Not scheduled</p>
                        )}
                    </div>

                    {/* status badge */}
                    {selected.status && (
                        <div className="mt-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                selected.status === 'done'        ? 'text-green-400 bg-green-400/10 border-green-400/20'
                                : selected.status === 'in_progress' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                                : 'text-gray-400 bg-gray-400/10 border-gray-400/20'
                            }`}>
                                {selected.status}
                            </span>
                        </div>
                    )}

                    <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.round((selected.accuracy ?? 0) * 100)}%`, background: STATUS_COLOR[selected.status] }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}