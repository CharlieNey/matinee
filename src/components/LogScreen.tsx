"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Armchair,
  Calendar,
  Eye,
  EyeOff,
  Plus,
  Star,
  ThumbsUp,
  X,
} from "lucide-react";
import { Poster } from "@/components/Poster";
import { useToast } from "@/components/Toast";
import { useApp } from "@/lib/store";
import { Show } from "@/lib/shows";

type Sentiment = "recommend" | "mixed" | "disliked";

const PRESET_TAGS = ["First Preview", "Preview", "Opening Night"];
const SEAT = "Center ORCH / Row B / Seat 102";

/** Downscale a picked photo (≤900px long edge, JPEG q0.8) to a data URL
 *  small enough to survive localStorage persistence. */
function downscalePhoto(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const MAX_EDGE = 900;
        const scale = Math.min(
          1,
          MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/* Sentiment glyphs — gold thumbs-up with star; gray faces for the rest */
function RecommendGlyph({ active }: { active: boolean }) {
  return (
    <span
      className={`relative flex size-14 items-center justify-center transition-opacity duration-150 ${
        active ? "" : "opacity-45 grayscale"
      }`}
    >
      <ThumbsUp className="size-9 text-gold" fill="currentColor" strokeWidth={0} />
      <Star
        className="absolute right-1 top-0.5 size-4 text-gold"
        fill="currentColor"
        strokeWidth={0}
      />
    </span>
  );
}

function FaceGlyph({
  kind,
  active,
}: {
  kind: "mixed" | "disliked";
  active: boolean;
}) {
  return (
    <span
      className={`flex size-14 items-center justify-center transition-opacity duration-150 ${
        active ? "" : "opacity-70"
      }`}
    >
      <svg viewBox="0 0 48 48" className="size-12" aria-hidden>
        <circle cx="24" cy="24" r="20" fill={active ? "#cfc9c4" : "#dedad6"} />
        {kind === "mixed" ? (
          <g
            stroke="#6f6862"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M15 21h6" />
            <path d="M28 19.5h6" />
            <path d="M18.5 30.5 29 28.5" />
          </g>
        ) : (
          <g
            stroke="#6f6862"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M14.5 17.5 20 23M20 17.5 14.5 23" />
            <path d="M28 17.5 33.5 23M33.5 17.5 28 23" />
            <path d="M17 32.5c2.2-3 4.6-4.5 7-4.5s4.8 1.5 7 4.5" />
          </g>
        )}
      </svg>
    </span>
  );
}

const SENTIMENTS: { key: Sentiment; label: string }[] = [
  { key: "recommend", label: "Recommend it" },
  { key: "mixed", label: "Mixed feelings" },
  { key: "disliked", label: "Didn't like it" },
];

export function LogScreen({ show }: { show: Show }) {
  const router = useRouter();
  const { addDiaryEntry } = useApp();
  const toast = useToast();

  const [dateLabel, setDateLabel] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment>("recommend");
  const [thoughts, setThoughts] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [note, setNote] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      setDateLabel(
        new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      ),
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (addingTag) tagInputRef.current?.focus();
  }, [addingTag]);

  const toggleTag = (tag: string) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const commitTagDraft = () => {
    const tag = tagDraft.trim().replace(/^#\s*/, "");
    if (tag) {
      setCustomTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
      setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    }
    setTagDraft("");
    setAddingTag(false);
  };

  const publish = () => {
    addDiaryEntry({
      show,
      loggedAt: new Date().toISOString(),
      seat: SEAT,
      sentiment,
      thoughts: thoughts.trim() || null,
      tags,
      visibility,
      note: note.trim() || null,
      photo,
    });
    toast({ message: "Published to your diary" });
    router.push("/profile");
  };

  const fieldCard = "rounded-card bg-paper";

  return (
    <main className="px-4 pb-12 web:mx-auto web:max-w-[560px]">
      <header className="flex h-14 items-center justify-between">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="-ml-2 flex size-11 items-center justify-center text-ink"
        >
          <ArrowLeft className="size-6" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={publish}
          className="-mr-1 px-1 text-heading text-vermilion transition-opacity active:opacity-60"
        >
          Publish
        </button>
      </header>

      {/* What you saw */}
      <section className={`${fieldCard} mt-2 divide-y divide-line px-4`}>
        <div className="flex items-center gap-4 py-4">
          <Poster show={show} className="w-11 rounded-lg" />
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-bold tracking-tight">
              {show.title}
            </h1>
            <p className="truncate text-body text-ink-soft">{show.venue}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 py-4">
          <Calendar className="size-6 shrink-0" strokeWidth={1.8} />
          <p className="text-body">{dateLabel || "…"}</p>
        </div>
        <div className="flex items-center gap-4 py-4">
          <Armchair className="size-6 shrink-0" strokeWidth={1.8} />
          <p className="text-body">{SEAT}</p>
        </div>
      </section>

      <h2 className="mt-8 text-title">Share your thoughts</h2>

      <section className={`${fieldCard} mt-4`}>
        {/* Sentiment */}
        <div className="grid grid-cols-3 border-b border-line px-2 py-5">
          {SENTIMENTS.map(({ key, label }) => {
            const active = sentiment === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSentiment(key)}
                aria-pressed={active}
                className="flex flex-col items-center gap-1.5 transition-transform duration-150 active:scale-[0.96]"
              >
                {key === "recommend" ? (
                  <RecommendGlyph active={active} />
                ) : (
                  <FaceGlyph kind={key} active={active} />
                )}
                <span
                  className={`whitespace-nowrap text-[15px] leading-tight ${
                    active ? "font-semibold text-ink" : "text-ink-soft"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-4">
          <textarea
            value={thoughts}
            onChange={(e) => setThoughts(e.target.value)}
            placeholder="Write something..."
            rows={5}
            className="w-full resize-none bg-transparent text-body text-ink outline-none placeholder:text-ink-faint"
          />

          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-2">
            {[...PRESET_TAGS, ...customTags].map((tag) => {
              const selected = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={selected}
                  className={`h-9 rounded-lg border px-3 text-body transition-[background-color,color,border-color,transform] duration-200 active:scale-[0.97] ${
                    selected
                      ? "border-espresso bg-espresso text-white"
                      : "border-line text-ink-faint"
                  }`}
                >
                  # {tag}
                </button>
              );
            })}
          </div>
          {addingTag ? (
            <input
              ref={tagInputRef}
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onBlur={commitTagDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTagDraft();
                if (e.key === "Escape") {
                  setTagDraft("");
                  setAddingTag(false);
                }
              }}
              placeholder="Tag name"
              className="mt-3 h-9 w-40 rounded-lg bg-inset px-3 text-body text-ink outline-none placeholder:text-ink-faint"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAddingTag(true)}
              className="mt-3 block text-body text-ink-faint transition-opacity active:opacity-60"
            >
              + Add Tag
            </button>
          )}

          {/* Photo */}
          <div className="mt-4">
            {photo ? (
              <div className="relative w-[130px]">
                {/* data: URL preview — next/image can't optimize data URLs */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt="Your photo from the show"
                  className="aspect-[3/4] w-full rounded-2xl object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setPhoto(null)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-espresso/60 p-1 text-white transition-transform active:scale-90"
                >
                  <X className="size-4" strokeWidth={2.4} />
                </button>
              </div>
            ) : (
              <label className="flex aspect-[3/4] w-[130px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-line text-ink transition-transform duration-150 active:scale-[0.98]">
                <Plus className="size-6" strokeWidth={2} />
                <span className="px-3 text-center text-body font-semibold leading-snug">
                  Upload Photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void downscalePhoto(file).then((dataUrl) => {
                      if (dataUrl) setPhoto(dataUrl);
                      else toast({ message: "Couldn't read that photo" });
                    });
                  }}
                />
              </label>
            )}
          </div>

          {/* Visibility */}
          <button
            type="button"
            onClick={() =>
              setVisibility((v) => (v === "public" ? "private" : "public"))
            }
            className={`mt-5 flex h-9 items-center gap-1.5 rounded-lg px-3 text-[15px] font-semibold transition-[background-color,color,transform] duration-200 active:scale-[0.97] ${
              visibility === "public"
                ? "bg-sage text-sage-ink"
                : "bg-inset text-ink-soft"
            }`}
          >
            {visibility === "public" ? (
              <Eye className="size-[18px]" strokeWidth={2} />
            ) : (
              <EyeOff className="size-[18px]" strokeWidth={2} />
            )}
            {visibility === "public" ? "Public" : "Private"}
          </button>
        </div>
      </section>

      <h2 className="mt-8 text-title">Private note</h2>
      <section className={`${fieldCard} mt-4 p-4`}>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Something to remember..."
          rows={3}
          className="w-full resize-none bg-transparent text-body text-ink outline-none placeholder:text-ink-faint"
        />
      </section>
      <p className="mt-2 text-caption text-ink-faint">
        Only you can see your private note.
      </p>
    </main>
  );
}
