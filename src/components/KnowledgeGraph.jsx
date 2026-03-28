/* ─────────────────────────────────────────────────────────────────────────────
   KnowledgeGraph.jsx  —  Step 6
   Interactive per-student knowledge graph using React Flow + dagre layout.

   npm packages used:
     reactflow  — graph rendering library
     dagre      — for automatic DAG layout

   Fetches: GET /api/graph?userId={userId}[&rebuild=true]

   Node colors:
     weak    → #E24B4A (red)
     average → #EF9F27 (amber)
     strong  → #639922 (green)
     default → #6b7280 (gray)

   Edge types:
     prerequisite → solid gray arrow
     root_cause   → dashed red arrow
     similar      → dotted blue line, no arrowhead, stroke-width = weight×3
─────────────────────────────────────────────────────────────────────────────── */

import { useState, useEffect, useCallback, useMemo } from 'react'
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType,
    Panel,
    Handle,
    Position
} from 'reactflow'
import 'reactflow/dist/style.css'
import dagre from 'dagre'
import { X, Info, RefreshCw, GitBranch, Link, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'

const API_BASE = 'http://localhost:3002/api'

// ── Colors ────────────────────────────────────────────────────────────────────
const STATUS_COLOR = {
    weak:    '#E24B4A',
    average: '#EF9F27',
    strong:  '#639922',
    default: '#6b7280',
}

// ── Dagre layout ──────────────────────────────────────────────────────────────
const NODE_W = 180
const NODE_H = 60

function applyDagreLayout(nodes, edges) {
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 })

    nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
    edges.forEach(e => {
        if (e.source && e.target) g.setEdge(e.source, e.target)
    })

    dagre.layout(g)

    return nodes.map(n => {
        const pos = g.node(n.id)
        return { ...n, position: { x: pos ? pos.x - NODE_W / 2 : 0, y: pos ? pos.y - NODE_H / 2 : 0 } }
    })
}

