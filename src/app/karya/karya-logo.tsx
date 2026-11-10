"use client";

import { useId } from "react";

export function KaryaLogo({ className, spin = true }: { className?: string; spin?: boolean }) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ringId = `karya-ring-${rawId}`;
  const faceId = `karya-face-${rawId}`;
  const orbitBlueId = `karya-orbit-blue-${rawId}`;
  const orbitPurpleId = `karya-orbit-purple-${rawId}`;

  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Logo MIT-WEEK 2026">
      <title>Logo MIT-WEEK 2026</title>
      <defs>
        <linearGradient id={ringId} x1="18" y1="10" x2="106" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7a97ef" />
          <stop offset="0.52" stopColor="#5cb9cb" />
          <stop offset="1" stopColor="#1fe28d" />
        </linearGradient>
        <linearGradient id={faceId} x1="30" y1="26" x2="94" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.94" />
          <stop offset="0.56" stopColor="#dfe7fa" stopOpacity="0.68" />
          <stop offset="1" stopColor="#9bf2cf" stopOpacity="0.62" />
        </linearGradient>
        <linearGradient id={orbitBlueId} x1="30" y1="42" x2="92" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8ea7f2" />
          <stop offset="1" stopColor="#4d6bd2" />
        </linearGradient>
        <linearGradient id={orbitPurpleId} x1="28" y1="80" x2="94" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7d5cf2" />
          <stop offset="1" stopColor="#5334c9" />
        </linearGradient>
      </defs>

      <path
        d="M60 10 103.3 35v50L60 110 16.7 85V35Z"
        fill={`url(#${faceId})`}
        stroke="#ffffff"
        strokeOpacity="0.38"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M60 7 107 34.5v51L60 113 13 85.5v-51Z"
        fill="none"
        stroke={`url(#${ringId})`}
        strokeWidth="10"
        strokeLinejoin="round"
      />

      <g className={spin ? "orbit" : undefined} style={{ transformBox: "view-box", transformOrigin: "60px 60px" }}>
        <ellipse
          cx="60"
          cy="60"
          rx="33"
          ry="14.5"
          fill="none"
          stroke={`url(#${orbitBlueId})`}
          strokeWidth="3.6"
          transform="rotate(-22 60 60)"
        />
        <ellipse
          cx="60"
          cy="60"
          rx="31"
          ry="13.5"
          fill="none"
          stroke={`url(#${orbitPurpleId})`}
          strokeWidth="3.6"
          transform="rotate(24 60 60)"
        />
        <ellipse
          cx="60"
          cy="60"
          rx="28"
          ry="12"
          fill="none"
          stroke="#8ea7f2"
          strokeOpacity="0.6"
          strokeWidth="1.6"
          transform="rotate(82 60 60)"
        />
      </g>
    </svg>
  );
}
