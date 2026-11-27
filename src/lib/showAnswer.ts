import { formatCheckedLong } from "./contact";
import {
  Program,
  ProgramKind,
  ProgramPlatform,
  programPlatformLabel,
} from "./programs";
import { closingLabel, finalPerformance, Show } from "./shows";

/**
 * The words a show page answers a search with: "Does Wicked have a lottery?"
 * Built only from the curated rows, so the page, its title and its
 * description can never say more than the rows do.
 */

const KIND_WORDS: Record<ProgramKind, string> = {
  "digital-lottery": "digital lottery",
  "in-person-lottery": "in-person lottery",
  rush: "rush",
  "digital-rush": "digital rush",
  "student-rush": "student rush",
  sro: "standing room",
};

/** Search-style nouns, in the order people ask about them. */
const TITLE_GROUPS: { word: string; kinds: ProgramKind[] }[] = [
  { word: "lottery", kinds: ["digital-lottery", "in-person-lottery"] },
  { word: "rush", kinds: ["rush", "digital-rush", "student-rush"] },
  { word: "standing room", kinds: ["sro"] },
];

function where(platform: ProgramPlatform): string {
  switch (platform) {
    case "box-office":
      return "at the box office";
    case "todaytix":
      return "in the TodayTix app";
    case "official-site":
      return "on the show's site";
    default:
      return `on ${programPlatformLabel(platform)}`;
  }
}

const price = (program: Program) =>
  program.price === 0 ? "free" : `$${program.price}`;

/** "a $45", but "an $18" and "an $80": the article follows how it's said. */
function article(program: Program): string {
  const dollars = String(Math.floor(program.price));
  return program.price > 0 &&
    (dollars.startsWith("8") || dollars === "11" || dollars === "18")
    ? "an"
    : "a";
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** "Wicked lottery and rush", "SIX lottery and standing room". */
export function showSearchTitle(show: Show, programs: readonly Program[]): string {
  if (show.closedOn) return `${show.title} (closed)`;
  const words = TITLE_GROUPS.filter((group) =>
    programs.some((program) => group.kinds.includes(program.kind)),
  ).map((group) => group.word);
  return words.length > 0
    ? `${show.title} ${list(words)}`
    : `${show.title}: rush and lottery`;
}

/** "a $55 digital lottery on Broadway Direct" */
function phrase(program: Program): string {
  const kind = program.name
    ? `${program.name} ${KIND_WORDS[program.kind]}`
    : KIND_WORDS[program.kind];
  return `${article(program)} ${price(program)} ${kind} ${where(program.platform)}`;
}

/**
 * One or two plain sentences for the top of the show's Ways to save, and the
 * page's meta description: what there is, what it costs, where, and how sure
 * we are.
 */
export function showAnswer(show: Show, programs: readonly Program[]): string {
  const closed = closingLabel(show);
  if (closed) {
    return `${show.title} closed on ${closed}. Its rush and lottery listings came down with it.`;
  }
  const final = finalPerformance(show);
  const ending = final ? ` Its final performance is ${final.label}.` : "";
  if (programs.length === 0) {
    return `We couldn't confirm a rush, lottery or standing room for ${show.title}.${ending}`;
  }

  const checked = programs.filter((program) => program.unverified === undefined);
  const doubtful = programs.length - checked.length;
  const has =
    checked.length > 0
      ? `${show.title} has ${list(checked.map(phrase))}.`
      : `We couldn't fully confirm any of ${show.title}'s programs with its own site.`;
  const oldest = programs.map((program) => program.lastVerified).sort()[0];
  const trust =
    doubtful === 0
      ? ` Checked ${formatCheckedLong(oldest)} against the show's own site.`
      : checked.length === 0
        ? ` They're listed below, marked unverified.`
        : ` Checked ${formatCheckedLong(oldest)}; ${doubtful === 1 ? "one more is" : `${doubtful} more are`} listed below as unverified.`;
  return `${has}${trust}${ending}`;
}
