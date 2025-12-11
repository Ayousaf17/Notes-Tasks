
"use client"

import React from "react"
import { motion } from "framer-motion"
import { Home, Settings, Bell, User, Moon, Sun } from "lucide-react"
// We adapt this to accept theme from props to avoid context conflicts with App.tsx
// But standard imports are kept for structure
import { Switch } from "./switch"

interface MenuItem {
  icon: React.ReactNode
  label: string
  onClick: () => void
  isActive?: boolean
  gradient: string
  iconColor: string
}

interface GlowMenuProps {
    items: MenuItem[];
    isDarkMode: boolean;
    toggleTheme: () => void;
}

const itemVariants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
}

const backVariants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
}

const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 2,
    transition: {
      opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
      scale: { duration: 0.5, type: "spring", stiffness: 300, damping: 25 },
    },
  },
}

const navGlowVariants = {
  initial: { opacity: 0 },
  hover: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

const sharedTransition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
  duration: 0.5,
}

export function MenuBar({ items, isDarkMode, toggleTheme }: GlowMenuProps) {
  return (
    <motion.nav
      className="p-2 rounded-2xl bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-lg border border-border/40 shadow-lg relative overflow-hidden flex items-center gap-4"
      initial="initial"
      whileHover="hover"
    >
      <motion.div
        className={`absolute -inset-2 bg-gradient-radial from-transparent ${
          isDarkMode
            ? "via-blue-400/30 via-30% via-purple-400/30 via-60% via-red-400/30 via-90%"
            : "via-blue-400/20 via-30% via-purple-400/20 via-60% via-red-400/20 via-90%"
        } to-transparent rounded-3xl z-0 pointer-events-none`}
        variants={navGlowVariants}
      />
      
      <ul className="flex items-center gap-2 relative z-10">
        {items.map((item) => (
          <motion.li key={item.label} className="relative">
            <motion.button
              onClick={item.onClick}
              className="block rounded-xl overflow-visible group relative"
              style={{ perspective: "600px" }}
              whileHover="hover"
              initial="initial"
            >
              <motion.div
                className="absolute inset-0 z-0 pointer-events-none"
                variants={glowVariants}
                style={{
                  background: item.gradient,
                  opacity: 0,
                  borderRadius: "16px",
                }}
              />
              <motion.div
                className={`flex items-center gap-2 px-4 py-2 relative z-10 bg-transparent transition-colors rounded-xl ${item.isActive ? 'text-foreground font-semibold' : 'text-muted-foreground group-hover:text-foreground'}`}
                variants={itemVariants}
                transition={sharedTransition}
                style={{ transformStyle: "preserve-3d", transformOrigin: "center bottom" }}
              >
                <span className={`transition-colors duration-300 ${item.isActive ? item.iconColor : `group-hover:${item.iconColor}`} text-foreground`}>
                  {item.icon}
                </span>
                <span className="hidden md:inline">{item.label}</span>
              </motion.div>
              <motion.div
                className="flex items-center gap-2 px-4 py-2 absolute inset-0 z-10 bg-transparent text-muted-foreground group-hover:text-foreground transition-colors rounded-xl"
                variants={backVariants}
                transition={sharedTransition}
                style={{ transformStyle: "preserve-3d", transformOrigin: "center top", rotateX: 90 }}
              >
                <span className={`transition-colors duration-300 group-hover:${item.iconColor} text-foreground`}>
                  {item.icon}
                </span>
                <span className="hidden md:inline">{item.label}</span>
              </motion.div>
            </motion.button>
          </motion.li>
        ))}
      </ul>

      {/* Theme Toggle Integration */}
      <div className="flex items-center space-x-2 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative z-10 border-l border-border/50 pl-4">
        <Switch
            checked={isDarkMode}
            onCheckedChange={toggleTheme}
            className="transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110 data-[state=checked]:bg-zinc-800"
        />
      </div>
    </motion.nav>
  )
}
