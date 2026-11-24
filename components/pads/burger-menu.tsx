"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ClipboardText,
  List,
  Package,
  Truck,
  Users,
  X,
} from "@phosphor-icons/react";
import { PressableButton, halo } from "@/components/pads/swift/pressable-button";
import { springs } from "@/lib/pads/swift/springs";
import { haptic } from "@/lib/pads/swift/haptic";

/**
 * BurgerMenu: the charcoal burger at the bottom-left and the menu it expands,
 * as in the SwiftUI prototype (and its web port, Pedir's bar).
 *
 * Tap the burger and the pills stack up out of it: each one grows from the
 * burger's centre (scaleX 0 to 1, with a light vertical squeeze so a closing
 * pill ends as a dot, not a line) and rises into place on `popping`, the
 * bottom one first. Closing runs the other way on `shrinking`, the top one
 * first. The icon turns into an X while the menu is open. A tap on a pill or
 * anywhere outside closes it.
 *
 * `hidden` slides the burger out to the left (the FAB opening its sheet) and
 * closes the menu with it.
 */

const ITEMS = [
  { icon: Users, label: "USUARIOS" },
  { icon: ClipboardText, label: "PEDIDOS" },
  { icon: Package, label: "ENTREGADO" },
  { icon: Truck, label: "TRASLADO" },
] as const;

const PILL_WIDTH = 248;
const PILL_HEIGHT = 64;
const PILL_RADIUS = 20;
const GAP = 8;
const CHARCOAL = "#1C1C1C";

export function BurgerMenu({
  left = 16,
  bottom = 24,
  width = 84,
  height = 80,
  radius = 24,
  hidden = false,
  z = 40,
}: {
  left?: number;
  bottom?: number;
  width?: number;
  height?: number;
  radius?: number;
  hidden?: boolean;
  /** Stacking level of the burger; the outside-tap layer sits just under it. */
  z?: number;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = open && !hidden;

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  const count = ITEMS.length;

  return (
    <>
      {/* Outside tap closes. Transparent: the pills read on their own. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className="fixed inset-0"
        style={{ zIndex: z - 1, pointerEvents: isOpen ? "auto" : "none" }}
      />

      <motion.div
        className="fixed"
        style={{ left, bottom, width, height, zIndex: z }}
        animate={{ x: hidden ? -(width + left + 20) : 0 }}
        transition={hidden ? springs.shrinking : springs.expanding}
      >
        {/* Pills, behind the burger so they come out of it. */}
        {ITEMS.map((item, index) => {
          const fromBottom = count - 1 - index;
          const y = -(height + GAP) - fromBottom * (PILL_HEIGHT + GAP);
          const transition = isOpen
            ? { ...springs.popping, delay: fromBottom * 0.05 }
            : { ...springs.shrinking, delay: index * 0.04 };
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              className="absolute bottom-0 left-0"
              style={{
                width: PILL_WIDTH,
                height: PILL_HEIGHT,
                originX: width / 2 / PILL_WIDTH,
                originY: 1,
                pointerEvents: isOpen ? "auto" : "none",
                willChange: "transform",
              }}
              initial={false}
              animate={{
                scaleX: isOpen ? 1 : 0,
                scaleY: isOpen ? 1 : 0.4,
                y: isOpen ? y : 0,
                opacity: isOpen ? 1 : 0,
              }}
              transition={transition}
            >
              <PressableButton
                haloColor={halo.black}
                cornerRadius={PILL_RADIUS}
                onPressStart={() => haptic.select()}
                onClick={() => setOpen(false)}
                style={{
                  background: CHARCOAL,
                  borderRadius: PILL_RADIUS,
                  width: PILL_WIDTH,
                  height: PILL_HEIGHT,
                }}
                className="flex items-center justify-start gap-4 px-6 text-left text-white"
              >
                <Icon size={22} weight="bold" />
                <span className="text-base font-bold tracking-wider">
                  {item.label}
                </span>
              </PressableButton>
            </motion.div>
          );
        })}

        <PressableButton
          haloColor={halo.black}
          cornerRadius={radius}
          onPressStart={() => haptic.select()}
          onClick={() => setOpen((v) => !v)}
          style={{ width, height, borderRadius: radius, background: CHARCOAL }}
          className="relative flex items-center justify-center text-white"
          aria-label={isOpen ? "Cerrar menú" : "Menú"}
          aria-expanded={isOpen}
        >
          <motion.span
            key={isOpen ? "x" : "list"}
            initial={{ scale: 0.6, opacity: 0, rotate: isOpen ? -90 : 90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={springs.popping}
            className="flex"
          >
            {isOpen ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
          </motion.span>
        </PressableButton>
      </motion.div>
    </>
  );
}
