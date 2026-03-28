import React from "react";
import { motion } from "framer-motion";

export const GlassButton = ({ children, variant = "primary", className = "", ...props }) => (
  <motion.button
    whileHover={{ scale: 1.05, y: -2 }}
    whileTap={{ scale: 0.95 }}
    className={`glass-button ${variant === "primary" ? "glass-button-primary" : "glass-button-secondary"} ${className}`}
    {...props}
  >
    {children}
  </motion.button>
);
