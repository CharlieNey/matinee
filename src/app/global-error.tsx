"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/reportClientError";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => reportClientError(error), [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ margin: "20vh auto", maxWidth: 520, padding: 24 }}>
          <h1>Matinee hit an unexpected error.</h1>
          <p>The error was recorded. You can safely try loading the app again.</p>
          <button type="button" onClick={() => unstable_retry()}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
