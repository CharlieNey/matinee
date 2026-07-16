"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThumbsUp } from "lucide-react";
import { Poster } from "@/components/Poster";
import { decodeSharedProfile, SharedProfile } from "@/lib/shareProfile";
import { getShow } from "@/lib/shows";

/**
 * Read-only shared profile (Phase 11): everything renders from the URL
 * fragment in the visitor's browser — the fragment never reaches a server,
 * and we run zero user infrastructure.
 */

const entryDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function SharedProfilePage() {
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "invalid" } | { kind: "ok"; profile: SharedProfile }
  >({ kind: "loading" });

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    if (!fragment) {
      setState({ kind: "invalid" });
      return;
    }
    decodeSharedProfile(fragment).then((profile) =>
      setState(profile ? { kind: "ok", profile } : { kind: "invalid" }),
    );
  }, []);

  if (state.kind === "loading") {
    return (
      <main className="px-4 pt-10 web:mx-auto web:max-w-[560px]">
        <div className="h-40 animate-pulse rounded-card bg-paper" aria-hidden />
      </main>
    );
  }

  if (state.kind === "invalid") {
    return (
      <main className="px-4 pt-16 text-center web:mx-auto web:max-w-[560px]">
        <h1 className="text-heading">This link didn&apos;t unpack</h1>
        <p className="mt-2 text-body text-ink-soft">
          Shared profiles live entirely in the link itself — this one looks
          incomplete or from a newer version.
        </p>
        <p className="mt-6">
          <Link
            href="/"
            className="text-body text-ink underline underline-offset-4"
          >
            Go to Theatr
          </Link>
        </p>
      </main>
    );
  }

  const { profile } = state;

  return (
    <main className="pb-12 web:mx-auto web:max-w-[560px]">
      <header
        className="px-4 pb-8 pt-8 text-white web:mt-8 web:rounded-card"
        style={{
          background:
            "linear-gradient(180deg, var(--color-espresso-glow) 0%, var(--color-espresso) 55%)",
        }}
      >
        <p className="text-caption font-semibold uppercase tracking-wide text-white/50">
          Shared theater diary
        </p>
        <h1 className="mt-2 text-[28px] font-extrabold tracking-tight">
          {profile.name}
        </h1>
        <p className="mt-0.5 text-body text-white/60">{profile.handle}</p>
        {profile.bio && (
          <p className="mt-3 text-body text-white/80">{profile.bio}</p>
        )}
        <p className="mt-4 text-body text-white/60">
          <b className="font-semibold text-white">{profile.diary.length}</b>{" "}
          show{profile.diary.length === 1 ? "" : "s"} logged
        </p>
      </header>

      <div className="px-4">
        <div className="mt-6 flex flex-col gap-3.5">
          {profile.diary.map((entry, index) => {
            const show = getShow(entry.slug);
            if (!show) return null;
            return (
              <div
                key={`${entry.slug}-${index}`}
                className="rounded-card bg-paper p-4"
              >
                <div className="flex items-center gap-3.5">
                  <Poster show={show} className="w-14 shrink-0 rounded-thumb" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-body font-semibold">
                      {show.title}
                    </h2>
                    <p className="mt-0.5 text-caption text-ink-soft">
                      {entryDate.format(new Date(entry.loggedAt))}
                    </p>
                  </div>
                  {entry.sentiment === "recommend" && (
                    <span className="flex shrink-0 items-center gap-1.5 text-caption font-semibold text-gold">
                      <ThumbsUp
                        className="size-4"
                        strokeWidth={2}
                        fill="currentColor"
                      />
                      Recommends
                    </span>
                  )}
                </div>
                {entry.thoughts && (
                  <p className="mt-3 text-body italic text-ink-soft">
                    “{entry.thoughts}”
                  </p>
                )}
                {entry.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg border border-line px-2.5 py-1 text-caption text-ink-soft"
                      >
                        # {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {profile.diary.length === 0 && (
            <p className="py-8 text-center text-body text-ink-faint">
              No public entries in this diary yet.
            </p>
          )}
        </div>

        <p className="mt-10 text-center text-caption text-ink-soft">
          Shared from{" "}
          <Link
            href="/"
            className="font-semibold text-ink underline underline-offset-2"
          >
            Theatr
          </Link>{" "}
          — rendered entirely in your browser, no account anywhere.
        </p>
      </div>
    </main>
  );
}
