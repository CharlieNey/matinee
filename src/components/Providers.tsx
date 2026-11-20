"use client";

import { MotionConfig } from "motion/react";
import { AppProvider } from "@/lib/store";
import { PushProvider } from "./PushProvider";
import { ToastProvider } from "./Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <PushProvider>
          <ToastProvider>{children}</ToastProvider>
        </PushProvider>
      </AppProvider>
    </MotionConfig>
  );
}
