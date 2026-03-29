import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
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
    const [isAdmin, setIsAdmin] = useState(false)
    const location = useLocation()

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll)
        
        const updateAuth = () => {
            const storedName = localStorage.getItem('learnifai_user_name')
            const rollNo = localStorage.getItem('learnifai_user_roll_no') || ''
            const role = localStorage.getItem('learnifai_user_role') || ''
            if (storedName) setUserName(storedName)
            setIsAdmin(role === 'admin' || rollNo === 'admin' || storedName?.toLowerCase() === 'admin')
        }

        updateAuth()
        window.addEventListener('storage', updateAuth)
        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('storage', updateAuth)
        }
    }, [])
    
    const userInitial = userName.charAt(0).toUpperCase()

    const handleLogout = () => {
        localStorage.clear()
        window.location.href = '/auth'
    }

    return (
        <>
            <motion.nav
                className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 lg:px-8 py-4 transition-all duration-300 ${
                    scrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
                }`}
            >
                <div className="flex items-center gap-12">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-accent rounded-lg flex items-center justify-center"><Brain className="w-5 h-5 text-black" /></div>
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
                        {isAdmin && (
                            <Link 
                                to="/admin" 
                                className={`hover:text-white transition-colors relative group ${location.pathname.startsWith('/admin') ? "text-white" : ""}`}
                            >
                                Admin
                                {location.pathname.startsWith('/admin') && <motion.span layoutId="nav-pill" className="absolute -bottom-6 left-0 w-full h-1 bg-primary-accent rounded-t-full" />}
                            </Link>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden sm:flex items-center gap-3 relative group">
                        <div className="text-right">
                            <p className="text-sm font-bold text-white leading-none">{userName}</p>
                            <p className="text-[10px] text-primary-accent font-medium mt-0.5 uppercase tracking-wider">
                                {isAdmin ? 'Pro Teacher' : 'Pro Student'}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary-accent flex items-center justify-center font-bold text-black border-2 border-white">{userInitial}</div>
                        <div className="absolute top-full right-0 mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-elevation-1 border border-white/10 text-sm font-bold text-red-400">
                                <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </motion.nav>
        </>
    )
}
