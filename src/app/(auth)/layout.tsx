import type { ReactNode } from "react";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="theme-light flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10 text-foreground">
      {children}
    </main>
  );
}
