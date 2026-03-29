import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const LandingPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const ballRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // --- Three.js Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasRef.current.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 10, 5);
    scene.add(keyLight);

    const accentLight = new THREE.PointLight(0xffd85f, 2, 50);
    accentLight.position.set(-5, 0, 5);
    scene.add(accentLight);

    // --- Ball Group (for separating path from roll/float) ---
    const ballGroup = new THREE.Group();
    scene.add(ballGroup);

    // --- Solid Ball ---
    const geometry = new THREE.SphereGeometry(1.2, 64, 64);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xFFD85F, 
      roughness: 0.15, 
      metalness: 0.9,
      transparent: true,
      opacity: 1
    });
    const ball = new THREE.Mesh(geometry, material);
    ballGroup.add(ball);
    ballRef.current = ball;

    // --- Animation Logic ---
    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (ball) {
        // Subtle floating
        ball.position.y = Math.sin(elapsedTime * 2) * 0.15;
        
        // Continuous rotation for rolling feel
        // We'll also add a dynamic rotation based on horizontal movement in ScrollTrigger
        ball.rotation.y += 0.005;
      }
      renderer.render(scene, camera);
    };
    animate();

    // --- Scroll Animations ---
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.scroll-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5,
      }
    });

    // Initial Path: Start clearly ABOVE the first text (Top of visible range)
    gsap.set(ballGroup.position, { x: 0, y: 7.5, z: 0 }); 
    
    // Phase 1: Descend into Section 1 (Left text -> Ball Right)
    tl.to(ballGroup.position, {
      x: 7,
      y: 3,
      ease: 'power1.inOut',
      duration: 1,
      onUpdate: () => { ball.rotation.z -= 0.05; }
    });

    // Phase 2: Move to Section 2 Area (Right Text -> Ball Left)
    tl.to(ballGroup.position, {
      x: -7,
      y: -1,
      ease: 'power1.inOut',
      duration: 1,
      onUpdate: () => { ball.rotation.z += 0.05; }
    });

    // Phase 3: Move to Section 3 Area (Left Text -> Ball Right)
    tl.to(ballGroup.position, {
      x: 7,
      y: -5,
      ease: 'power1.inOut',
      duration: 1,
      onUpdate: () => { ball.rotation.z -= 0.05; }
    });

    // Phase 4: Focus at Section 4 (Center Text -> Ball Center)
    tl.to(ballGroup.position, {
      x: 0,
      y: -7.5,
      z: 2,
      ease: 'power1.inOut',
      duration: 1
    });

    // Final Landing: Stop BELOW the final section
    tl.to(ballGroup.position, {
      y: -10,
      ease: 'power1.out',
      duration: 0.5
    });

    // Explicitly animate scale axes to satisfy GSAP/Three.js
    tl.to(ball.scale, {
      x: 2.5,
      y: 2.5,
      z: 2.5,
      duration: 1,
      ease: 'power1.inOut'
    }, 0.8); 

    // --- Resize Handler ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (canvasRef.current && canvasRef.current.contains(renderer.domElement)) {
        canvasRef.current.removeChild(renderer.domElement);
      }
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div className="relative bg-[#050505] font-['Urbanist','Inter',sans-serif] min-h-screen text-white overflow-x-hidden">
      {/* Three.js Canvas */}
      <div 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-1" 
      />

      {/* Dynamic Background Blob */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-primary-accent opacity-[0.03] blur-[120px]" />
      </div>
      
      {/* Scrollable Content */}
      <div className="scroll-container relative z-10">
        <style>{`
          .scroll-section {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 0 10vw;
          }
          .scroll-content {
            max-width: 600px;
          }
          .section-title {
            font-size: clamp(3rem, 6vw, 5.5rem);
            font-weight: 700;
            line-height: 1.05;
            color: #ffffff;
            letter-spacing: -0.02em;
            margin-bottom: 1.5rem;
          }
          .section-desc {
            font-size: clamp(1.1rem, 2vw, 1.4rem);
            line-height: 1.5;
            color: rgba(255, 255, 255, 0.6);
          }
          .text-primary-accent { color: #FFD85F; }
          .bg-primary-accent { background-color: #FFD85F; }
        `}</style>

        {/* Section 1: Hover */}
        <section className="scroll-section">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            viewport={{ once: false, amount: 0.5 }}
            className="scroll-content"
          >
            <h1 className="section-title">
              Learnif<span className="text-primary-accent">AI</span>
            </h1>
            <p className="section-desc">
              Unlocking the world's knowledge through the lens of artificial intelligence. 
              Discover a new way to interact with information.
            </p>
          </motion.div>
        </section>

        {/* Section 2: The Toss */}
        <section className="scroll-section items-end text-right">
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            className="scroll-content"
          >
            <h2 className="section-title">The Dynamic Toss</h2>
            <p className="section-desc">
              Information is not static. It's energetic, moving, and constantly evolving. 
              Watch as concepts take flight and spin into clarity.
            </p>
          </motion.div>
        </section>

        {/* Section 3: The Drop */}
        <section className="scroll-section">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            className="scroll-content"
          >
            <h2 className="section-title">Solid Foundation</h2>
            <p className="section-desc">
              When knowledge lands, it sticks. Our AI ensures that every drop of 
              insight is grounded in solid, actionable data.
            </p>
          </motion.div>
        </section>

        {/* Section 4: Pages Turn */}
        <section className="scroll-section items-center text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            className="scroll-content"
          >
            <h2 className="section-title">Open the Future</h2>
            <p className="section-desc mx-auto">
              Turn the pages of innovation. Every scroll is a step deeper into 
              the future of personalized learning and AI-driven discovery.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/auth')}
              className="mt-10 px-10 py-4 bg-primary-accent text-black text-lg font-bold rounded-full shadow-[0_0_30px_rgba(255,216,95,0.25)] pointer-events-auto transition-shadow cursor-pointer"
            >
              Get Started →
            </motion.button>
          </motion.div>
        </section>

        {/* ══════════════ SCIENCE SECTION ══════════════ */}
        <section id="science" className="relative py-32 px-[10vw]">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFD85F]/[0.02] to-transparent pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, amount: 0.3 }}
            className="max-w-6xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-[2px] bg-[#FFD85F]" />
              <span className="text-[#FFD85F] text-xs font-bold uppercase tracking-[0.25em]">The Science</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Powered by <span className="text-[#FFD85F]">Bayesian</span><br />Knowledge Tracing
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mb-16 leading-relaxed">
              Our engine doesn't just track scores — it models the probability that you truly understand each concept, 
              updating in real-time as you learn.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  num: '01',
                  title: 'Probabilistic Mastery',
                  desc: 'Each concept is tracked as a probability distribution, not a binary pass/fail. We calculate P(Know) using prior knowledge, slip rates, and guess factors derived from educational research.'
                },
                {
                  num: '02',
                  title: 'Adaptive Questioning',
                  desc: 'The diagnostic engine selects questions that maximally reduce uncertainty about your knowledge state. Each answer updates the Bayesian posterior, zeroing in on your exact weak points.'
                },
                {
                  num: '03',
                  title: 'Root Cause Analysis',
                  desc: 'When you struggle with a concept, our dependency graph traces back through prerequisites to find the foundational gap — the real reason you\'re stuck, not just the symptom.'
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  viewport={{ once: true }}
                  className="p-8 rounded-3xl bg-white/[0.03] border border-white/[0.06] hover:border-[#FFD85F]/20 transition-all duration-500 group"
                >
                  <span className="text-[#FFD85F]/30 text-5xl font-black block mb-4 group-hover:text-[#FFD85F]/60 transition-colors">{item.num}</span>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Formula Display */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              viewport={{ once: true }}
              className="mt-16 p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center"
            >
              <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Core Update Rule</p>
              <p className="text-2xl md:text-3xl font-mono text-[#FFD85F]/80 tracking-wider">
                P(Kₙ) = P(Kₙ₋₁) + (1 − P(Kₙ₋₁)) · P(T)
              </p>
              <p className="text-white/30 text-xs mt-4 max-w-lg mx-auto">
                Where P(Kₙ) is the updated mastery, P(Kₙ₋₁) is the prior, and P(T) is the probability of learning upon exposure — calibrated per student.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* ══════════════ FEATURES SECTION ══════════════ */}
        <section id="platform" className="relative py-32 px-[10vw]">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, amount: 0.2 }}
            className="max-w-6xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-[2px] bg-[#FFD85F]" />
              <span className="text-[#FFD85F] text-xs font-bold uppercase tracking-[0.25em]">Platform</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-16 leading-tight">
              Everything you need to<br /><span className="text-[#FFD85F]">master your curriculum</span>
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: '🧠', title: 'AI Diagnostics', desc: 'Take a 10-minute adaptive test. Our BKT engine maps your exact knowledge state and pinpoints weak spots across every subject.', tag: 'CORE' },
                { icon: '📚', title: 'Physical Library Map', desc: 'We don\'t just recommend a textbook — we tell you exactly which shelf, row, and section in your university library has the book you need.', tag: 'UNIQUE' },
                { icon: '🗺️', title: '3D Concept Explorer', desc: 'Navigate a living 3D cube of your curriculum. Click any concept tile to see its academic hierarchy, recommended readings, and mastery progress.', tag: 'VISUAL' },
                { icon: '👩‍🏫', title: 'Faculty Rating System', desc: 'Rate your professors anonymously. Community-driven scores dynamically reorder the faculty directory so you can find the best mentors.', tag: 'COMMUNITY' },
                { icon: '📊', title: 'Learning Analytics', desc: 'Track your weekly learning hours with a live dashboard. See your Saturday peaks, Sunday streaks, and identify patterns in your study habits.', tag: 'DATA' },
                { icon: '🔗', title: 'Dependency Graph', desc: 'Visualize prerequisite chains between concepts. Understand why you\'re stuck on Laplace Transforms by seeing you missed Complex Numbers first.', tag: 'INSIGHT' }
              ].map((feat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.06] hover:border-[#FFD85F]/20 hover:bg-white/[0.05] transition-all duration-500 group cursor-default"
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-3xl">{feat.icon}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#FFD85F]/50 bg-[#FFD85F]/5 border border-[#FFD85F]/10 px-2 py-1 rounded-full">{feat.tag}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#FFD85F] transition-colors">{feat.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ══════════════ ABOUT SECTION ══════════════ */}
        <section id="about" className="relative py-32 px-[10vw]">
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#FFD85F]/[0.015] to-transparent pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, amount: 0.3 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="w-10 h-[2px] bg-[#FFD85F]" />
              <span className="text-[#FFD85F] text-xs font-bold uppercase tracking-[0.25em]">About</span>
              <span className="w-10 h-[2px] bg-[#FFD85F]" />
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
              Built by students,<br /><span className="text-[#FFD85F]">for students</span>
            </h2>

            <p className="text-white/50 text-lg leading-relaxed max-w-2xl mx-auto mb-12">
              LearnifAI was born out of a simple frustration — students don't fail because they're not smart enough. 
              They fail because they study the wrong things. Our team of engineering students at SCOE built this platform 
              to solve that exact problem using Bayesian AI and the physical library resources already available on campus.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              {[
                { value: '500+', label: 'Concepts Mapped' },
                { value: '8', label: 'Subjects Covered' },
                { value: '24', label: '3D Explorer Tiles' },
                { value: '∞', label: 'Learning Potential' }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <p className="text-3xl font-black text-[#FFD85F] mb-1">{stat.value}</p>
                  <p className="text-xs font-bold text-white/30 uppercase tracking-wider">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/auth')}
                className="px-10 py-4 bg-[#FFD85F] text-black text-lg font-bold rounded-full shadow-[0_0_30px_rgba(255,216,95,0.25)] pointer-events-auto transition-shadow cursor-pointer"
              >
                Sign In
              </motion.button>
            </div>
          </motion.div>

          {/* Footer */}
          <div className="mt-32 pt-8 border-t border-white/[0.06] text-center">
            <p className="text-white/20 text-xs font-bold tracking-wider">
              © 2026 LearnifAI — SCOE, Pune. Built with Bayesian Knowledge Tracing.
            </p>
          </div>
        </section>
      </div>

      {/* Navigation Overlay */}
      <nav className="fixed top-0 left-0 w-full p-8 px-10 z-20 flex justify-between items-center pointer-events-none bg-gradient-to-b from-black/60 to-transparent">
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-2xl font-bold tracking-tighter pointer-events-auto cursor-pointer text-white hover:text-[#FFD85F] transition-colors"
        >
          Learnif<span className="text-[#FFD85F]">AI</span>
        </div>
        <div className="flex gap-10 text-xs font-bold uppercase tracking-widest text-white/50 pointer-events-auto">
          <a href="#science" className="hover:text-[#FFD85F] transition-colors">Science</a>
          <a href="#platform" className="hover:text-[#FFD85F] transition-colors">Platform</a>
          <a href="#about" className="hover:text-[#FFD85F] transition-colors">About</a>
        </div>
      </nav>
    </div>
  );
};

export default LandingPage;
