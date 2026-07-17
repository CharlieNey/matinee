/**
 * `ViewTransition` ships in the React canary that Next.js vendors for App
 * Router (enabled via `experimental.viewTransition`), but @types/react@19
 * doesn't declare it yet. Minimal surface we use — see
 * node_modules/next/dist/docs/01-app/02-guides/view-transitions.md.
 */
import "react";

declare module "react" {
  type ViewTransitionClass = string | Record<string, string>;

  interface ViewTransitionProps {
    children?: React.ReactNode;
    /** Shared-element identity across pages. Must be unique per page. */
    name?: string;
    default?: ViewTransitionClass;
    enter?: ViewTransitionClass;
    exit?: ViewTransitionClass;
    share?: ViewTransitionClass;
    update?: ViewTransitionClass;
  }

  export const ViewTransition: React.ComponentType<ViewTransitionProps>;
}
