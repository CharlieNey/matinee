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

export async function decodeSharedProfile(
  fragment: string,
): Promise<SharedProfile | null> {
  try {
    const [prefix, data] = [fragment.slice(0, 2), fragment.slice(2)];
    let json: string;
    if (prefix === "z.") {
      const bytes = await pipeThrough(
        base64UrlToBytes(data) as Uint8Array<ArrayBuffer>,
        new DecompressionStream("deflate-raw"),
      );
      json = new TextDecoder().decode(bytes);
    } else if (prefix === "j.") {
      json = new TextDecoder().decode(base64UrlToBytes(data));
    } else {
      return null;
    }
    const parsed = JSON.parse(json) as SharedProfile;
    if (parsed.v !== 1 || !Array.isArray(parsed.diary)) return null;
    return parsed;
  } catch {
    return null;
  }
}
