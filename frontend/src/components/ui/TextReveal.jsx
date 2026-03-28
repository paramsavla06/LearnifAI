import React from "react";
import { motion } from "framer-motion";

export const TextReveal = ({ children, className = "", delay = 0 }) => (
  <div className={`text-reveal ${className}`}>
    <motion.div
      initial={{ y: "100%" }}
      whileInView={{ y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  </div>
);
