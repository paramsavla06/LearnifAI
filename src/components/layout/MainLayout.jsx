import React from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useLocation } from "react-router-dom";
import Navbar from "../Navbar";
import Footer from "../Footer";
import CustomCursor from "../CustomCursor";
import { ActivityTracker } from "../ActivityTracker";

export default function MainLayout({ children }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const location = useLocation();
  const isAuth = location.pathname === '/auth';
  const isLanding = location.pathname === '/';

  return (
    <div className={`min-h-screen selection:bg-primary-accent/30 bg-background-base ${(isAuth || isLanding) ? '' : 'flex flex-col'}`}>
      <ActivityTracker />
      
      {!isAuth && !isLanding && (
        <motion.div
          className="fixed top-0 left-0 right-0 h-1 bg-primary-accent z-[100] origin-left"
          style={{ scaleX }}
        />
      )}
      
      {!isAuth && !isLanding && <Navbar />}
      
      {(isAuth || isLanding) ? (
        <main className="flex-1 w-full">
          {children}
        </main>
      ) : (
        <main className="pt-28 pb-20 px-8 max-w-[1600px] w-full mx-auto flex-1">
          {children}
        </main>
      )}

      {!isAuth && !isLanding && <Footer />}
    </div>
  );
}
