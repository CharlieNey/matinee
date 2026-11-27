import { describe, expect, it } from "vitest";
import { programsForShow } from "./programs";
import { showAnswer, showSearchTitle } from "./showAnswer";
import { allShows, getShow } from "./shows";

const answerFor = (slug: string) => showAnswer(getShow(slug)!, programsForShow(slug));
const titleFor = (slug: string) => showSearchTitle(getShow(slug)!, programsForShow(slug));

describe("show page answers", () => {
  it("names what a show offers in its title, in the words people search", () => {
    expect(titleFor("wicked")).toBe("Wicked lottery and rush");
    expect(titleFor("six")).toBe("SIX: The Musical lottery and standing room");
    expect(titleFor("hamilton")).toBe("Hamilton lottery");
  });

  it("answers with each checked program's price and where to get it", () => {
    expect(answerFor("wicked")).toBe(
      "Wicked has a $45 rush at the box office and a $55 digital lottery on Broadway Direct. Checked November 27 against the show's own site.",
    );
  });

  it("never states an unverified row as fact, and says how many there are", () => {
    const hadestown = answerFor("hadestown");
    expect(hadestown).toContain("has a $39 standing room at the box office.");
    expect(hadestown).not.toContain("lottery");
    expect(hadestown).toContain("one more is listed below as unverified");
    expect(answerFor("chicago")).toBe(
      "We couldn't fully confirm any of Chicago's programs with its own site. They're listed below, marked unverified.",
    );
  });

  it("gives an announced final performance, and says when a show has closed", () => {
    expect(answerFor("six")).toMatch(/Its final performance is January 3, 2027\.$/);
    const closed = allShows().find((show) => show.closedOn)!;
    expect(showAnswer(closed, [])).toMatch(/ closed on [A-Z][a-z]+ \d{1,2}, \d{4}\./);
    expect(showSearchTitle(closed, [])).toBe(`${closed.title} (closed)`);
  });

  it("uses the article the price is spoken with", () => {
    const harry = answerFor("harry-potter-cursed-child");
    expect(harry).toContain("a $40 Friday Forty digital lottery in the TodayTix app");
  });
});
