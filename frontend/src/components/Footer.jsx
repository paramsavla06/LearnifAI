import { Link } from 'react-router-dom'
import { Brain } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-background-base border-t border-white/5 py-20 px-8">
            <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-20">
                <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 bg-primary-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary-accent/20">
                            <Brain className="w-5 h-5 text-black" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">Learnif<span className="text-white">AI</span></span>
                    </div>
                    <p className="text-text-secondary max-w-sm leading-relaxed font-medium">
                        Empowering students through AI-driven conceptual mastery. We don't just teach; we diagnose and heal learning gaps. 
                        Tailored for Mumbai University engineering students.
                    </p>
                </div>
                
                <div>
                    <h4 className="font-bold text-white mb-6">Platform</h4>
                    <ul className="space-y-4 text-text-secondary text-sm font-medium">
                        <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                        <li><Link to="/map" className="hover:text-white transition-colors">Campus Map</Link></li>
                        <li><Link to="/tests" className="hover:text-white transition-colors">Diagnostic Tests</Link></li>
                        <li><Link to="/library" className="hover:text-white transition-colors">Library</Link></li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="font-bold text-white mb-6">Academics</h4>
                    <ul className="space-y-4 text-text-secondary text-sm font-medium">
                        <li><Link to="/professors" className="hover:text-white transition-colors">Faculty Directory</Link></li>
                        <li><Link to="/ai" className="hover:text-white transition-colors">AI Consultant</Link></li>
                        <li><Link to="#" className="hover:text-white transition-colors">Mumbai University</Link></li>
                        <li><Link to="#" className="hover:text-white transition-colors">CE Department</Link></li>
                    </ul>
                </div>
            </div>
            
            <div className="max-w-7xl mx-auto pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex gap-8 text-sm text-text-secondary font-bold uppercase tracking-widest">
                    <Link to="#" className="hover:text-white transition-colors">Twitter</Link>
                    <Link to="#" className="hover:text-white transition-colors">GitHub</Link>
                    <Link to="#" className="hover:text-white transition-colors">LinkedIn</Link>
                </div>
                <div className="text-sm text-text-secondary font-medium tracking-wide">
                    © 2026 LearnifAI. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
