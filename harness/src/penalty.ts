export interface PenaltyRecord {
  kind: string;
  details: any;
}

// Simple in-memory store for recorded penalties. Tests can import this module and inspect `penalties`.
export const penalties: PenaltyRecord[] = [];

export const penalty = {
  record(kind: string, details: any) {
    penalties.push({ kind, details });
  },
  /** Reset the stored penalties (useful for test isolation). */
  reset() {
    penalties.length = 0;
  },
};
