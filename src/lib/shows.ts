export type PosterStyle = "brush" | "serif" | "sans" | "condensed";

export type Show = {
  slug: string;
  title: string;
  tier: "Broadway" | "Off-Broadway";
  genre: "Musical" | "Play";
  venue: string;
  /** Typical box-office price, used for "below face" anchoring. */
  faceValue: number;
  poster: {
    bg: string;
    fg: string;
    style: PosterStyle;
    /** Poster-art lettering when it differs from the plain title. */
    displayTitle?: string;
    caption?: string;
    captionColor?: string;
    tilt?: number;
  };
};

const SHOWS: Show[] = [
  {
    slug: "the-outsiders",
    title: "The Outsiders",
    tier: "Broadway",
    genre: "Musical",
    venue: 'Bernard B. Jacobs Theatre',
    faceValue: 89,
    poster: {
      bg: "linear-gradient(180deg, #6e6a62 0%, #55524b 45%, #3e3b35 100%)",
      fg: "#d9b13b",
      style: "brush",
      caption: "A New Musical",
      captionColor: "#c9a53d",
    },
  },
  {
    slug: "heathers",
    title: "Heathers",
    tier: "Off-Broadway",
    genre: "Musical",
    venue: 'New World Stages',
    faceValue: 79,
    poster: {
      bg: "linear-gradient(165deg, #22315c 0%, #131b3a 70%, #0c1229 100%)",
      fg: "#e63a2e",
      style: "brush",
      caption: "The Musical",
      captionColor: "#8fd0e8",
    },
  },
  {
    slug: "the-lost-boys",
    title: "The Lost Boys",
    tier: "Broadway",
    genre: "Musical",
    venue: 'Palace Theatre',
    faceValue: 99,
    poster: {
      bg: "radial-gradient(120% 100% at 50% 20%, #4a1104 0%, #230703 55%, #0e0302 100%)",
      fg: "#ff8232",
      style: "serif",
      caption: "A New Musical",
      captionColor: "#b0501f",
    },
  },
  {
    slug: "oh-mary",
    title: "Oh, Mary!",
    tier: "Broadway",
    genre: "Play",
    venue: 'Lyceum Theatre',
    faceValue: 99,
    poster: {
      bg: "#f3c50f",
      fg: "#191512",
      style: "serif",
      displayTitle: "“OH, MARY!”",
      caption: "A New Play by Cole Escola",
      captionColor: "#191512",
    },
  },
  {
    slug: "the-book-of-mormon",
    title: "The Book of Mormon",
    tier: "Broadway",
    genre: "Musical",
    venue: 'Eugene O\'Neill Theatre',
    faceValue: 119,
    poster: {
      bg: "linear-gradient(180deg, #f7f5f0 0%, #e8e4da 100%)",
      fg: "#17130f",
      style: "sans",
      caption: "The Musical",
      captionColor: "#8a8380",
    },
  },
  {
    slug: "operation-mincemeat",
    title: "Operation Mincemeat",
    tier: "Broadway",
    genre: "Musical",
    venue: 'John Golden Theatre',
    faceValue: 94,
    poster: {
      bg: "#f0c419",
      fg: "#17130f",
      style: "condensed",
      caption: "A New Musical",
      captionColor: "#17130f",
    },
  },
  {
    slug: "mexodus",
    title: "Mexodus",
    tier: "Off-Broadway",
    genre: "Musical",
    venue: 'Minetta Lane Theatre',
    faceValue: 69,
    poster: {
      bg: "linear-gradient(135deg, #d94f2b 0%, #a63258 55%, #6e2a7d 100%)",
      fg: "#f5d13c",
      style: "brush",
      tilt: -4,
    },
  },
  {
    slug: "chess",
    title: "Chess",
    tier: "Broadway",
    genre: "Musical",
    venue: 'Imperial Theatre',
    faceValue: 129,
    poster: {
      bg: "linear-gradient(180deg, #1a1a1f 0%, #0b0b0e 100%)",
      fg: "#e754c4",
      style: "condensed",
      caption: "The Musical",
      captionColor: "#9aa0b5",
    },
  },
  {
    slug: "two-strangers",
    title: "Two Strangers (Carry a Cake Across New York)",
    tier: "Broadway",
    genre: "Musical",
    venue: 'Longacre Theatre',
    faceValue: 89,
    poster: {
      bg: "linear-gradient(180deg, #ffffff 0%, #eef1f7 100%)",
      fg: "#27356e",
      style: "sans",
      caption: "A New Musical Comedy",
      captionColor: "#8a8fa8",
    },
  },
  {
    slug: "maybe-happy-ending",
    title: "Maybe Happy Ending",
    tier: "Broadway",
    genre: "Musical",
    venue: 'Belasco Theatre',
    faceValue: 119,
    poster: {
      bg: "linear-gradient(180deg, #452a78 0%, #241448 60%, #150c2e 100%)",
      fg: "#ffd9a0",
      style: "condensed",
      caption: "Best of the Year",
      captionColor: "#7ee0e8",
    },
  },
  {
    slug: "ragtime",
    title: "Ragtime",
    tier: "Broadway",
    genre: "Musical",
    venue: 'Vivian Beaumont Theater',
    faceValue: 109,
    poster: {
      bg: "#c8102e",
      fg: "#ffffff",
      style: "condensed",
      caption: "The Musical",
      captionColor: "#f3c3cb",
    },
  },
  {
    slug: "the-reservoir",
    title: "The Reservoir",
    tier: "Off-Broadway",
    genre: "Play",
    venue: 'Atlantic Theater Company',
    faceValue: 69,
    poster: {
      bg: "linear-gradient(180deg, #ece8de 0%, #ddd7c8 100%)",
      fg: "#e04e1f",
      style: "condensed",
      tilt: -8,
    },
  },
  {
    slug: "death-of-a-salesman",
    title: "Death of a Salesman",
    tier: "Broadway",
    genre: "Play",
    venue: 'Hudson Theatre',
    faceValue: 139,
    poster: {
      bg: "#efe9dc",
      fg: "#b3261e",
      style: "serif",
      caption: "By Arthur Miller",
      captionColor: "#5c564e",
    },
  },
  {
    slug: "the-fear-of-13",
    title: "The Fear of 13",
    tier: "Off-Broadway",
    genre: "Play",
    venue: 'James Earl Jones Theatre',
    faceValue: 99,
    poster: {
      bg: "linear-gradient(180deg, #4a4a4e 0%, #232326 100%)",
      fg: "#f2f0ec",
      style: "serif",
      caption: "A New Play",
      captionColor: "#9d9a96",
    },
  },
  {
    slug: "mother-russia",
    title: "Mother Russia",
    tier: "Off-Broadway",
    genre: "Play",
    venue: 'Signature Theatre',
    faceValue: 59,
    poster: {
      bg: "linear-gradient(160deg, #d6b02f 0%, #b7922a 100%)",
      fg: "#ffffff",
      style: "sans",
      caption: "By Lauren Yee",
      captionColor: "#6e5a17",
    },
  },
];

export function allShows(): Show[] {
  return SHOWS;
}

export function getShow(slug: string): Show | undefined {
  return SHOWS.find((s) => s.slug === slug);
}

/** Non-null lookup for internal mock data that references known slugs. */
export function show(slug: string): Show {
  const found = getShow(slug);
  if (!found) throw new Error(`Unknown show slug: ${slug}`);
  return found;
}
