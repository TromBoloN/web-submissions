"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";

import Image from "next/image";

import { Check, Copy } from "lucide-react";

import mitWeekLogo from "@/styles/flag-icons/MIT-WEEK, WEB LOGO.png";

type GuardianIdCardProps = {
  teamCode: string;
  teamName: string;
  institution: string;
  leaderName: string;
  members: string[];
};

const MAX_TILT_DEG = 6;

/** Tilt only for a mouse/pen and when the user has not asked for reduced motion. */
function useTiltAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: no-preference) and (hover: hover)");
    const update = () => setAllowed(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return allowed;
}

export function GuardianIdCard({ teamCode, teamName, institution, leaderName, members }: GuardianIdCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const tiltAllowed = useTiltAllowed();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  // Leader first, then the other members without repeating the leader.
  const otherMembers = Array.from(
    new Set(members.map((name) => name.trim()).filter((name) => name && name !== leaderName.trim())),
  );

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!tiltAllowed || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * MAX_TILT_DEG * 2, y: px * MAX_TILT_DEG * 2 });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(teamCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      ref={cardRef}
      aria-label="Guardian ID tim"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      style={
        tiltAllowed
          ? {
              transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: "transform 0.15s ease-out",
            }
          : undefined
      }
      className="surface-loud flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 bg-ink px-5 py-2.5 text-ink-foreground">
        <span className="font-bold font-mono text-[11px] uppercase tracking-[0.2em]">Guardian ID</span>
        <span className="font-mono text-[11px] uppercase tracking-wider opacity-90">Akses peserta</span>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-center gap-4">
          {/* Official MIT-WEEK hex logo; transparent padding, so scale it to fill the badge slot. */}
          <Image
            src={mitWeekLogo}
            alt=""
            width={128}
            height={128}
            className="size-16 shrink-0 scale-[1.3] object-contain drop-shadow-[3px_3px_0_var(--ink)]"
          />
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-foreground/75 uppercase tracking-wider">Kode tim</p>
            <div className="flex items-center gap-1">
              <p className="break-all font-bold font-mono text-2xl text-ink leading-tight sm:text-3xl">{teamCode}</p>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Kode tim tersalin" : "Salin kode tim"}
                className="press grid size-8 shrink-0 place-items-center rounded-full text-ink hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              >
                {copied ? <Check className="size-4" strokeWidth={3} /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="font-display font-extrabold text-foreground text-xl leading-tight [overflow-wrap:anywhere]">
            {teamName}
          </p>
          <p className="mt-0.5 text-muted-foreground text-sm [overflow-wrap:anywhere]">{institution}</p>
        </div>

        <div className="border-ink/40 border-t-2 border-dashed pt-4">
          <p className="mb-2 font-mono text-[11px] text-foreground/75 uppercase tracking-wider">Anggota</p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-medium" title={leaderName}>
                {leaderName}
              </span>
              <span className="shrink-0 rounded-full border-2 border-ink px-2 py-px font-bold font-mono text-[11px] text-ink uppercase">
                Ketua
              </span>
            </li>
            {otherMembers.map((name) => (
              <li key={name} className="min-w-0 truncate text-foreground/90" title={name}>
                {name}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-auto font-mono text-[11px] text-foreground/75 uppercase tracking-wider">
          MIT-WEEK 2026 · Web Development
        </p>
      </div>
    </section>
  );
}
