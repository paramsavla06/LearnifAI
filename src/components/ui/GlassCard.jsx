import React from "react";
import { motion } from "framer-motion";

export const GlassCard = ({ children, className = "", delay = 0, ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
    whileHover={{ y: -8, backgroundColor: "rgba(255, 255, 255, 0.08)", transition: { duration: 0.3 } }}
    className={`glass-panel p-8 ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);
