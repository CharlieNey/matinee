import { allShows, Show } from "./shows";

/**
 * Every Broadway house (all 41), hand-curated like the rest of the project's
 * data: owner and ticketer are stable facts of theater ownership (see
 * RESEARCH.md), positions are hand-placed on the stylized district grid in
 * DistrictMap — street number + an x on a 0–1000 scale, NOT geography.
 * (An OSM-traced version was built and shelved 2026-07-16 — see PLAN.md
 * Phase 6 refinement; regeneration scripts in scripts/trace-district/.)
 * ID enrichment (Wikidata QID → IBDB/Playbill venue IDs) is seeded from
 * Wikidata (CC0) and hand-audited — it has documented errors (DATA.md): the
 * Gershwin capacity (listed 15,408; actually ~1,933) is corrected here.
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
  /** Seats — approximate; configurations vary and sources disagree. */
  capacity: number;
  /** Wikidata QID — the CC0 join key that carries the IBDB/Playbill IDs. */
  wikidataId: string;
  /** IBDB venue ID (P1217) → ibdb.com/theatre/{id}. Deep link, no scraping. */
  ibdbId: string;
  /** Playbill venue slug (P6113) → playbill.com/venue/{slug}. */
  playbillId?: string;
  inset?: boolean;
  /** Schema insurance for a future second market (PLAN.md Phase 12);
   *  absence means "nyc". */
  market?: "nyc";
};

export const TICKETER_LABELS: Record<Ticketer, string> = {
  telecharge: "Telecharge",
  "broadway-direct": "Broadway Direct",
  atg: "ATG Tickets",
  own: "Own box office",
};

const LAST_VERIFIED = "2026-07-16";

function t(
  name: string,
  owner: string,
  ticketer: Ticketer,
  address: string,
  street: number,
  x: number,
  capacity: number,
  wikidataId: string,
  ibdbId: string,
  playbillId?: string,
  inset = false,
): Theater {
  return {
    name,
    owner,
    ticketer,
    address,
    street,
    x,
    capacity,
    wikidataId,
    ibdbId,
    playbillId,
    inset,
  };
}

const SHUBERT = "Shubert Organization";
const NEDERLANDER = "Nederlander Organization";
const ATG = "ATG Entertainment";
const ROUNDABOUT = "Roundabout Theatre Company";

