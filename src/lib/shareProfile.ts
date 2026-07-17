"use client";

/**
 * Share-a-profile with zero backend (Phase 11): the diary serializes into a
 * compressed URL fragment; the recipient's browser renders it entirely
 * client-side at /p#<data>. Photos and private notes never leave the device;
 * private entries share the show but not the words. Fragments are versioned
 * and prefixed so old links keep decoding.
 */

export type SharedDiaryEntry = {
  slug: string;
  loggedAt: string;
  sentiment: "recommend" | "mixed" | "disliked";
  thoughts: string | null;
  tags: string[];
};

export type SharedProfile = {
  v: 1;
  name: string;
  handle: string;
  bio: string | null;
  diary: SharedDiaryEntry[];
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(text: string): Uint8Array {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pipeThrough(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const readable = new Blob([bytes]).stream().pipeThrough(stream);
  const buffer = await new Response(readable).arrayBuffer();
  return new Uint8Array(buffer);
}

function encodeUtf8(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text) as Uint8Array<ArrayBuffer>;
}

/** → "z.<base64url>" (deflate) or "j.<base64url>" where unsupported. */
export async function encodeSharedProfile(
  profile: SharedProfile,
): Promise<string> {
  const json = JSON.stringify(profile);
  if (typeof CompressionStream !== "undefined") {
    const compressed = await pipeThrough(
      encodeUtf8(json),
      new CompressionStream("deflate-raw"),
    );
    return `z.${bytesToBase64Url(compressed)}`;
  }
  return `j.${bytesToBase64Url(encodeUtf8(json))}`;
}

/** Longest fragment we'll decode; real profiles compress to a few KB. */
const MAX_FRAGMENT_CHARS = 60_000;
/** Decompression cap — a link is data, not a zip bomb. */
const MAX_JSON_BYTES = 1_000_000;

function asString(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}

/**
 * The fragment is attacker-controlled input (anyone can craft a /p# link),
 * so every field is re-validated: right types, bounded lengths, known
 * sentiments, parseable dates. Bad entries drop; bad envelopes return null.
 */
function sanitizeProfile(parsed: unknown): SharedProfile | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const raw = parsed as Record<string, unknown>;
  if (raw.v !== 1 || !Array.isArray(raw.diary)) return null;

  const diary = raw.diary.slice(0, 200).flatMap((item): SharedDiaryEntry[] => {
    if (typeof item !== "object" || item === null) return [];
    const entry = item as Record<string, unknown>;
    const slug = asString(entry.slug, 100);
    const loggedAt = asString(entry.loggedAt, 40);
    if (!slug || !loggedAt || Number.isNaN(Date.parse(loggedAt))) return [];
    const sentiment =
      entry.sentiment === "recommend" ||
      entry.sentiment === "mixed" ||
      entry.sentiment === "disliked"
        ? entry.sentiment
        : "mixed";
    const tags = Array.isArray(entry.tags)
      ? entry.tags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.slice(0, 40))
          .slice(0, 12)
      : [];
    return [
      { slug, loggedAt, sentiment, thoughts: asString(entry.thoughts, 2000), tags },
    ];
  });

  return {
    v: 1,
    name: asString(raw.name, 80) ?? "A theatergoer",
    handle: asString(raw.handle, 80) ?? "",
    bio: asString(raw.bio, 400),
    diary,
  };
}

export async function decodeSharedProfile(
  fragment: string,
): Promise<SharedProfile | null> {
  try {
    if (fragment.length > MAX_FRAGMENT_CHARS) return null;
    const [prefix, data] = [fragment.slice(0, 2), fragment.slice(2)];
    let json: string;
    if (prefix === "z.") {
      const bytes = await pipeThrough(
        base64UrlToBytes(data) as Uint8Array<ArrayBuffer>,
        new DecompressionStream("deflate-raw"),
      );
      if (bytes.length > MAX_JSON_BYTES) return null;
      json = new TextDecoder().decode(bytes);
    } else if (prefix === "j.") {
      json = new TextDecoder().decode(base64UrlToBytes(data));
    } else {
      return null;
    }
    return sanitizeProfile(JSON.parse(json));
  } catch {
    return null;
  }
}
