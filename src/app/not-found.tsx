"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">Halaman tidak ditemukan.</h1>
      <p className="text-muted-foreground">Halaman yang Anda cari tidak tersedia.</p>
      <Link prefetch={false} replace href="/">
        <Button variant="outline">Kembali ke beranda</Button>
      </Link>
    </div>
  );
}