// ── Custom node ───────────────────────────────────────────────────────────────
function ConceptNode({ data }) {
    const color = STATUS_COLOR[data.status] || STATUS_COLOR.default
    return (
        <div
            onClick={() => data.onSelect(data)}
            style={{ borderColor: color }}
            className="rounded-xl border-2 bg-[#0d0d0d] px-3 py-2 cursor-pointer hover:brightness-110 transition-all shadow-lg min-w-[140px] max-w-[180px] relative"
        >
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

// ── Build React Flow nodes+edges from API data ─────────────────────────────────
function buildFlowData(apiNodes, apiEdges, filters, onSelect) {
    // Filter nodes
    let visibleNodes = apiNodes
    if (filters.weakOnly) visibleNodes = visibleNodes.filter(n => n.status === 'weak')
    const visibleIds = new Set(visibleNodes.map(n => n.id))

    const rfNodes = visibleNodes.map(n => ({
        id:       n.id,
        type:     'concept',
        position: { x: 0, y: 0 },
        data:     { ...n, onSelect },
    }))

    // Filter edges based on toggle
    let visibleEdges = apiEdges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target))
    if (!filters.showPrereqs)     visibleEdges = visibleEdges.filter(e => e.type !== 'prerequisite')
    if (!filters.showSimilarity)  visibleEdges = visibleEdges.filter(e => e.type !== 'similar')

    const rfEdges = visibleEdges.map(e => ({
        id: e.id || `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        animated: e.type === 'root_cause',
        style: {
            stroke: e.type === 'root_cause' ? '#E24B4A' 
                  : e.type === 'similar'    ? '#60a5fa' 
                  : '#6b7280',
            strokeWidth: 2,
            strokeDasharray: e.type === 'root_cause' ? '6 3' 
                           : e.type === 'similar'    ? '3 4' 
                           : undefined,
        },
        markerEnd: e.type !== 'similar' ? {
            type: MarkerType.ArrowClosed,
            color: e.type === 'root_cause' ? '#E24B4A' : '#6b7280',
        } : undefined,
    }))

    const laidOut = applyDagreLayout(rfNodes, rfEdges)
    return { nodes: laidOut, edges: rfEdges }
}

// ── Status badge helper ────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const cfg = {
        weak:    { icon: AlertTriangle, label: 'Weak',    cls: 'text-red-400    bg-red-400/10    border-red-400/20'    },
        average: { icon: TrendingUp,    label: 'Average', cls: 'text-amber-400  bg-amber-400/10  border-amber-400/20'  },
        strong:  { icon: CheckCircle,   label: 'Strong',  cls: 'text-green-400  bg-green-400/10  border-green-400/20'  },
    }[status] || { icon: Info, label: status, cls: 'text-gray-400 bg-gray-400/10 border-gray-400/20' }
    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
            <Icon className="w-3 h-3" />{cfg.label}
        </span>
    )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function KnowledgeGraph({ userId: propUserId }) {
    // TODO: replace with real userId from auth context if available
    const userId = propUserId || localStorage.getItem('learnifai_user_id') || 'guest'

    const [apiData, setApiData]     = useState({ nodes: [], edges: [] })
    const [loading, setLoading]     = useState(true)
    const [error, setError]         = useState(null)
    const [selected, setSelected]   = useState(null)
    const [filters, setFilters]     = useState({ weakOnly: false, showPrereqs: true, showSimilarity: true })
    const [rebuilding, setRebuilding] = useState(false)

    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])

    // Fetch graph data
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

    // Recompute flow nodes+edges whenever api data or filters change
    useEffect(() => {
        const { nodes: fn, edges: fe } = buildFlowData(apiData.nodes, apiData.edges, filters, setSelected)
        setNodes(fn)
        console.log('[Graph] Setting edges:', fe.length, fe.map(e => `${e.source}→${e.target}(${e.type})`))
        setEdges(fe)
    }, [apiData, filters])

    const stats = useMemo(() => ({
        total:   apiData.nodes.length,
        weak:    apiData.nodes.filter(n => n.status === 'weak').length,
        average: apiData.nodes.filter(n => n.status === 'average').length,
        strong:  apiData.nodes.filter(n => n.status === 'strong').length,
    }), [apiData.nodes])

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
            {/* Filter toolbar */}
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                {[
                    { key: 'weakOnly',      icon: AlertTriangle, label: 'Weak only' },
                    { key: 'showPrereqs',   icon: GitBranch,     label: 'Prerequisites' },
                    { key: 'showSimilarity',icon: Link,          label: 'Similarity' },
                ].map(({ key, icon: Icon, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                            filters[key]
                                ? 'bg-primary-accent/15 border-primary-accent text-primary-accent'
                                : 'bg-black/60 border-white/10 text-gray-400 hover:border-white/30'
                        }`}
                    >
                        <Icon className="w-3 h-3" />{label}
                    </button>
                ))}

                <button
                    onClick={() => fetchGraph(true)}
                    disabled={rebuilding}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 bg-black/60 text-gray-400 hover:border-white/30 disabled:opacity-40"
                >
                    <RefreshCw className={`w-3 h-3 ${rebuilding ? 'animate-spin' : ''}`} />
                    {rebuilding ? 'Rebuilding…' : 'Rebuild'}
                </button>
            </div>

            {/* Stats bar */}
            <div className="absolute top-4 right-4 z-10 flex gap-3">
                {[
                    { label: 'Total',   val: stats.total,   color: 'text-white' },
                    { label: 'Strong',  val: stats.strong,  color: 'text-green-400' },
                    { label: 'Average', val: stats.average, color: 'text-amber-400' },
                    { label: 'Weak',    val: stats.weak,    color: 'text-red-400' },
                ].map(s => (
                    <div key={s.label} className="text-center px-3 py-1.5 rounded-xl bg-black/70 border border-white/10 backdrop-blur">
                        <p className={`text-base font-black ${s.color}`}>{s.val}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* React Flow canvas */}
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
                >
                    <Background color="#1a1a1a" gap={20} />
                    <Controls className="!bg-black/80 !border-white/10 !rounded-xl" />
                    <MiniMap
                        nodeColor={n => STATUS_COLOR[n.data?.status] || STATUS_COLOR.default}
                        className="!bg-black/80 !border-white/10 !rounded-xl"
                    />
                </ReactFlow>
            </div>

            {/* Node detail sidebar */}
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

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        {[
                            { label: 'Accuracy',  val: `${Math.round((selected.accuracy ?? 0) * 100)}%` },
                            { label: 'Attempts',  val: selected.attempts },
                            { label: 'Correct',   val: selected.correct },
                            { label: 'Test Type', val: selected.test_type || 'surface' },
                        ].map(stat => (
                            <div key={stat.label} className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{stat.label}</p>
                                <p className="text-sm font-bold text-white mt-0.5">{stat.val}</p>
                            </div>
                        ))}
                    </div>

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
