import { describe, expect, it } from "vitest";
import {
  allPrograms,
  Program,
  programKey,
  programOccurrencesNear,
} from "../programs";
import { renderAlert, renderTestAlert } from "./copy";
import {
  alertApplies,
  alertsForOccurrence,
  duePushEvents,
  isQuietHour,
  nextOpeningAlert,
  PushEvent,
} from "./events";
import {
  DAY_LOTTERY,
  et,
  GATSBY_RUSH,
  GATSBY_STUDENT,
  MIDNIGHT_LOTTERY,
  minutes,
  OVERNIGHT_LOTTERY,
  RUSH,
  SHORT_MORNING_LOTTERY,
  STANDING_ROOM,
} from "./testPrograms";

const due = (at: Date, programs: Program[]) => duePushEvents(at, programs);
const kinds = (events: PushEvent[]) => events.map((e) => e.kind);

describe("opening alerts", () => {
  it("heads up five minutes before a rush, in clock time", () => {
    expect(due(minutes(et("09:55"), -0.1), [RUSH])).toEqual([]);
    const [alert] = due(et("09:55"), [RUSH]);
    expect(alert.kind).toBe("opening");
    expect(alert.urgency).toBe("high");
    expect(renderAlert([alert], et("09:58"))).toEqual({
      title: "Hadestown rush opens at 10:00 AM",
      body: "$45 at the box office, first come, first served.",
      url: "/shows/hadestown#ways-to-save",
      tag: alert.group,
    });
  });

  it("catches up in the past tense, then goes stale instead of arriving late", () => {
    const [late] = due(et("10:14"), [RUSH]);
    expect(renderAlert([late], et("10:14")).title).toBe(
      "Hadestown rush opened at 10:00 AM",
    );
    expect(renderAlert([late], et("10:14")).body).toBe(
      "$45 at the box office, while they last.",
    );
    expect(due(et("10:15"), [RUSH])).toEqual([]);
    expect(due(et("13:00"), [RUSH])).toEqual([]);
  });

  it("announces a midnight lottery at 8 AM, not at midnight", () => {
    for (const time of ["00:00", "00:05", "03:00", "07:59"]) {
      expect(due(et(time), [MIDNIGHT_LOTTERY])).toEqual([]);
    }
    const [alert] = due(et("08:00"), [MIDNIGHT_LOTTERY]);
    expect(alert.opensAt).toEqual(et("00:00"));
    expect(renderAlert([alert], et("08:00"))).toMatchObject({
      title: "Oh, Mary! lottery is open until 3:00 PM",
      body: "$49 on Telecharge.",
    });
    expect(due(et("09:00"), [MIDNIGHT_LOTTERY])).toEqual([]);
  });

  it("previews the exact alert in the test push, and says when it is due", () => {
    const sample = nextOpeningAlert("oh-mary", et("16:00", "2026-11-19"), [MIDNIGHT_LOTTERY]);
    expect(renderTestAlert(sample, et("16:00", "2026-11-19"))).toMatchObject({
      title: "Test: Oh, Mary! lottery is open until 3:00 PM",
      body: "$49 on Telecharge. Preview of the alert due 8:00 AM Friday.",
      url: "/shows/oh-mary#ways-to-save",
    });
  });

  it("names the day when a window closes on another day", () => {
    const [alert] = due(et("17:02"), [OVERNIGHT_LOTTERY]);
    expect(renderAlert([alert], et("17:02")).title).toBe(
      "The Rocky Horror Show lottery is open until 9:00 AM Saturday",
    );
  });

  it("combines one show's alerts that fall in the same minute", () => {
    const events = due(et("09:56"), [GATSBY_RUSH, GATSBY_STUDENT]);
    expect(events).toHaveLength(2);
    expect(new Set(events.map((e) => e.group)).size).toBe(1);
    expect(renderAlert(events, et("09:56"))).toMatchObject({
      title: "The Great Gatsby rush and student rush open at 10:00 AM",
      body: "$49 and $39 at the box office.",
    });
  });

  it("never alerts on standing room", () => {
    for (const time of ["09:55", "10:00", "19:00"]) {
      expect(due(et(time), [STANDING_ROOM])).toEqual([]);
    }
  });

  it("holds 10 AM local across both DST changes", () => {
    // 2026-03-08 (EDT begins) and 2026-11-01 (EST begins) are Sundays.
    expect(due(et("09:55", "2026-03-08"), [RUSH])[0].opensAt.toISOString()).toBe(
      "2026-03-08T14:00:00.000Z",
    );
    expect(due(et("09:55", "2026-11-01"), [RUSH])[0].opensAt.toISOString()).toBe(
      "2026-11-01T15:00:00.000Z",
    );
    expect(due(et("08:00", "2026-11-01"), [MIDNIGHT_LOTTERY])[0].announceAt.toISOString()).toBe(
      "2026-11-01T13:00:00.000Z",
    );
  });
});

