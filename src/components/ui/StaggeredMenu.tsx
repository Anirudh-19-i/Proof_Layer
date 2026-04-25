import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MenuItem {
  label: string;
  ariaLabel: string;
  link: string;
}

interface SocialItem {
  label: string;
  link: string;
}

interface StaggeredMenuProps {
  position?: 'left' | 'right';
  items: MenuItem[];
  socialItems?: SocialItem[];
  displaySocials?: boolean;
  displayItemNumbering?: boolean;
  menuButtonColor?: string;
  openMenuButtonColor?: string;
  changeMenuColorOnOpen?: boolean;
  colors?: string[];
  logoUrl?: string;
  accentColor?: string;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}

export default function StaggeredMenu({
  position = 'right',
  items,
  socialItems = [],
  displaySocials = true,
  displayItemNumbering = true,
  menuButtonColor = "#ffffff",
  openMenuButtonColor = "#fff",
  accentColor = "#5227FF",
  onMenuOpen,
  onMenuClose
}: StaggeredMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) onMenuOpen?.();
    else onMenuClose?.();
  };

  const menuVariants = {
    closed: { 
      x: position === 'right' ? '100%' : '-100%', 
      transition: { type: 'spring', stiffness: 300, damping: 30 } as const
    },
    open: { 
      x: 0, 
      transition: { type: 'spring', stiffness: 300, damping: 30 } as const
    }
  };

  const itemVariants = {
    closed: { opacity: 0, x: position === 'right' ? 50 : -50 },
    open: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1, duration: 0.5 }
    })
  };

  return (
    <>
      <button
        onClick={toggleMenu}
        style={{ color: isOpen ? openMenuButtonColor : menuButtonColor }}
        className={`fixed top-8 ${position === 'right' ? 'right-8' : 'left-8'} z-[100] p-4 bg-[#141414] hover:bg-[#F27D26] transition-colors shadow-2xl`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
            className={`fixed inset-0 z-[90] bg-[#141414] text-white flex flex-col justify-center items-center p-12 ${position === 'right' ? 'ml-auto' : 'mr-auto'} md:w-1/3 w-full border-l border-white/10`}
          >
            <div className="flex flex-col gap-8 w-full max-w-xs">
              {items.map((item, i) => (
                <motion.div
                  key={item.label}
                  custom={i}
                  variants={itemVariants}
                >
                  <Link
                    to={item.link}
                    className="group flex items-baseline gap-4 hover:text-[#F27D26] transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {displayItemNumbering && (
                      <span className="text-xs font-mono text-gray-500">0{i + 1}</span>
                    )}
                    <span className="text-4xl font-black uppercase tracking-tighter">{item.label}</span>
                  </Link>
                </motion.div>
              ))}
            </div>

            {displaySocials && (
              <div className="mt-20 flex gap-6">
                {socialItems.map((social, i) => (
                  <motion.a
                    key={social.label}
                    href={social.link}
                    custom={items.length + i}
                    variants={itemVariants}
                    className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                  >
                    {social.label}
                  </motion.a>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