const THEATERS: readonly Theater[] = [
  /* Shubert (17) — sell through Telecharge, which Shubert owns */
  t("Ambassador Theatre", SHUBERT, "telecharge", "219 W 49th St", 49, 310, 1114, "Q4741073", "1036", "ambassador-theatre-vault-0000000033"),
  t("Ethel Barrymore Theatre", SHUBERT, "telecharge", "243 W 47th St", 47, 290, 1058, "Q5403074", "1147", "ethel-barrymore-theatre-vault-0000000135"),
  t("Belasco Theatre", SHUBERT, "telecharge", "111 W 44th St", 44, 790, 1018, "Q815278", "1360"),
  t("Bernard B. Jacobs Theatre", SHUBERT, "telecharge", "242 W 45th St", 45, 290, 1101, "Q4892910", "1346", "bernard-b-jacobs-theatre-vault-0000000323"),
  t("Booth Theatre", SHUBERT, "telecharge", "222 W 45th St", 45, 470, 783, "Q3527434", "1071", "booth-theatre-vault-0000000054"),
  t("Broadhurst Theatre", SHUBERT, "telecharge", "235 W 44th St", 44, 360, 1186, "Q4972203", "1076", "broadhurst-theatre-vault-0000000061"),
  t("Broadway Theatre", SHUBERT, "telecharge", "1681 Broadway", 53, 372, 1761, "Q2925870", "1496", "broadway-theatre-vault-0000000390"),
  t("Gerald Schoenfeld Theatre", SHUBERT, "telecharge", "236 W 45th St", 45, 410, 1080, "Q5549572", "1327", "gerald-schoenfeld-theatre-vault-0000000293"),
  t("James Earl Jones Theatre", SHUBERT, "telecharge", "138 W 48th St", 48, 720, 1084, "Q5173206", "1120", "cort-theatre-vault-0000000102"),
  t("John Golden Theatre", SHUBERT, "telecharge", "252 W 45th St", 45, 170, 804, "Q6235625", "1265", "john-golden-theatre-vault-0000000270"),
  t("Imperial Theatre", SHUBERT, "telecharge", "249 W 45th St", 45, 230, 1417, "Q6006906", "1208"),
  t("Longacre Theatre", SHUBERT, "telecharge", "220 W 48th St", 48, 330, 1091, "Q6673576", "1240", "longacre-theatre-vault-0000000242"),
  t("Lyceum Theatre", SHUBERT, "telecharge", "149 W 45th St", 45, 700, 922, "Q1756846", "1245", "lyceum-theatre-vault-0000000243"),
  t("Majestic Theatre", SHUBERT, "telecharge", "245 W 44th St", 44, 240, 1645, "Q1393081", "1252", "majestic-theatre-vault-0000000261"),
  t("Music Box Theatre", SHUBERT, "telecharge", "239 W 45th St", 45, 350, 1009, "Q1954899", "1283", "music-box-theatre-vault-0000000070"),
  t("Shubert Theatre", SHUBERT, "telecharge", "225 W 44th St", 44, 430, 1460, "Q1797756", "1352", "shubert-theatre-vault-0000000329"),
  t("Winter Garden Theatre", SHUBERT, "telecharge", "1634 Broadway", 50, 437, 1526, "Q3569403", "1391", "winter-garden-theatre-vault-0000000351"),

  /* Nederlander (9) + Disney (1) — sell through Broadway Direct / Ticketmaster */
  t("Gershwin Theatre", NEDERLANDER, "broadway-direct", "222 W 51st St", 51, 260, 1933, "Q1515007", "1369", "george-gershwin-theatre-vault-0000000339"),
  t("Lena Horne Theatre", NEDERLANDER, "broadway-direct", "256 W 47th St", 47, 220, 1094, "Q4974974", "1256", "brooks-atkinson-theatre-vault-0000000263"),
  t("Lunt-Fontanne Theatre", NEDERLANDER, "broadway-direct", "205 W 46th St", 46, 320, 1509, "Q7634840", "1174", "lunt-fontanne-theatre-vault-0000000158"),
  t("Marquis Theatre", NEDERLANDER, "broadway-direct", "210 W 46th St", 46, 522, 1611, "Q6772686", "1259"),
  t("Minskoff Theatre", NEDERLANDER, "broadway-direct", "200 W 45th St", 45, 544, 1710, "Q3062716", "1275", "minskoff-theatre-vault-0000000068"),
  t("Nederlander Theatre", NEDERLANDER, "broadway-direct", "208 W 41st St", 41, 300, 1232, "Q12063656", "1286", "nederlander-theatre-vault-0000000071"),
  t("Neil Simon Theatre", NEDERLANDER, "broadway-direct", "250 W 52nd St", 52, 220, 1467, "Q1974872", "1035", "neil-simon-theatre-vault-0000000031"),
  t("Palace Theatre", NEDERLANDER, "broadway-direct", "1564 Broadway", 47, 501, 1743, "Q3360756", "1317", "palace-theatre-vault-0000000288"),
  t("Richard Rodgers Theatre", NEDERLANDER, "broadway-direct", "226 W 46th St", 46, 230, 1319, "Q7328714", "1098", "richard-rodgers-theatre-vault-0000000085"),
  t("New Amsterdam Theatre", "Disney Theatrical", "broadway-direct", "214 W 42nd St", 42, 340, 1747, "Q2004827", "1294", "new-amsterdam-theatre-vault-0000000276"),

  /* ATG Entertainment (7) — sell through ATG Tickets (left SeatGeek post-merger) */
  t("Al Hirschfeld Theatre", ATG, "atg", "302 W 45th St", 45, 90, 1424, "Q2829346", "1262", "al-hirschfeld-theatre-vault-0000000268"),
  t("August Wilson Theatre", ATG, "atg", "245 W 52nd St", 52, 290, 1222, "Q12053066", "1179", "august-wilson-theatre-vault-0000000162"),
  t("Eugene O'Neill Theatre", ATG, "atg", "230 W 49th St", 49, 240, 1108, "Q5407593", "1158", "eugene-oneill-theatre-vault-0000000141"),
  t("Hudson Theatre", ATG, "atg", "141 W 44th St", 44, 680, 970, "Q10526870", "1206", "hudson-theatre-vault-0000000198"),
  t("Lyric Theatre", ATG, "atg", "214 W 43rd St", 43, 330, 1622, "Q5477291", "1156", "lyric-theatre-vault-0000000590"),
  t("St. James Theatre", ATG, "atg", "246 W 44th St", 44, 180, 1710, "Q3909790", "1145", "st-james-theatre-vault-0000000133"),
  t("Walter Kerr Theatre", ATG, "atg", "219 W 48th St", 48, 390, 945, "Q7965343", "1342", "walter-kerr-theatre-vault-0000000320"),

  /* Nonprofits & independents (7) — own box offices (CitS sells via Telecharge) */
  t("Circle in the Square Theatre", "Independent", "telecharge", "235 W 50th St", 50, 250, 840, "Q2973328", "1106", "circle-in-the-square-theatre-vault-0000000092"),
  t("Vivian Beaumont Theater", "Lincoln Center Theater", "own", "150 W 65th St", 65, 0, 1080, "Q176205", "1589", "vivian-beaumont-theater-vault-0000000344", true),
  t("Todd Haimes Theatre", ROUNDABOUT, "own", "227 W 42nd St", 42, 260, 740, "Q4742962", "1349", "american-airlines-theatre-vault-0000000327"),
  t("Stephen Sondheim Theatre", ROUNDABOUT, "own", "124 W 43rd St", 43, 700, 1055, "Q7610570", "1197", "stephen-sondheim-theatre-vault-0000000184"),
  t("Studio 54", ROUNDABOUT, "own", "254 W 54th St", 54, 200, 1006, "Q607212", "1165", "studio-54-vault-0000000147"),
  t("Samuel J. Friedman Theatre", "Manhattan Theatre Club", "own", "261 W 47th St", 47, 150, 650, "Q5935075", "1069", "samuel-j-friedman-theatre-vault-0000000052"),
  t("Hayes Theater", "Second Stage Theater", "own", "240 W 44th St", 44, 300, 597, "Q5186073", "1238"),
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

/** Production-history deep link — IBDB 403s robots, so we link, never fetch. */
export function ibdbUrl(theater: Theater): string {
  return `https://www.ibdb.com/theatre/${theater.ibdbId}`;
}

export function theatersLastVerified(): string {
  return LAST_VERIFIED;
}
