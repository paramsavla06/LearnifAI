import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Brain, Search, Activity, Menu, X, LogOut } from 'lucide-react'

const navLinks = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Map', to: '/map' },
    { label: 'Tests', to: '/tests' },
    { label: 'Library', to: '/library' },
    { label: 'Professors', to: '/professors' },
    { label: 'AI', to: '/ai' },
    { label: 'Graph', to: '/graph' },
]

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [userName, setUserName] = useState('Student')
    const location = useLocation()

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll)
        
        // Load username
        const storedName = localStorage.getItem('learnifai_user_name')
        if (storedName) setUserName(storedName)
        
        const handler = (e) => {
            if (e.key === 'learnifai_user_name' && e.newValue) {
                setUserName(e.newValue)
            }
        }
        window.addEventListener('storage', handler)

        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('storage', handler)
        }
    }, [])
    
    const userInitial = userName.charAt(0).toUpperCase()

    const handleLogout = () => {
        localStorage.removeItem('learnifai_user_id')
        localStorage.removeItem('learnifai_user_name')
        localStorage.removeItem('learnifai_user_year')
        localStorage.removeItem('learnifai_user_branch')
        localStorage.removeItem('learnifai_user_program')
        localStorage.removeItem('learnifai_user_field')
        window.location.href = '/auth'
    }

    return (
        <>
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 lg:px-8 py-4 transition-all duration-300 ${
                    scrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/10 shadow-lg' : 'bg-transparent border-b border-transparent'
                }`}
            >
                <div className="flex items-center gap-12">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-primary-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary-accent/20 group-hover:scale-105 transition-transform">
                            <Brain className="w-5 h-5 text-black" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">Learnif<span className="text-white">AI</span></span>
                    </Link>
                    
                    <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-text-secondary">
                        {navLinks.map((link) => {
                            const isActive = location.pathname.startsWith(link.to)
                            return (
                                <Link 
                                    key={link.label} 
                                    to={link.to} 
                                    className={`hover:text-white transition-colors relative group ${isActive ? "text-white" : ""}`}
                                >
                                    {link.label}
                                    {isActive && <motion.span layoutId="nav-pill" className="absolute -bottom-6 left-0 w-full h-1 bg-primary-accent rounded-t-full" />}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="relative hidden xl:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input 
                            type="text" 
                            placeholder="Search courses..." 
                            className="pl-10 pr-4 py-2 bg-white/5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent/50 w-64 transition-all border border-transparent focus:border-white/10"
                        />
                    </div>
                    
                    <div className="hidden sm:flex w-10 h-10 rounded-full bg-white/5 items-center justify-center relative cursor-pointer hover:bg-white/10 transition-colors">
                        <Activity className="w-5 h-5 text-text-primary" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-black" />
                    </div>
                    
                    <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-white/10 relative group">
                        <div className="text-right">
                            <p className="text-sm font-bold leading-none text-white">{userName}</p>
                            <p className="text-[10px] text-primary-accent font-medium mt-0.5 uppercase tracking-wider">Pro Student</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary-accent flex items-center justify-center font-bold text-black border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform">
                            {userInitial}
                        </div>
                        {/* Hover Logout Button */}
                        <div className="absolute top-full right-0 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-elevation-1 border border-white/10 hover:bg-white/5 shadow-xl text-sm font-bold text-red-400 whitespace-nowrap"
                            >
                                <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                        </div>
                    </div>

                    <button 
                        className="lg:hidden w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </motion.nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-xl lg:hidden pt-24 px-6 flex flex-col"
                    >
                        <div className="flex flex-col gap-6 text-2xl font-bold">
                            {navLinks.map((link) => (
                                <Link 
                                    key={link.label}
                                    to={link.to}
                                    onClick={() => setMenuOpen(false)}
                                    className={`flex items-center justify-between ${location.pathname.startsWith(link.to) ? 'text-primary-accent' : 'text-text-secondary'}`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                        
                            <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-primary-accent flex items-center justify-center font-bold text-black text-xl border-2 border-white">
                                        {userInitial}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{userName}</p>
                                        <p className="text-xs text-primary-accent font-medium uppercase tracking-wider">Pro Student</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-3 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
