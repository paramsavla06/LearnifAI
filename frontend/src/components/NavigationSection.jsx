import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { GlassCard } from './ui/GlassCard'
import { ScrollReveal } from './ui/ScrollReveal'
import { X, Map, Layers, Building2, AlignLeft, BookOpen, MapPin, ExternalLink } from 'lucide-react'
import conceptsData from '../data/concepts.json'

// ── Library section helpers ────────────────────────────────────────────────────
function inferFloor(section) {
    if (!section) return 'Ground Floor'
    const code = section.replace('Section ', '').trim().toUpperCase().charCodeAt(0) - 65
    if (code <= 5)  return 'Ground Floor'
    if (code <= 11) return 'First Floor'
    if (code <= 17) return 'Second Floor'
    return 'Third Floor'
}

const FLOOR_COLORS = {
    'Ground Floor': { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400' },
    'First Floor':  { text: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',    dot: 'bg-blue-400' },
    'Second Floor': { text: 'text-violet-400',  bg: 'bg-violet-400/10',  border: 'border-violet-400/20',  dot: 'bg-violet-400' },
    'Third Floor':  { text: 'text-orange-400',  bg: 'bg-orange-400/10',  border: 'border-orange-400/20',  dot: 'bg-orange-400' },
}

// Build section summary from concepts.json
function buildLibrarySections() {
    const sectionMap = {}
    for (const subject of conceptsData.subjects) {
        for (const concept of subject.concepts) {
            const sec = concept.library_section
            if (!sec) continue
            if (!sectionMap[sec]) sectionMap[sec] = { section: sec, concepts: [], subjects: new Set() }
            sectionMap[sec].concepts.push(concept)
            sectionMap[sec].subjects.add(subject.name)
        }
    }
    return Object.values(sectionMap)
        .map(s => ({ ...s, subjects: [...s.subjects] }))
        .sort((a, b) => a.section.localeCompare(b.section))
}

const LIBRARY_SECTIONS = buildLibrarySections()

/* ── Building data (from SmartCampus/src/data/buildings.json) ── */
const BUILDINGS = [
    { id: 'bldg-001', name: 'Engineering Block A', category: 'Academic', description: 'Main engineering building housing Computer Science, Electronics, and Mechanical departments with state-of-the-art laboratories and lecture halls', departments: ['Computer Science', 'Electronics & Communication', 'Mechanical Engineering'], totalFloors: 5, availableResources: ['WiFi', 'Projectors', 'Smart Boards', 'AC'], position: new THREE.Vector3(-8, 0, -2) },
    { id: 'bldg-002', name: 'Engineering Block B', category: 'Academic', description: 'Secondary engineering building featuring advanced research labs and collaborative learning spaces', departments: ['Civil Engineering', 'Electrical Engineering'], totalFloors: 4, availableResources: ['WiFi', 'Projectors', 'Computer Labs'], position: new THREE.Vector3(2, 0, -2) },
    { id: 'bldg-003', name: 'Central Library', category: 'Library', description: 'Five-story modern library with extensive digital resources, study areas, and research facilities', departments: ['Library Services'], totalFloors: 5, availableResources: ['WiFi', 'Study Rooms', 'Digital Archive', 'Printing'], position: new THREE.Vector3(-3, 0, -8) },
    { id: 'bldg-004', name: 'Administrative Block', category: 'Admin', description: 'Main administrative building with offices of the principal, dean, registrar, and student affairs', departments: ['Administration'], totalFloors: 3, availableResources: ['WiFi', 'Conference Rooms', 'Reception'], position: new THREE.Vector3(-6, 0, -8) },
    { id: 'bldg-005', name: 'Science Block', category: 'Academic', description: 'Dedicated science building with physics, chemistry, and biology laboratories', departments: ['Physics', 'Chemistry', 'Biology'], totalFloors: 4, availableResources: ['WiFi', 'Lab Equipment', 'Safety Facilities'], position: new THREE.Vector3(-10, 0, -5) },
    { id: 'bldg-006', name: 'Student Activity Center', category: 'Recreation', description: 'Multi-purpose building with auditorium, gym, cafeteria, and student club rooms', departments: ['Student Affairs'], totalFloors: 3, availableResources: ['Auditorium', 'Gym', 'Cafeteria', 'Event Halls'], position: new THREE.Vector3(-9, 0, 3) },
    { id: 'bldg-007', name: 'Hostel Block - Boys', category: 'Hostel', description: 'Modern hostel facility with 200 rooms, common areas, and recreational facilities', departments: ['Hostel Administration'], totalFloors: 5, availableResources: ['WiFi', 'Mess', 'Common Room', 'Laundry'], position: new THREE.Vector3(5, 0, -8) },
    { id: 'bldg-008', name: 'Hostel Block - Girls', category: 'Hostel', description: 'Secure hostel facility with 200 rooms, study areas, and modern amenities', departments: ['Hostel Administration'], totalFloors: 5, availableResources: ['WiFi', 'Mess', 'Common Room', '24/7 Security'], position: new THREE.Vector3(8, 0, -8) },
]

const CATEGORY_COLORS = {
    Academic: '#FFD85F',
    Library: '#a855f7',
    Admin: '#60a5fa',
    Recreation: '#22c55e',
    Hostel: '#f43f5e',
}

export default function NavigationSection() {
    const mountRef = useRef(null)
    const sceneRef = useRef(null)
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadProgress, setLoadProgress] = useState(0)
    const [filterCat, setFilterCat] = useState('All')

    useEffect(() => {
        const mount = mountRef.current
        if (!mount) return

        /* ── Renderer ──────────────────────────────────── */
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(mount.clientWidth, mount.clientHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.2
        renderer.outputColorSpace = THREE.SRGBColorSpace
        mount.appendChild(renderer.domElement)

        /* ── CSS2D Label Renderer ───────────────────────── */
        const labelRenderer = new CSS2DRenderer()
        labelRenderer.setSize(mount.clientWidth, mount.clientHeight)
        labelRenderer.domElement.style.position = 'absolute'
        labelRenderer.domElement.style.top = '0'
        labelRenderer.domElement.style.left = '0'
        labelRenderer.domElement.style.pointerEvents = 'none'
        mount.appendChild(labelRenderer.domElement)

        /* ── Scene ─────────────────────────────────────── */
        const scene = new THREE.Scene()
        scene.background = new THREE.Color('#0A0A0A') // bg-background-base
        scene.fog = new THREE.FogExp2('#0A0A0A', 0.008)
        sceneRef.current = scene

        /* ── Camera ────────────────────────────────────── */
        const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 2000)
        camera.position.set(10, 8, 10)
        camera.lookAt(0, 0, 0)

        /* ── Lights ────────────────────────────────────── */
        const ambientLight = new THREE.AmbientLight('#ffffff', 0.6)
        scene.add(ambientLight)

        const dirLight = new THREE.DirectionalLight('#ffffff', 1.8)
        dirLight.position.set(20, 40, 20)
        dirLight.castShadow = true
        dirLight.shadow.mapSize.width = 2048
        dirLight.shadow.mapSize.height = 2048
        dirLight.shadow.camera.near = 0.5
        dirLight.shadow.camera.far = 200
        dirLight.shadow.camera.left = -30
        dirLight.shadow.camera.right = 30
        dirLight.shadow.camera.top = 30
        dirLight.shadow.camera.bottom = -30
        scene.add(dirLight)

        // Gold accent fill light
        const fillLight = new THREE.PointLight('#FFD85F', 0.6, 60)
        fillLight.position.set(-10, 15, 10)
        scene.add(fillLight)

        const backLight = new THREE.DirectionalLight('#A1A1AA', 0.4) // text-secondary
        backLight.position.set(-20, 10, -20)
        scene.add(backLight)

        /* ── Grid ground ───────────────────────────────── */
        const gridHelper = new THREE.GridHelper(60, 30, '#141414', '#141414')
        gridHelper.position.y = -0.05
        scene.add(gridHelper)

        /* ── OrbitControls ─────────────────────────────── */
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.07
        controls.minDistance = 1
        controls.maxDistance = 200
        controls.maxPolarAngle = Math.PI / 2.05
        controls.target.set(0, 0, 0)
        controls.update()

        /* ── Building labels ───────────────────────────── */
        const labelObjects = []

        function addLabel(building) {
            const div = document.createElement('div')
            div.className = 'campus-map-label'
            div.dataset.id = building.id
            div.style.cssText = `
                padding: 6px 14px;
                background: rgba(10,10,10,0.85);
                border: 1px solid ${CATEGORY_COLORS[building.category] || 'rgba(255,255,255,0.1)'};
                border-radius: 99px;
                color: #FFFFFF;
                font-family: Inter, sans-serif;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.02em;
                cursor: pointer;
                white-space: nowrap;
                backdrop-filter: blur(16px);
                transition: all 0.2s ease;
                pointer-events: auto;
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            `
            div.textContent = building.name

            div.addEventListener('click', () => {
                setSelected(building.id)
            })
            div.addEventListener('mouseenter', () => {
                div.style.background = `rgba(255,216,95,0.1)`
                div.style.borderColor = '#FFD85F'
                div.style.boxShadow = '0 0 16px rgba(255,216,95,0.2)'
                div.style.transform = 'translateY(-2px)'
            })
            div.addEventListener('mouseleave', () => {
                div.style.background = 'rgba(10,10,10,0.85)'
                div.style.borderColor = CATEGORY_COLORS[building.category] || 'rgba(255,255,255,0.1)'
                div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'
                div.style.transform = 'translateY(0)'
            })

            const obj = new CSS2DObject(div)
            obj.position.copy(building.position)
            obj.position.y += 3.5
            scene.add(obj)
            labelObjects.push(obj)
        }

        BUILDINGS.forEach(addLabel)

        /* ── Load GLB model ────────────────────────────── */
        const loader = new GLTFLoader()
        loader.load(
            '/assets/models/mapmapamap.glb',
            (gltf) => {
                const model = gltf.scene
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true
                        node.receiveShadow = true
                    }
                })

                // Auto-scale: fit model to ~20 units so it fills the viewport
                const box = new THREE.Box3().setFromObject(model)
                const size = box.getSize(new THREE.Vector3())
                const maxDim = Math.max(size.x, size.y, size.z)
                const targetSize = 20
                const scaleFactor = targetSize / (maxDim || 1)
                model.scale.setScalar(scaleFactor)

                // Re-center after scaling
                const box2 = new THREE.Box3().setFromObject(model)
                const center = box2.getCenter(new THREE.Vector3())
                model.position.sub(center)
                model.position.y = 0

                // Fit camera to model
                const size2 = box2.getSize(new THREE.Vector3())
                const maxDim2 = Math.max(size2.x, size2.z)
                const dist = maxDim2 * 0.85
                camera.position.set(dist, dist * 0.7, dist)
                camera.lookAt(0, 0, 0)
                controls.target.set(0, 0, 0)
                controls.minDistance = maxDim2 * 0.1
                controls.maxDistance = maxDim2 * 5
                controls.update()

                scene.add(model)
                setLoading(false)
            },
            (xhr) => {
                if (xhr.total > 0) {
                    setLoadProgress(Math.round((xhr.loaded / xhr.total) * 100))
                }
            },
            (err) => {
                console.warn('GLB load error:', err)
                setLoading(false)
            }
        )

        /* ── Raycasting (click on model meshes) ────────── */
        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()
        function onMouseClick(e) {
            const rect = mount.getBoundingClientRect()
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
            raycaster.setFromCamera(mouse, camera)
            const meshes = []
            scene.traverse((obj) => { if (obj.isMesh) meshes.push(obj) })
            const hits = raycaster.intersectObjects(meshes, false)
            if (hits.length > 0) {
                const hit = hits[0].point
                let closest = null, closestDist = Infinity
                BUILDINGS.forEach((b) => {
                    const d = new THREE.Vector3(hit.x, 0, hit.z).distanceTo(new THREE.Vector3(b.position.x, 0, b.position.z))
                    if (d < closestDist) { closestDist = d; closest = b }
                })
                if (closest && closestDist < 6) setSelected(closest.id)
            }
        }
        mount.addEventListener('click', onMouseClick)

        /* ── Resize ────────────────────────────────────── */
        function onResize() {
            if (!mount) return
            camera.aspect = mount.clientWidth / mount.clientHeight
            camera.updateProjectionMatrix()
            renderer.setSize(mount.clientWidth, mount.clientHeight)
            labelRenderer.setSize(mount.clientWidth, mount.clientHeight)
        }
        window.addEventListener('resize', onResize)

        /* ── Animation loop ────────────────────────────── */
        let animId
        function animate() {
            animId = requestAnimationFrame(animate)
            controls.update()
            renderer.render(scene, camera)
            labelRenderer.render(scene, camera)
        }
        animate()

        /* ── Cleanup ───────────────────────────────────── */
        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener('resize', onResize)
            mount.removeEventListener('click', onMouseClick)
            controls.dispose()
            renderer.dispose()
            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
            if (mount.contains(labelRenderer.domElement)) mount.removeChild(labelRenderer.domElement)
        }
    }, [])

    const selectedBuilding = BUILDINGS.find((b) => b.id === selected)
    const categories = ['All', ...new Set(BUILDINGS.map((b) => b.category))]
    const filteredBuildings = filterCat === 'All' ? BUILDINGS : BUILDINGS.filter((b) => b.category === filterCat)

    return (
        <section id="navigation" className="relative py-24 md:py-32">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-accent/5 via-background-base to-background-base pointer-events-none" />
            
            <div className="relative max-w-7xl mx-auto px-6 md:px-8">

                <ScrollReveal className="mb-12 origin-left">
                    <div className="text-primary-accent font-bold tracking-widest uppercase text-sm mb-4 flex items-center gap-3">
                        <span className="w-8 h-[2px] bg-primary-accent" />
                        Campus Navigation
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                        3D Campus Map
                    </h2>
                    <p className="text-text-secondary mt-4 max-w-xl text-lg font-medium tracking-wide">
                        Interactive 3D model. Left click and drag to orbit, scroll to zoom. Click any building label to view its details.
                    </p>
                </ScrollReveal>

                {/* 3D Viewport wrapped in GlassCard */}
                <GlassCard className="!p-0 relative overflow-hidden h-[clamp(500px,80vh,900px)] rounded-[32px] border border-white/10 shadow-2xl">
                    
                    {/* Top Status Bar */}
                    <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4 flex items-center justify-between bg-black/40 backdrop-blur-md border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${loading ? 'bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.6)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]'}`} />
                            <span className={`text-[10px] font-bold tracking-widest uppercase ${loading ? 'text-orange-500' : 'text-green-500'}`}>
                                {loading ? `LOADING... ${loadProgress}%` : 'MAP READY — INTERACTIVE'}
                            </span>
                        </div>
                        <div className="hidden sm:flex gap-6 items-center">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary tracking-widest uppercase">
                                <AlignLeft className="w-3.5 h-3.5" /> Drag: Orbit
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary tracking-widest uppercase">
                                <Layers className="w-3.5 h-3.5" /> Scroll: Zoom
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary tracking-widest uppercase">
                                <Map className="w-3.5 h-3.5" /> Click Label: Details
                            </div>
                        </div>
                    </div>

                    {/* Three.js Canvas Container */}
                    <div ref={mountRef} className="w-full h-full" />

                    {/* Loading Overlay */}
                    <AnimatePresence>
                        {loading && (
                            <motion.div 
                                initial={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background-base/90 backdrop-blur-md"
                            >
                                <div className="w-16 h-16 rounded-full border-2 border-primary-accent/20 border-t-primary-accent border-r-primary-accent animate-spin mb-6" />
                                <p className="text-sm font-bold text-white tracking-widest uppercase mb-4">Loading 3D Model</p>
                                <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary-accent shadow-[0_0_10px_rgba(255,216,95,0.6)] transition-all duration-300" style={{ width: `${loadProgress}%` }} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Scanline pattern for subtle texture */}
                    <div className="absolute inset-0 pointer-events-none z-5 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]" />
                </GlassCard>

                {/* Category filters */}
                <div className="flex gap-3 flex-wrap mt-8 mb-6">
                    {categories.map((cat) => (
                        <button key={cat} onClick={() => setFilterCat(cat)}
                            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 border ${
                                filterCat === cat
                                    ? 'bg-white/10 text-white border-white/20'
                                    : 'bg-transparent text-text-secondary border-transparent hover:bg-white/5 hover:text-white'
                            }`}>
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Visible Building List */}
                <div className="flex gap-3 flex-wrap">
                    {filteredBuildings.map((b) => (
                        <button key={b.id} onClick={() => setSelected(selected === b.id ? null : b.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                                selected === b.id 
                                ? 'text-black shadow-lg translate-y-[-2px]' 
                                : 'bg-surface-elevation-1 text-text-secondary border border-white/5 hover:bg-white/5 hover:text-white'
                            }`}
                            style={selected === b.id ? { backgroundColor: CATEGORY_COLORS[b.category], borderColor: CATEGORY_COLORS[b.category] } : {}}
                        >
                            <Building2 className="w-4 h-4 opacity-70" />
                            {b.name}
                        </button>
                    ))}
                </div>

                {/* Building Detail Panel (Animated Slide Down/Pop) */}
                <AnimatePresence>
                    {selectedBuilding && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, y: -20 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -20 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden mt-6"
                        >
                            <div className="p-8 rounded-[24px] bg-surface-elevation-1 border border-white/10 relative shadow-2xl">
                                
                                <button onClick={() => setSelected(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="mb-8 max-w-2xl">
                                    <div className="inline-block px-3 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase mb-3 border bg-opacity-10"
                                         style={{ color: CATEGORY_COLORS[selectedBuilding.category], borderColor: `${CATEGORY_COLORS[selectedBuilding.category]}40`, backgroundColor: `${CATEGORY_COLORS[selectedBuilding.category]}1a` }}
                                    >
                                        {selectedBuilding.category} • {selectedBuilding.totalFloors} Floors
                                    </div>
                                    <h3 className="text-3xl font-bold text-white mb-3">
                                        {selectedBuilding.name}
                                    </h3>
                                    <p className="text-text-secondary font-medium leading-relaxed">
                                        {selectedBuilding.description}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5 mb-8">
                                    <div>
                                        <p className="text-[10px] font-bold tracking-widest uppercase text-text-secondary/60 mb-4">Resident Departments</p>
                                        <div className="flex flex-col gap-3">
                                            {selectedBuilding.departments.map((d) => (
                                                <div key={d} className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[selectedBuilding.category] }} />
                                                    <span className="text-sm font-bold text-white">{d}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold tracking-widest uppercase text-text-secondary/60 mb-4">Available Resources & Facilities</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedBuilding.availableResources.map((r) => (
                                                <span key={r} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-text-secondary">
                                                    {r}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Central Library: show all book sections ── */}
                                {selectedBuilding.id === 'bldg-003' && (
                                    <div className="pt-6 border-t border-white/5">
                                        <div className="flex items-center justify-between mb-5">
                                            <p className="text-[10px] font-bold tracking-widest uppercase text-primary-accent flex items-center gap-2">
                                                <BookOpen className="w-4 h-4" /> Library Sections ({LIBRARY_SECTIONS.length} sections)
                                            </p>
                                            <a href="/#library"
                                                className="flex items-center gap-1.5 text-[10px] font-bold text-primary-accent hover:underline"
                                                onClick={() => setSelected(null)}>
                                                Browse Full Library <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>

                                        {/* Floor legend */}
                                        <div className="flex flex-wrap gap-3 mb-5">
                                            {Object.entries(FLOOR_COLORS).map(([floor, clr]) => (
                                                <div key={floor} className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${clr.dot}`} />
                                                    <span className={`text-[10px] font-bold ${clr.text}`}>{floor}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                                            {LIBRARY_SECTIONS.map((sec, idx) => {
                                                const floor = inferFloor(sec.section)
                                                const clr = FLOOR_COLORS[floor] || FLOOR_COLORS['Ground Floor']
                                                return (
                                                    <motion.a
                                                        key={sec.section}
                                                        href="/#library"
                                                        onClick={() => setSelected(null)}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.03 }}
                                                        className={`block p-4 rounded-xl border ${clr.border} ${clr.bg} hover:brightness-110 transition-all cursor-pointer group`}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className={`text-sm font-black ${clr.text}`}>{sec.section}</span>
                                                            <span className="text-[10px] font-bold text-text-secondary bg-white/5 px-2 py-0.5 rounded-full">
                                                                {sec.concepts.length} {sec.concepts.length === 1 ? 'book' : 'books'}
                                                            </span>
                                                        </div>
                                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${clr.text} opacity-70 mb-1.5`}>
                                                            {floor}
                                                        </p>
                                                        <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-2">
                                                            {sec.subjects.slice(0, 2).join(', ')}{sec.subjects.length > 2 ? ` +${sec.subjects.length - 2} more` : ''}
                                                        </p>
                                                    </motion.a>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
                    {[
                        { label: 'Campus Buildings', value: '8' },
                        { label: 'Academic Blocks', value: '3' },
                        { label: 'Total Stories', value: '34' },
                        { label: 'Departments', value: '12' },
                    ].map((s, i) => (
                        <motion.div 
                            key={s.label}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.4 }}
                        >
                            <GlassCard className="!p-6 text-center hover:border-primary-accent/30 transition-colors group">
                                <p className="text-4xl font-bold text-white group-hover:text-primary-accent transition-colors mb-2">{s.value}</p>
                                <p className="text-xs font-bold text-text-secondary tracking-widest uppercase">{s.label}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
