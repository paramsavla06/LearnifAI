import { motion } from 'framer-motion'
import { 
    Users, Activity, MessageSquare, BookOpen, 
    ArrowUpRight, ArrowDownRight, Zap, Target,
    Database, ShieldCheck, Globe, Clock, ChevronRight
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Cell 
} from 'recharts'

export default function AdminDashboard() {
    const [currentTime, setCurrentTime] = useState(new Date())
    const [data, setData] = useState({
        stats: [
            { label: 'Total Students', value: '...', change: '+0%', icon: Users, color: '#FFD85F' },
            { label: 'Active Now', value: '...', change: '+0', icon: Activity, color: '#4ADE80' },
            { label: 'AI Chats', value: '...', change: '+0', icon: MessageSquare, color: '#60A5FA' },
            { label: 'Book Requests', value: '...', change: '+0', icon: BookOpen, color: '#F87171' },
        ],
        masteryData: [],
        recentActivity: []
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        
        async function fetchStats() {
            try {
                const res = await fetch('http://localhost:3002/api/auth/admin/stats')
                const json = await res.json()
                // Map icons back to stats
                const icons = [Users, Activity, MessageSquare, BookOpen]
                const statsWithIcons = json.stats.map((s, i) => ({ ...s, icon: icons[i] }))
                setData({ ...json, stats: statsWithIcons })
            } catch (err) {
                console.error('Failed to fetch admin stats:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
        const poller = setInterval(fetchStats, 30000) // Poll every 30s

        return () => {
            clearInterval(timer)
            clearInterval(poller)
        }
    }, [])
    return (
        <div className="min-h-screen bg-background-base pt-24 pb-12 px-6 lg:px-12">
            <div className="max-w-7xl mx-auto">
                {/* Header Area */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 mb-2"
                        >
                            <div className="w-2 h-2 rounded-full bg-primary-accent animate-pulse" />
                            <span className="text-xs font-bold text-primary-accent uppercase tracking-[0.3em]">System Manifest: Online</span>
                        </motion.div>
                        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">Mission <span className="text-primary-accent">Control</span></h1>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-surface-elevation-1 border border-white/5 px-6 py-3 rounded-2xl backdrop-blur-xl">
                        <Clock className="w-4 h-4 text-text-secondary" />
                        <span className="text-sm font-mono text-white tabular-nums">
                            {currentTime.toLocaleTimeString([], { hour12: false })}
                        </span>
                        <div className="w-px h-4 bg-white/10 mx-2" />
                        <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">v2.0.4-PRO</span>
                    </div>
                </div>
                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {data.stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-surface-elevation-1 border border-white/5 p-6 rounded-3xl hover:border-white/10 transition-colors relative group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                                    <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                                </div>
                                <span className={`flex items-center text-xs font-bold ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                                    {stat.change} 
                                    {stat.change.startsWith('+') ? <ArrowUpRight className="w-3 h-3 ml-1" /> : <ArrowDownRight className="w-3 h-3 ml-1" />}
                                </span>
                            </div>
                            <h3 className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-1">{stat.label}</h3>
                            <p className="text-3xl font-black text-white">{loading ? '...' : stat.value}</p>
                            <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: stat.color + '20' }} />
                        </motion.div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Mastery Chart - Large Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-2 bg-surface-elevation-1 border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Subject Mastery Distribution</h3>
                                <p className="text-sm text-text-secondary">Average performance across all engineering batches</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-3 py-1.5 bg-primary-accent text-black text-[10px] font-black uppercase rounded-lg">Realtime</button>
                                <button className="px-3 py-1.5 bg-white/5 text-white/50 text-[10px] font-black uppercase rounded-lg hover:text-white transition-colors">Historical</button>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.masteryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis 
                                        dataKey="subject" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }} 
                                        dy={10}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                                        contentStyle={{ backgroundColor: '#131313', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    />
                                    <Bar dataKey="mastery" radius={[6, 6, 0, 0]} barSize={40}>
                                        {data.masteryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                    {/* Live Feed - Side Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-surface-elevation-1 border border-white/5 p-8 rounded-[2.5rem] flex flex-col"
                    >
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <Zap className="w-5 h-5 text-primary-accent" />
                            Live Telemetry
                        </h3>
                        <div className="space-y-6 flex-1">
                            {data.recentActivity.length > 0 ? data.recentActivity.map((act, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${act.status === 'success' ? 'bg-green-400' : act.status === 'error' ? 'bg-red-400' : act.status === 'warning' ? 'bg-primary-accent' : 'bg-blue-400'}`} />
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-bold text-white group-hover:text-primary-accent transition-colors">{act.user}</span>
                                            <span className="text-[10px] text-text-secondary font-mono">{act.time}</span>
                                        </div>
                                        <p className="text-xs text-text-secondary leading-tight">{act.action}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center h-full opacity-30">
                                    <Activity className="w-8 h-8 mb-2" />
                                    <p className="text-xs font-bold uppercase tracking-widest">No recent pulses</p>
                                </div>
                            )}
                        </div>
                        <button className="w-full mt-8 py-4 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2">
                             Full Archive <ChevronRight className="w-3 h-3" />
                        </button>
                    </motion.div>
                </div>
                {/* System Status Bottom Bar */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Cloud API', status: 'Optimal', icon: Globe, color: 'text-green-400' },
                        { label: 'Ollama (Llama 3.2)', status: 'Local (Active)', icon: ShieldCheck, color: 'text-primary-accent shadow-[0_0_10px_rgba(255,216,95,0.3)]' },
                        { label: 'Supabase DB', status: 'Healthy', icon: Database, color: 'text-green-400' },
                    ].map((sys, i) => (
                        <div key={i} className="bg-surface-elevation-1 border border-white/5 px-6 py-4 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <sys.icon className="w-4 h-4 text-text-secondary" />
                                <span className="text-xs font-bold text-white uppercase tracking-widest">{sys.label}</span>
                            </div>
                            <span className={`text-[10px] font-black uppercase ${sys.color}`}>{sys.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