describe("last call and claim watch", () => {
  it("sends a lottery's last call in its final hour, stopping 10 minutes out", () => {
    expect(kinds(due(et("13:59"), [MIDNIGHT_LOTTERY]))).toEqual([]);
    const [lastCall] = due(et("14:00"), [MIDNIGHT_LOTTERY]);
    expect(lastCall.kind).toBe("last-call");
    expect(renderAlert([lastCall], et("14:00"))).toMatchObject({
      title: "Oh, Mary! lottery closes at 3:00 PM",
      body: "Last hour to enter. $49 on Telecharge.",
    });
    expect(due(et("14:50"), [MIDNIGHT_LOTTERY])).toEqual([]);
  });

  it("skips last call when the opening alert was under three hours before", () => {
    const sent = [];
    for (let t = et("08:00"); t < et("09:30"); t = minutes(t, 1)) {
      sent.push(...kinds(due(t, [SHORT_MORNING_LOTTERY])));
    }
    expect(new Set(sent)).toEqual(new Set(["opening"]));
  });

  it("watches for winners for half an hour after close", () => {
    const [claim] = due(et("15:00"), [DAY_LOTTERY]);
    expect(claim.kind).toBe("claim");
    expect(claim.audience.type).toBe("entrants");
    expect(renderAlert([claim], et("15:00"))).toMatchObject({
      title: "Wicked lottery has closed. Watch your email.",
      body: "Winners usually hear shortly after the window closes and have 1 hr to buy.",
    });
    expect(due(et("15:30"), [DAY_LOTTERY])).toEqual([]);
  });

  it("targets followers, skips last call for entrants, sends claims only to entrants", () => {
    const key = programKey(MIDNIGHT_LOTTERY);
    const follower = { slugs: ["oh-mary"], entries: [] };
    const entrant = { slugs: ["oh-mary"], entries: [{ key, day: "2026-11-20" }] };
    const stranger = { slugs: ["wicked"], entries: [] };
    const entrantNotFollowing = { slugs: [], entries: [{ key, day: "2026-11-20" }] };

    const [lastCall] = due(et("14:00"), [MIDNIGHT_LOTTERY]);
    expect(alertApplies(follower, lastCall)).toBe(true);
    expect(alertApplies(entrant, lastCall)).toBe(false);
    expect(alertApplies(stranger, lastCall)).toBe(false);

    const [claim] = due(et("15:05"), [MIDNIGHT_LOTTERY]);
    expect(alertApplies(follower, claim)).toBe(false);
    expect(alertApplies(entrantNotFollowing, claim)).toBe(true);
    // Yesterday's entry doesn't count for today's drawing.
    expect(
      alertApplies({ slugs: [], entries: [{ key, day: "2026-11-19" }] }, claim),
    ).toBe(false);
  });
});

