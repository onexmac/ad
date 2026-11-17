"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";
import { springs, cascadeOut } from "@/lib/histok/springs";
import { haptic } from "@/lib/histok/haptic";
import { kindLabel, type Franchise, type Item } from "@/data/updatr/types";
import { countdown, dot, relative } from "@/lib/updatr/format";

const cascade: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { ...springs.expanding, delay: 0.06 + i * 0.035 } }),
  exit: { opacity: 0, y: 0, transition: cascadeOut },
};

function Cascade({ i, children, className }: { i: number; children: React.ReactNode; className?: string }) {
  return (
    <motion.div custom={i} variants={cascade} initial="hidden" animate="show" exit="exit" className={className}>
      {children}
    </motion.div>
  );
}

function Row({ k, v, accent }: { k: string; v: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-rule-soft py-[10px]">
      <span className="mono text-ink-soft">{k}</span>
      <span className={`text-right text-[14px] leading-snug ${accent ? "text-accent" : ""}`}>{v}</span>
    </div>
  );
}

export function Detail({
  item,
  franchise,
  variant,
  layoutKey,
  position,
  onClose,
}: {
  item: Item;
  franchise: Franchise;
  variant: "a" | "b";
  /** layoutId of the image that was tapped, for the shared-element morph. */
  layoutKey?: string;
  position: string;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const close = () => {
    haptic.select();
    onClose();
  };

  const showImage = item.image && !failed;
  const meta = `${franchise.code} — ${kindLabel[item.kind]} — ${dot(item.date)}`;

  const hero = (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.05, bottom: 0.6 }}
      dragSnapToOrigin
      dragTransition={{ bounceStiffness: springs.snappy.stiffness, bounceDamping: springs.snappy.damping }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 110 || info.velocity.y > 700) close();
      }}
      style={{ touchAction: "pan-x", position: "relative", aspectRatio: variant === "a" ? "1 / 1" : "4 / 5" }}
    >
      <motion.div
        layoutId={layoutKey}
        initial={layoutKey ? false : { opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={layoutKey ? undefined : { opacity: 0 }}
        transition={springs.expanding}
        style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--ink)" }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.title}
            draggable={false}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div className="absolute inset-0 flex items-end bg-accent p-6 text-[40px] font-bold uppercase leading-[0.92] tracking-[-0.03em] text-paper">
            {item.title}
          </div>
        )}
      </motion.div>
    </motion.div>
  );

  const facts = (
    <>
      <Row k="Franchise" v={franchise.name} />
      <Row k="Studio" v={franchise.studio} />
      <Row k="Type" v={kindLabel[item.kind]} />
      <Row k="Status" v={item.status === "upcoming" ? "Upcoming" : item.status === "live" ? "Live now" : "Out"} />
      <Row k="Published" v={`${dot(item.date)} · ${relative(item.date)}`} />
      {item.when ? <Row k="Starts" v={`${dot(item.when)} · ${countdown(item.when)}`} accent /> : null}
      <Row k="Source" v={item.source} />
    </>
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-ground"
      initial={{ backgroundColor: "rgba(237,235,230,0)" }}
      animate={{ backgroundColor: "rgba(237,235,230,1)" }}
      exit={{ backgroundColor: "rgba(237,235,230,0)", transition: { duration: 0.25 } }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div className="mx-auto w-full max-w-[520px] pb-[calc(48px+var(--sab))]">
        <Cascade i={0} className="sticky top-0 z-10 flex items-center justify-between bg-ground/90 px-5 pb-3 pt-[calc(14px+var(--sat))] backdrop-blur-md">
          <button type="button" onClick={close} className="mono py-2 pr-4">
            ← Back
          </button>
          <span className="mono text-ink-soft">{position}</span>
          <button type="button" onClick={close} className="mono py-2 pl-4" aria-label="Close">
            Close ×
          </button>
        </Cascade>

        {variant === "a" ? (
          <>
            <div className="border-y border-rule">{hero}</div>
            <div className="px-5">
              <Cascade i={1} className="mono mt-6 text-ink-soft">
                {meta}
              </Cascade>
              <Cascade i={2}>
                <h2 className="mt-3 text-[34px] font-medium leading-[1.02] tracking-[-0.035em]">{item.title}</h2>
              </Cascade>
              <Cascade i={3}>
                <p className="mt-5 text-[19px] leading-[1.35] tracking-[-0.01em]">{item.dek}</p>
              </Cascade>
              <Cascade i={4} className="mt-8 border-b border-rule-soft">
                {facts}
              </Cascade>
              {item.body.map((para, i) => (
                <Cascade key={i} i={5 + i}>
                  <p className="mt-6 max-w-[60ch] text-[16px] leading-[1.55] text-ink/85">{para}</p>
                </Cascade>
              ))}
              <Cascade i={6 + item.body.length}>
                <SourceLink item={item} />
              </Cascade>
            </div>
          </>
        ) : (
          <div className="px-5">
            <div className="overflow-hidden">{hero}</div>
            <Cascade i={1} className="bg-ink px-6 pb-10 pt-6 text-paper">
              <div className="mono mb-8 flex justify-between text-paper/60">
                <span>{franchise.code}</span>
                <span>{item.when ? countdown(item.when) : relative(item.date)}</span>
              </div>
              <h2 className="text-[40px] font-bold uppercase leading-[0.9] tracking-[-0.04em]">{item.title}</h2>
            </Cascade>
            <Cascade i={2}>
              <p className="mt-7 text-[13px] font-medium uppercase tracking-[0.02em]">
                {franchise.name} — {franchise.studio}
              </p>
            </Cascade>
            <Cascade i={3} className="mt-5 grid grid-cols-[96px_1fr] gap-x-4 gap-y-[6px] text-[14px] leading-snug">
              <span className="text-ink-soft">Type</span>
              <span>{kindLabel[item.kind]}</span>
              <span className="text-ink-soft">Status</span>
              <span>{item.status === "upcoming" ? "Upcoming" : item.status === "live" ? "Live now" : "Out"}</span>
              <span className="mt-3 text-ink-soft">Published</span>
              <span className="mt-3">{dot(item.date)}</span>
              {item.when ? (
                <>
                  <span className="text-ink-soft">Starts</span>
                  <span className="text-accent">{dot(item.when)}</span>
                </>
              ) : null}
              <span className="mt-3 text-ink-soft">Source</span>
              <span className="mt-3">{item.source}</span>
              <span className="text-ink-soft">Reference</span>
              <span className="font-mono text-[13px]">UPD-{franchise.code}-{item.id.slice(-4).toUpperCase()}</span>
            </Cascade>
            <Cascade i={4}>
              <p className="mt-9 text-[20px] leading-[1.3] tracking-[-0.015em]">{item.dek}</p>
            </Cascade>
            {item.body.map((para, i) => (
              <Cascade key={i} i={5 + i}>
                <p className="mt-5 max-w-[60ch] text-[16px] leading-[1.55] text-ink/85">{para}</p>
              </Cascade>
            ))}
            <Cascade i={6 + item.body.length}>
              <SourceLink item={item} />
            </Cascade>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SourceLink({ item }: { item: Item }) {
  if (item.mock) {
    return <p className="mono mt-10 border-t border-rule pt-4 text-ink-soft">Sample entry — no source yet</p>;
  }
  if (!item.url) return null;
  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      whileTap={{ scale: 0.98 }}
      transition={springs.popping}
      className="mt-10 flex items-center justify-between border-y border-rule py-4 text-[17px] font-medium"
    >
      <span>Read at {item.source}</span>
      <span aria-hidden>↗</span>
    </motion.a>
  );
}
