import { useEffect, useState, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import Preloader from './components/Preloader'
import MainLayout from './components/layout/MainLayout'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MapPage = lazy(() => import('./pages/MapPage'))
const TestsPage = lazy(() => import('./pages/TestsPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const ProfessorsPage = lazy(() => import('./pages/ProfessorsPage'))
const AIPage = lazy(() => import('./pages/AIPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))

function ScrollToTop() {
    const { pathname } = useLocation()
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [pathname])
    return null
}

function LoadingFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center pt-20 bg-background-base">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border border-primary-accent/40 rotate-45 flex items-center justify-center animate-spin">
                    <div className="w-3 h-3 bg-primary-accent" style={{ boxShadow: '0 0 10px #FFD85F' }} />
                </div>
                <span className="font-mono text-xs text-primary-accent tracking-[0.2em] animate-pulse uppercase">INIT_SEQ...</span>
            </div>
        </div>
    )
}

function App() {
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!loading) {
            const lenis = new Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smooth: true,
            })

            function raf(time) {
                lenis.raf(time)
                requestAnimationFrame(raf)
            }
            requestAnimationFrame(raf)

            document.documentElement.style.overflow = ''

            return () => lenis.destroy()
        }
    }, [loading])

    return (
        <div className="relative min-h-screen bg-background-base">
            {loading && <Preloader onComplete={() => setLoading(false)} />}
            <div className={loading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}>
                <ScrollToTop />
                <MainLayout>
                    <Suspense fallback={<LoadingFallback />}>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/auth" element={<AuthPage />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/map" element={<MapPage />} />
                            <Route path="/tests" element={<TestsPage />} />
                            <Route path="/library" element={<LibraryPage />} />
                            <Route path="/professors" element={<ProfessorsPage />} />
                            <Route path="/ai" element={<AIPage />} />
                        </Routes>
                    </Suspense>
                </MainLayout>
            </div>
        </div>
    )
}

export default App
