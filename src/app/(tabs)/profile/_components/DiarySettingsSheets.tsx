"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BellPlus, Download, EyeOff, Trash2, Upload } from "lucide-react";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import {
  BACKUP_FORMAT,
  parseDiaryBackup,
  PERSISTENCE_VERSION,
} from "@/lib/persistence";
import { getShow } from "@/lib/shows";
import { DiaryEntry, useApp } from "@/lib/store";

/** The sheets the settings flow moves between; the page owns which is open. */
export type SettingsSheet = "settings" | "import-diary" | "reset-diary";

/**
 * Settings, plus the diary backup flows it leads to: export, import (with a
 * merge-or-replace confirmation) and clear.
 */
export function DiarySettingsSheets({
  sheet,
  setSheet,
}: {
  sheet: string | null;
  setSheet: (sheet: SettingsSheet | null) => void;
}) {
  const { profile, diary, clearDiary, restoreDiaryBackup } = useApp();
  const toast = useToast();
  const [pendingImport, setPendingImport] = useState<{
    entries: DiaryEntry[];
    skipped: number;
  } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const exportDiary = () => {
    const payload = {
      format: BACKUP_FORMAT,
      version: PERSISTENCE_VERSION,
      exportedAt: new Date().toISOString(),
      profile,
      diary: diary.map(({ show, ...entry }) => ({
        ...entry,
        show: {
          slug: show.slug,
          title: show.title,
          venue: show.venue,
        },
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `matinee-diary-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast({ message: "Diary exported" });
  };

  const chooseDiaryBackup = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 25_000_000) {
      toast({ message: "That backup is too large to import" });
      return;
    }
    try {
      const parsed = parseDiaryBackup(JSON.parse(await file.text()));
      let unknownShows = 0;
      const entries = parsed.entries.flatMap((entry): DiaryEntry[] => {
        const show = getShow(entry.slug);
        if (!show) {
          unknownShows += 1;
          return [];
        }
        return [{ ...entry, show }];
      });
      if (entries.length === 0) {
        toast({ message: "No compatible diary entries were found" });
        return;
      }
      setPendingImport({ entries, skipped: parsed.skipped + unknownShows });
      setSheet("import-diary");
    } catch (error) {
      toast({
        message:
          error instanceof Error ? error.message : "That backup couldn’t be read",
      });
    }
  };

  const importDiary = (mode: "merge" | "replace") => {
    if (!pendingImport) return;
    restoreDiaryBackup(pendingImport.entries, mode);
    const count = pendingImport.entries.length;
    const skipped = pendingImport.skipped;
    setPendingImport(null);
    setSheet(null);
    toast({
      message: `${count} ${count === 1 ? "entry" : "entries"} restored${
        skipped > 0 ? ` · ${skipped} skipped` : ""
      }`,
    });
  };

  return (
    <>
      {/* Settings */}
      <Sheet
        open={sheet === "settings"}
        onClose={() => setSheet(null)}
        title="Settings"
      >
        <div className="mt-5 overflow-hidden rounded-card bg-paper px-4">
          <Link
            href="/notify"
            onClick={() => setSheet(null)}
            className="flex items-center gap-3 border-b border-line py-4 transition-opacity active:opacity-70"
          >
            <BellPlus className="size-5 shrink-0" strokeWidth={1.8} />
            <span className="min-w-0">
              <span className="block text-body font-semibold">
                Deadline notifications
              </span>
              <span className="mt-0.5 block text-caption text-ink-soft">
                Manage alerts for shows you follow
              </span>
            </span>
          </Link>
          <div className="flex items-start gap-3 py-4">
            <EyeOff className="mt-0.5 size-5 shrink-0" strokeWidth={1.8} />
            <div className="min-w-0">
              <p className="text-body font-semibold">Stored on this device</p>
              <p className="mt-0.5 text-caption text-ink-soft">
                Your diary stays in this browser. A profile is visible only
                through a link you choose to share.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={exportDiary}
            className="flex w-full items-center gap-3 border-t border-line py-4 text-left transition-opacity active:opacity-70"
          >
            <Download className="size-5 shrink-0" strokeWidth={1.8} />
            <span className="min-w-0">
              <span className="block text-body font-semibold">Export diary</span>
              <span className="mt-0.5 block text-caption text-ink-soft">
                Download every entry and photo as a JSON backup
              </span>
            </span>
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={chooseDiaryBackup}
            className="sr-only"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="flex w-full items-center gap-3 border-t border-line py-4 text-left transition-opacity active:opacity-70"
          >
            <Upload className="size-5 shrink-0" strokeWidth={1.8} />
            <span className="min-w-0">
              <span className="block text-body font-semibold">Import diary</span>
              <span className="mt-0.5 block text-caption text-ink-soft">
                Restore a Matinee JSON backup
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled={diary.length === 0}
            onClick={() => setSheet("reset-diary")}
            className="flex w-full items-center gap-3 border-t border-line py-4 text-left text-vermilion transition-opacity active:opacity-70 disabled:text-ink-faint"
          >
            <Trash2 className="size-5 shrink-0" strokeWidth={1.8} />
            <span className="text-body font-semibold">Clear diary</span>
          </button>
        </div>
      </Sheet>

      <Sheet
        open={sheet === "import-diary"}
        onClose={() => {
          setPendingImport(null);
          setSheet(null);
        }}
        title="Restore diary backup?"
      >
        <p className="mt-4 text-body text-ink-soft">
          Found {pendingImport?.entries.length ?? 0} compatible entr
          {pendingImport?.entries.length === 1 ? "y" : "ies"}.
          {pendingImport && pendingImport.skipped > 0
            ? ` ${pendingImport.skipped} invalid or unknown entries will be skipped.`
            : ""}
        </p>
        <p className="mt-3 text-caption text-ink-soft">
          Merge keeps your current diary and updates entries with matching IDs.
          Replace removes the current diary first. Your profile and collections
          are not changed.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => importDiary("merge")}
            className="h-12 rounded-full bg-paper text-body font-semibold text-ink"
          >
            Merge
          </button>
          <button
            type="button"
            onClick={() => importDiary("replace")}
            className="h-12 rounded-full bg-vermilion text-body font-semibold text-white"
          >
            Replace
          </button>
        </div>
      </Sheet>

      <Sheet
        open={sheet === "reset-diary"}
        onClose={() => setSheet(null)}
        title="Clear your diary?"
      >
        <p className="mt-4 text-body text-ink-soft">
          This removes all {diary.length} diary entr{diary.length === 1 ? "y" : "ies"}
          {" "}and their photos from this browser. Export first if you want a backup.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSheet(null)}
            className="h-12 rounded-full bg-paper text-body font-semibold text-ink"
          >
            Keep diary
          </button>
          <button
            type="button"
            onClick={() => {
              clearDiary();
              setSheet(null);
              toast({ message: "Diary cleared" });
            }}
            className="h-12 rounded-full bg-vermilion text-body font-semibold text-white"
          >
            Clear diary
          </button>
        </div>
      </Sheet>
    </>
  );
}
