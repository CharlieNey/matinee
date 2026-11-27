"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CollectionEditorSheet } from "@/components/CollectionEditorSheet";
import { RankSheet } from "@/components/RankSheet";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { TEXT_LIMITS } from "@/lib/persistence";
import { useApp } from "@/lib/store";
import { allShows } from "@/lib/shows";
import { ActivityTab } from "./_components/ActivityTab";
import { CollectionSheet, CollectionTab } from "./_components/CollectionTab";
import {
  DiarySettingsSheets,
  SettingsSheet,
} from "./_components/DiarySettingsSheets";
import { ProfileHeader } from "./_components/ProfileHeader";
import { RecordTab } from "./_components/RecordTab";

const PROFILE_TABS = [
  ["activity", "Activity"],
  ["record", "Record"],
  ["collection", "Collection"],
] as const;
type Tab = (typeof PROFILE_TABS)[number][0];
type SheetName = "edit" | CollectionSheet | SettingsSheet | null;

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("activity");
  const [sheet, setSheet] = useState<SheetName>(null);
  const {
    profile,
    updateProfile,
    savedShows,
    attended,
    toggleSaved,
    addAttended,
    removeAttended,
    persistenceError,
  } = useApp();
  const toast = useToast();

  const [draftName, setDraftName] = useState(profile.name);
  const [draftBio, setDraftBio] = useState(profile.bio ?? "");

  const openEdit = () => {
    setDraftName(profile.name);
    setDraftBio(profile.bio ?? "");
    setSheet("edit");
  };

  const saveProfile = () => {
    updateProfile({
      name: draftName.trim(),
      bio: draftBio.trim() || null,
    });
    setSheet(null);
    toast({ message: "Profile updated" });
  };

  // Search pools for the Collection editors: the catalog minus what's already
  // in each list.
  const savedSlugs = new Set(savedShows.map((s) => s.slug));
  const attendedSlugs = new Set(attended.map((s) => s.slug));
  const interestedCandidates = allShows().filter((s) => !savedSlugs.has(s.slug));
  const attendedCandidates = allShows().filter((s) => !attendedSlugs.has(s.slug));

  return (
    <main className="web:mx-auto web:grid web:max-w-[1160px] web:grid-cols-[minmax(0,380px)_minmax(0,1fr)] web:items-start web:gap-8 web:px-6 web:pt-8">
      <ProfileHeader
        onEdit={openEdit}
        onSettings={() => setSheet("settings")}
        onAttended={() => setSheet("attended")}
        onRecord={() => setTab("record")}
      />

      {/* Light = commerce: sheet slides over the espresso header. The 1px
          gold top edge is the box-seat rail — the one gilt line in the app,
          where velvet meets ivory (DESIGN.md §13). Web mode: no overlap, no
          rail — it's the right column beside the card. */}
      <div className="relative -mt-6 min-w-0 rounded-t-sheet border-t border-gold bg-cream web:mt-0 web:rounded-none web:border-t-0">
        {persistenceError && (
          <div role="alert" className="mx-4 mt-5 rounded-card bg-blush p-4">
            <p className="text-body font-semibold">Changes aren’t being saved</p>
            <p className="mt-1 text-caption text-ink-soft">
              This browser’s storage is unavailable or full. Keep this tab open
              and export your diary from Settings before leaving.
            </p>
          </div>
        )}
        <div className="border-b border-line px-4">
          <div
            className="flex gap-8"
            role="tablist"
            aria-label="Profile sections"
          >
            {PROFILE_TABS.map(([key, label], index) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`profile-tab-${key}`}
                aria-controls={`profile-panel-${key}`}
                aria-selected={tab === key}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
                onKeyDown={(event) => {
                  if (
                    event.key !== "ArrowLeft" &&
                    event.key !== "ArrowRight" &&
                    event.key !== "Home" &&
                    event.key !== "End"
                  )
                    return;
                  event.preventDefault();
                  const nextIndex =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? PROFILE_TABS.length - 1
                        : (index +
                            (event.key === "ArrowRight" ? 1 : -1) +
                            PROFILE_TABS.length) %
                          PROFILE_TABS.length;
                  const next = PROFILE_TABS[nextIndex][0];
                  setTab(next);
                  requestAnimationFrame(() =>
                    document.getElementById(`profile-tab-${next}`)?.focus(),
                  );
                }}
                className={`relative pb-3 pt-5 text-body font-semibold transition-colors duration-200 ${
                  tab === key ? "text-ink" : "text-ink-soft"
                }`}
              >
                {label}
                {tab === key && (
                  <motion.span
                    layoutId="profile-tab-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-ink"
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-clip px-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              role="tabpanel"
              id={`profile-panel-${tab}`}
              aria-labelledby={`profile-tab-${tab}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {tab === "activity" && <ActivityTab />}
              {tab === "record" && <RecordTab />}
              {tab === "collection" && <CollectionTab openSheet={setSheet} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Edit profile */}
      <Sheet
        open={sheet === "edit"}
        onClose={() => setSheet(null)}
        title="Edit profile"
      >
        <label htmlFor="profile-name" className="mb-2 mt-6 block text-caption font-medium text-ink-soft">
          Name
        </label>
        <input
          id="profile-name"
          value={draftName}
          maxLength={TEXT_LIMITS.name}
          onChange={(e) => setDraftName(e.target.value)}
          className="h-12 w-full rounded-2xl bg-paper px-4 text-body text-ink outline-none transition-shadow focus:ring-2 focus:ring-espresso/15"
        />
        <label htmlFor="profile-bio" className="mb-2 mt-5 block text-caption font-medium text-ink-soft">
          About you
        </label>
        <textarea
          id="profile-bio"
          value={draftBio}
          maxLength={TEXT_LIMITS.bio}
          onChange={(e) => setDraftBio(e.target.value)}
          placeholder="Add a few words about yourself"
          rows={3}
          className="w-full resize-none rounded-2xl bg-paper px-4 py-3 text-body text-ink outline-none transition-shadow placeholder:text-ink-faint focus:ring-2 focus:ring-espresso/15"
        />
        <button
          type="button"
          onClick={saveProfile}
          className="mt-7 flex h-14 w-full items-center justify-center rounded-full bg-vermilion text-body font-semibold text-white transition-[background-color,transform] duration-150 active:scale-[0.98] active:bg-vermilion-pressed"
        >
          Save changes
        </button>
      </Sheet>

      <DiarySettingsSheets sheet={sheet} setSheet={setSheet} />

      {/* Collection drill-ins — search-and-add editors */}
      <CollectionEditorSheet
        open={sheet === "interested"}
        onClose={() => setSheet(null)}
        title="Interested"
        members={savedShows}
        candidates={interestedCandidates}
        onAdd={(show) => toggleSaved(show.slug)}
        onRemove={(show) => toggleSaved(show.slug)}
        searchPlaceholder="Search shows to add"
        emptyText="Search a show to add it, or tap Interested anywhere in the app."
      />
      <CollectionEditorSheet
        open={sheet === "attended"}
        onClose={() => setSheet(null)}
        title="Attended"
        members={attended}
        candidates={attendedCandidates}
        onAdd={(show) => addAttended(show.slug)}
        onRemove={(show) => removeAttended(show.slug)}
        searchPlaceholder="Search shows you've seen"
        emptyText="Search a show you've seen to add it here."
      />
      <RankSheet open={sheet === "rank"} onClose={() => setSheet(null)} />
    </main>
  );
}