describe("the live catalog", () => {
  it("never makes an alert due in quiet hours", () => {
    for (let at = et("22:00"); at < et("08:00", "2026-11-21"); at = minutes(at, 10)) {
      expect(isQuietHour(at)).toBe(true);
      expect(duePushEvents(at)).toEqual([]);
    }
  });

  it("gives every rush and lottery an opening alert it can actually send, keyed uniquely", () => {
    const midweek = et("12:00", "2026-11-25");
    const alerts = allPrograms().flatMap((program) =>
      programOccurrencesNear(midweek, program).flatMap((occurrence) =>
        alertsForOccurrence(program, occurrence),
      ),
    );
    expect(new Set(alerts.map((a) => a.eventKey)).size).toBe(alerts.length);

    const sendable = (alert: PushEvent) => {
      for (let t = alert.sendFrom; t < alert.sendUntil; t = minutes(t, 1)) {
        if (!isQuietHour(t)) return true;
      }
      return false;
    };
    const openings = alerts.filter((a) => a.kind === "opening");
    expect(openings.filter((a) => !sendable(a))).toEqual([]);
    expect(new Set(openings.map((a) => programKey(a.program)))).toEqual(
      new Set(
        allPrograms()
          .filter((program) => program.kind !== "sro")
          .map(programKey),
      ),
    );
  });

  it("samples the next real alert for the test push", () => {
    const sample = nextOpeningAlert("wicked", et("12:00"));
    expect(sample).not.toBeNull();
    const message = renderTestAlert(sample, et("12:00"));
    expect(message.title).toMatch(/^Test: Wicked /);
    expect(message.body).toMatch(/Preview of the alert due \d/);
    expect(message.url).toBe("/shows/wicked#ways-to-save");
    // Hadestown's only alerting row is unverified: nothing to preview.
    expect(nextOpeningAlert("hadestown", et("12:00"))).toBeNull();
    expect(renderTestAlert(null, et("12:00")).url).toBe("/notify");
  });
});

describe("rows the app can't vouch for", () => {
  /**
   * Every distinct alert due at some step in [from, to). Every send window is
   * at least 10 minutes long, so 5-minute steps land inside each one.
   */
  const sweep = (from: Date, to: Date, programs: Program[], step = 1) => {
    const sent = new Map<string, PushEvent>();
    for (let at = from; at < to; at = minutes(at, step)) {
      for (const alert of due(at, programs)) sent.set(alert.eventKey, alert);
    }
    return [...sent.values()];
  };

  it("never alerts from an unverified row, on any alert kind", () => {
    const rows = [RUSH, DAY_LOTTERY, MIDNIGHT_LOTTERY];
    const control = sweep(et("00:00"), et("23:59"), rows);
    expect(new Set(kinds(control))).toEqual(
      new Set(["opening", "last-call", "claim"]),
    );
    const doubtful = rows.map((row) => ({
      ...row,
      unverified: "Two sources give different prices.",
    }));
    expect(sweep(et("00:00"), et("23:59"), doubtful)).toEqual([]);
  });

  it("stops alerting at the moment a row goes stale, mid-day", () => {
    // Checked Nov 20, so stale from noon New York time on Dec 4.
    const before = sweep(et("08:00", "2026-12-04"), et("12:00", "2026-12-04"), [
      DAY_LOTTERY,
    ]);
    expect(kinds(before)).toEqual(["opening"]);
    const after = sweep(et("12:00", "2026-12-04"), et("23:59", "2026-12-04"), [
      DAY_LOTTERY,
    ]);
    expect(after).toEqual([]);
    expect(sweep(et("08:00", "2026-12-05"), et("22:00", "2026-12-05"), [RUSH])).toEqual([]);
  });

  it("doesn't promise an untrusted alert on the Follow card or the test push", () => {
    expect(nextOpeningAlert("hadestown", et("12:00"), [RUSH])).not.toBeNull();
    expect(
      nextOpeningAlert("hadestown", et("12:00"), [
        { ...RUSH, unverified: "The price is in doubt." },
      ]),
    ).toBeNull();
    // Trusted today, stale by the time the alert would go out.
    expect(nextOpeningAlert("hadestown", et("12:30", "2026-12-04"), [RUSH])).toBeNull();
  });

  it("sends nothing from an untrusted row anywhere in the live catalog", () => {
    // Doubt every other row and age a third, then sweep a full day.
    const programs = allPrograms().map((program, index) =>
      index % 2 === 0
        ? { ...program, unverified: "Test: in doubt." }
        : index % 3 === 0
          ? { ...program, lastVerified: "2026-10-01" }
          : program,
    );
    const day = "2026-12-01";
    const sent = sweep(et("00:00", day), et("23:59", day), programs, 5);
    expect(sent.length).toBeGreaterThan(0);
    for (const alert of sent) {
      expect(alert.program.unverified, alert.eventKey).toBeUndefined();
      expect(alert.program.lastVerified, alert.eventKey).not.toBe("2026-10-01");
    }
  }, 30_000);
});
