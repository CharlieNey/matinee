"use client";

import { MotionConfig } from "motion/react";
import { AppProvider } from "@/lib/store";
import { ToastProvider } from "./Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <ToastProvider>{children}</ToastProvider>
      </AppProvider>
    </MotionConfig>
  );
}
