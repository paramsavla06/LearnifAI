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
              onClick={() => navigate('/dashboard')}
              className="mt-10 px-10 py-4 bg-primary-accent text-black text-lg font-bold rounded-full shadow-[0_0_30px_rgba(255,216,95,0.25)] pointer-events-auto transition-shadow cursor-pointer"
            >
              Enter Dashboard
            </motion.button>
          </motion.div>
        </section>
      </div>

      {/* Navigation Overlay */}
      <nav className="fixed top-0 left-0 w-full p-8 px-10 z-20 flex justify-between items-center pointer-events-none">
        <div className="text-2xl font-bold tracking-tighter pointer-events-auto cursor-pointer text-white">
          Learnif<span className="text-primary-accent">AI</span>
        </div>
        <div className="flex gap-10 text-xs font-bold uppercase tracking-widest text-white/50 pointer-events-auto">
          <a href="#" className="hover:text-white transition-colors">Platform</a>
          <a href="#" className="hover:text-white transition-colors">Science</a>
          <a href="#" className="hover:text-white transition-colors">About</a>
        </div>
      </nav>


    </div>
  );
};

export default LandingPage;
