import { allShows, Show } from "./shows";

/**
 * Every Broadway house (all 41), hand-curated like the rest of the project's
 * data: owner and ticketer are stable facts of theater ownership (see
 * RESEARCH.md), positions are hand-placed on the stylized district grid in
 * DistrictMap — street number + an x on a 0–1000 scale, NOT geography.
 * "Now playing" is derived from the show catalog's venue strings so the map
 * and the catalog can never disagree.
 */

export type Ticketer = "telecharge" | "broadway-direct" | "atg" | "own";

export type Theater = {
  /** Exact venue string used in the show catalog where a show is running. */
  name: string;
  owner: string;
  ticketer: Ticketer;
  address: string;
  /** Cross street (W 41st–54th). The Beaumont (W 65th) renders as an inset. */
  street: number;
  /** Horizontal position on the stylized grid, 0–1000 west→east. */
  x: number;
  inset?: boolean;
};

export const TICKETER_LABELS: Record<Ticketer, string> = {
  telecharge: "Telecharge",
  "broadway-direct": "Broadway Direct",
  atg: "ATG Tickets",
  own: "Own box office",
};

const LAST_VERIFIED = "2026-07-15";

function t(
  name: string,
  owner: string,
  ticketer: Ticketer,
  address: string,
  street: number,
  x: number,
  inset = false,
): Theater {
  return { name, owner, ticketer, address, street, x, inset };
}

const SHUBERT = "Shubert Organization";
const NEDERLANDER = "Nederlander Organization";
const ATG = "ATG Entertainment";
const ROUNDABOUT = "Roundabout Theatre Company";

const THEATERS: readonly Theater[] = [
  /* Shubert (17) — sell through Telecharge, which Shubert owns */
  t("Ambassador Theatre", SHUBERT, "telecharge", "219 W 49th St", 49, 310),
  t("Ethel Barrymore Theatre", SHUBERT, "telecharge", "243 W 47th St", 47, 290),
  t("Belasco Theatre", SHUBERT, "telecharge", "111 W 44th St", 44, 790),
  t("Bernard B. Jacobs Theatre", SHUBERT, "telecharge", "242 W 45th St", 45, 290),
  t("Booth Theatre", SHUBERT, "telecharge", "222 W 45th St", 45, 470),
  t("Broadhurst Theatre", SHUBERT, "telecharge", "235 W 44th St", 44, 360),
  t("Broadway Theatre", SHUBERT, "telecharge", "1681 Broadway", 53, 372),
  t("Gerald Schoenfeld Theatre", SHUBERT, "telecharge", "236 W 45th St", 45, 410),
  t("James Earl Jones Theatre", SHUBERT, "telecharge", "138 W 48th St", 48, 720),
  t("John Golden Theatre", SHUBERT, "telecharge", "252 W 45th St", 45, 170),
  t("Imperial Theatre", SHUBERT, "telecharge", "249 W 45th St", 45, 230),
  t("Longacre Theatre", SHUBERT, "telecharge", "220 W 48th St", 48, 330),
  t("Lyceum Theatre", SHUBERT, "telecharge", "149 W 45th St", 45, 700),
  t("Majestic Theatre", SHUBERT, "telecharge", "245 W 44th St", 44, 240),
  t("Music Box Theatre", SHUBERT, "telecharge", "239 W 45th St", 45, 350),
  t("Shubert Theatre", SHUBERT, "telecharge", "225 W 44th St", 44, 430),
  t("Winter Garden Theatre", SHUBERT, "telecharge", "1634 Broadway", 50, 437),

  /* Nederlander (9) + Disney (1) — sell through Broadway Direct / Ticketmaster */
  t("Gershwin Theatre", NEDERLANDER, "broadway-direct", "222 W 51st St", 51, 260),
  t("Lena Horne Theatre", NEDERLANDER, "broadway-direct", "256 W 47th St", 47, 220),
  t("Lunt-Fontanne Theatre", NEDERLANDER, "broadway-direct", "205 W 46th St", 46, 320),
  t("Marquis Theatre", NEDERLANDER, "broadway-direct", "210 W 46th St", 46, 522),
  t("Minskoff Theatre", NEDERLANDER, "broadway-direct", "200 W 45th St", 45, 544),
  t("Nederlander Theatre", NEDERLANDER, "broadway-direct", "208 W 41st St", 41, 300),
  t("Neil Simon Theatre", NEDERLANDER, "broadway-direct", "250 W 52nd St", 52, 220),
  t("Palace Theatre", NEDERLANDER, "broadway-direct", "1564 Broadway", 47, 501),
  t("Richard Rodgers Theatre", NEDERLANDER, "broadway-direct", "226 W 46th St", 46, 230),
  t("New Amsterdam Theatre", "Disney Theatrical", "broadway-direct", "214 W 42nd St", 42, 340),

  /* ATG Entertainment (7) — sell through ATG Tickets (left SeatGeek post-merger) */
  t("Al Hirschfeld Theatre", ATG, "atg", "302 W 45th St", 45, 90),
  t("August Wilson Theatre", ATG, "atg", "245 W 52nd St", 52, 290),
  t("Eugene O'Neill Theatre", ATG, "atg", "230 W 49th St", 49, 240),
  t("Hudson Theatre", ATG, "atg", "141 W 44th St", 44, 680),
  t("Lyric Theatre", ATG, "atg", "214 W 43rd St", 43, 330),
  t("St. James Theatre", ATG, "atg", "246 W 44th St", 44, 180),
  t("Walter Kerr Theatre", ATG, "atg", "219 W 48th St", 48, 390),

  /* Nonprofits & independents (7) — own box offices (CitS sells via Telecharge) */
  t("Circle in the Square Theatre", "Independent", "telecharge", "235 W 50th St", 50, 250),
  t("Vivian Beaumont Theater", "Lincoln Center Theater", "own", "150 W 65th St", 65, 0, true),
  t("Todd Haimes Theatre", ROUNDABOUT, "own", "227 W 42nd St", 42, 260),
  t("Stephen Sondheim Theatre", ROUNDABOUT, "own", "124 W 43rd St", 43, 700),
  t("Studio 54", ROUNDABOUT, "own", "254 W 54th St", 54, 200),
  t("Samuel J. Friedman Theatre", "Manhattan Theatre Club", "own", "261 W 47th St", 47, 150),
  t("Hayes Theater", "Second Stage Theater", "own", "240 W 44th St", 44, 300),
];

const showByVenue = new Map<string, Show>(
  allShows()
    .filter((show) => show.currentlyRunning !== false)
    .map((show) => [show.venue, show]),
);

export function allTheaters(): readonly Theater[] {
  return THEATERS;
}

/** The production currently at this house, or undefined if it's dark. */
export function currentShowAt(theater: Theater): Show | undefined {
  return showByVenue.get(theater.name);
}

export function theatersLastVerified(): string {
  return LAST_VERIFIED;
}
