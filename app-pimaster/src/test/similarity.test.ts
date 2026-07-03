import { describe, expect, it } from "vitest";
import { compareToPeers, evaluateCohort, findingsSet, ngramJaccard, setJaccard, TEXT_SIMILARITY_LIMIT, type CohortPeer } from "../lib/similarity";
import { emptySpineExam } from "../lib/rom";

describe("ngramJaccard", () => {
  it("is 1.0 for identical text and 0 for disjoint text", () => {
    const a = "patient presents following a motor vehicle accident with neck pain and low back pain";
    expect(ngramJaccard(a, a)).toBe(1);
    expect(ngramJaccard(a, "completely different words about an unrelated subject entirely here today now")).toBe(0);
  });

  it("flags near-clones above the 20% limit but not genuinely distinct narratives", () => {
    const a =
      "Patient presents following a motor vehicle accident that occurred on 2026-06-01, in which the patient was the driver. The patient was wearing a seatbelt; airbags deployed; the vehicle was not drivable.";
    const clone = a.replace("driver", "passenger");
    const distinct =
      "Patient is a pedestrian struck at low speed on 2026-06-01 while crossing the street. He reports immediate onset of left knee pain and was evaluated at the emergency room the same day before presenting today.";
    expect(ngramJaccard(a, clone)).toBeGreaterThan(TEXT_SIMILARITY_LIMIT);
    expect(ngramJaccard(a, distinct)).toBeLessThanOrEqual(TEXT_SIMILARITY_LIMIT);
  });
});

describe("findings comparison", () => {
  it("detects carbon-copy exams and distinguishes different exams", () => {
    const base = { romExam: { "cervical-flex": "limited", "lumbar-flex": "cannot" }, spineExam: emptySpineExam(), jointTenderness: {} } as const;
    const same = findingsSet({ ...base, romExam: { ...base.romExam } });
    const different = findingsSet({
      romExam: { "shoulder-raiseR": "limited" },
      spineExam: emptySpineExam(),
      jointTenderness: { knee: { R: "yes", L: "" } },
    });
    expect(setJaccard(findingsSet(base), same)).toBe(1);
    expect(setJaccard(findingsSet(base), different)).toBe(0);
  });
});

describe("compareToPeers", () => {
  it("returns one similarity hit per peer", () => {
    const hits = compareToPeers("some narrative text about the patient history and findings today", new Set(["a:1"]), [
      { patientLabel: "Peer One", narrative: "some narrative text about the patient history and findings today", findings: new Set(["a:1"]) },
      { patientLabel: "Peer Two", narrative: "entirely unrelated content", findings: new Set(["b:2"]) },
    ]);
    expect(hits).toHaveLength(2);
    expect(hits[0].textSimilarity).toBe(1);
    expect(hits[1].findingsSimilarity).toBe(0);
  });
});

describe("multi-occupant cohort rules (3+ in one accident)", () => {
  const peer = (patient: string, role: string, findings = 0): CohortPeer => ({
    patient,
    role,
    maxTextSimilarity: 0,
    maxFindingsSimilarity: findings,
  });

  it("announces the cohort so the physician knows every occupant was checked", () => {
    const { warnings, blockers } = evaluateCohort("Driver", [peer("A. B.", "Front Passenger"), peer("C. D.", "Rear Passenger")]);
    expect(warnings.some((w) => w.includes("2 other patient(s)"))).toBe(true);
    expect(blockers).toEqual([]);
  });

  it("warns when two same-accident patients are both documented as Driver", () => {
    const { warnings } = evaluateCohort("Driver", [peer("A. B.", "Driver")]);
    expect(warnings.some((w) => w.includes("also documented as Driver"))).toBe(true);
  });

  it("does not raise the driver warning for distinct seat positions", () => {
    const { warnings } = evaluateCohort("Driver", [peer("A. B.", "Front Passenger"), peer("C. D.", "Rear Passenger")]);
    expect(warnings.some((w) => w.includes("also documented as Driver"))).toBe(false);
  });

  it("escalates to a BLOCK when the exam matches 2+ other occupants (cohort carbon copy)", () => {
    const { blockers } = evaluateCohort("Driver", [peer("A. B.", "Front Passenger", 0.95), peer("C. D.", "Rear Passenger", 0.95)]);
    expect(blockers.some((b) => b.includes("re-examine") || b.includes("Re-examine") || b.includes("distinguishing findings"))).toBe(true);
  });

  it("one identical exam stays a pairwise warning, not a cohort block", () => {
    const { blockers } = evaluateCohort("Driver", [peer("A. B.", "Front Passenger", 0.95), peer("C. D.", "Rear Passenger", 0.1)]);
    expect(blockers).toEqual([]);
  });
});
