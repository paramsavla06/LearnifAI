import React from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import Navbar from "../Navbar";
import Footer from "../Footer";
import CustomCursor from "../CustomCursor";

export default function MainLayout({ children }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen selection:bg-primary-accent/30 bg-background-base">
      <CustomCursor />
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary-accent z-[100] origin-left"
        style={{ scaleX }}
      />
      
      <Navbar />
      
      <main className="pt-28 pb-20 px-8 max-w-[1600px] mx-auto">
        {children}
      </main>

      <Footer />
    </div>
  );
}
