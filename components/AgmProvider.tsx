"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Nominee = { id: string; displayName: string };
export type PositionStatus = "draft" | "ready" | "open" | "closed";
export type Position = {
  id: string;
  title: string;
  nominees: Nominee[];
  status: PositionStatus;
  allowAbstain: boolean;
};

type MeetingState = {
  paused: boolean;
  checkIns: string[];
  eligibleCheckIns: string[];
  participation: string[];
  tallies: Record<string, Record<string, number>>;
  positions: Position[];
  memberImport: {
    totalMembers: number;
    eligibleMembers: number;
    sourceFile: string;
    rule: string;
    importedAt: string | null;
  };
};

type AgmContextValue = {
  state: MeetingState;
  activePosition?: Position;
  checkIn: (memberId: string, eligible: boolean) => void;
  hasVoted: (positionId: string, memberId: string) => boolean;
  castVote: (positionId: string, memberId: string, choiceId: string) => boolean;
  addPosition: (title: string) => void;
  addNominee: (positionId: string, name: string) => void;
  openPosition: (positionId: string) => void;
  closePosition: (positionId: string) => void;
  setPaused: (paused: boolean) => void;
  resetDemo: () => void;
  importMemberCounts: (summary: {
    totalMembers: number;
    eligibleMembers: number;
    sourceFile: string;
    rule: string;
  }) => void;
  clearVotes: () => void;
  clearNominees: () => void;
  clearPositions: () => void;
};

const STORAGE_KEY = "fam-agm-2026-state-v2";

const initialState: MeetingState = {
  paused: false,
  checkIns: [],
  eligibleCheckIns: [],
  participation: [],
  tallies: {},
  memberImport: {
    totalMembers: 281,
    eligibleMembers: 175,
    sourceFile: "Demo defaults - import a workbook to replace",
    rule: "Clayton campus and enrolled status",
    importedAt: null,
  },
  positions: [
    {
      id: "president",
      title: "President",
      status: "ready",
      allowAbstain: true,
      nominees: [
        { id: "president-a", displayName: "Candidate A" },
        { id: "president-b", displayName: "Candidate B" },
        { id: "president-c", displayName: "Candidate C" },
      ],
    },
    {
      id: "vice-president",
      title: "Vice President",
      status: "ready",
      allowAbstain: true,
      nominees: [
        { id: "vice-a", displayName: "Candidate A" },
        { id: "vice-b", displayName: "Candidate B" },
      ],
    },
    {
      id: "secretary",
      title: "Secretary",
      status: "draft",
      allowAbstain: true,
      nominees: [],
    },
    {
      id: "treasurer",
      title: "Treasurer",
      status: "ready",
      allowAbstain: true,
      nominees: [{ id: "treasurer-a", displayName: "Candidate A" }],
    },
  ],
};

const AgmContext = createContext<AgmContextValue | null>(null);

function persist(next: MeetingState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function AgmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<MeetingState>;
        setState({
          ...initialState,
          ...parsed,
          memberImport: parsed.memberImport ?? initialState.memberImport,
        });
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        setState(JSON.parse(event.newValue) as MeetingState);
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const update = useCallback((recipe: (current: MeetingState) => MeetingState) => {
    setState((current) => {
      const next = recipe(current);
      persist(next);
      return next;
    });
  }, []);

  const checkIn = useCallback(
    (memberId: string, eligible: boolean) =>
      update((current) => ({
        ...current,
        checkIns: current.checkIns.includes(memberId)
          ? current.checkIns
          : [...current.checkIns, memberId],
        eligibleCheckIns:
          eligible && !current.eligibleCheckIns.includes(memberId)
            ? [...current.eligibleCheckIns, memberId]
            : current.eligibleCheckIns,
      })),
    [update],
  );

  const hasVoted = useCallback(
    (positionId: string, memberId: string) =>
      state.participation.includes(`${positionId}:${memberId}`),
    [state.participation],
  );

  const castVote = useCallback(
    (positionId: string, memberId: string, choiceId: string) => {
      let accepted = false;
      update((current) => {
        const position = current.positions.find((item) => item.id === positionId);
        const participationKey = `${positionId}:${memberId}`;
        if (
          current.paused ||
          position?.status !== "open" ||
          current.participation.includes(participationKey)
        ) {
          return current;
        }
        accepted = true;
        const currentTally = current.tallies[positionId] ?? {};
        return {
          ...current,
          participation: [...current.participation, participationKey],
          tallies: {
            ...current.tallies,
            [positionId]: {
              ...currentTally,
              [choiceId]: (currentTally[choiceId] ?? 0) + 1,
            },
          },
        };
      });
      return accepted;
    },
    [update],
  );

  const addPosition = useCallback(
    (title: string) =>
      update((current) => ({
        ...current,
        positions: [
          ...current.positions,
          {
            id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
            title,
            nominees: [],
            status: "draft",
            allowAbstain: true,
          },
        ],
      })),
    [update],
  );

  const addNominee = useCallback(
    (positionId: string, name: string) =>
      update((current) => ({
        ...current,
        positions: current.positions.map((position) =>
          position.id === positionId && position.status !== "open"
            ? {
                ...position,
                status: "ready",
                nominees: [
                  ...position.nominees,
                  { id: `${positionId}-${Date.now()}`, displayName: name },
                ],
              }
            : position,
        ),
      })),
    [update],
  );

  const openPosition = useCallback(
    (positionId: string) =>
      update((current) => ({
        ...current,
        positions: current.positions.map((position) => ({
          ...position,
          status:
            position.id === positionId
              ? position.nominees.length
                ? "open"
                : "draft"
              : position.status === "open"
                ? "closed"
                : position.status,
        })),
      })),
    [update],
  );

  const closePosition = useCallback(
    (positionId: string) =>
      update((current) => ({
        ...current,
        positions: current.positions.map((position) =>
          position.id === positionId ? { ...position, status: "closed" } : position,
        ),
      })),
    [update],
  );

  const setPaused = useCallback(
    (paused: boolean) => update((current) => ({ ...current, paused })),
    [update],
  );

  const resetDemo = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(initialState);
  }, []);

  const importMemberCounts = useCallback(
    (summary: { totalMembers: number; eligibleMembers: number; sourceFile: string; rule: string }) =>
      update((current) => ({
        ...current,
        memberImport: { ...summary, importedAt: new Date().toISOString() },
      })),
    [update],
  );

  const clearVotes = useCallback(
    () => update((current) => ({ ...current, participation: [], tallies: {} })),
    [update],
  );

  const clearNominees = useCallback(
    () => update((current) => ({
      ...current,
      participation: [],
      tallies: {},
      positions: current.positions.map((position) => ({
        ...position,
        nominees: [],
        status: "draft",
      })),
    })),
    [update],
  );

  const clearPositions = useCallback(
    () => update((current) => ({
      ...current,
      participation: [],
      tallies: {},
      positions: [],
    })),
    [update],
  );

  const activePosition = state.positions.find((position) => position.status === "open");
  const value = useMemo(
    () => ({
      state,
      activePosition,
      checkIn,
      hasVoted,
      castVote,
      addPosition,
      addNominee,
      openPosition,
      closePosition,
      setPaused,
      resetDemo,
      importMemberCounts,
      clearVotes,
      clearNominees,
      clearPositions,
    }),
    [
      state,
      activePosition,
      checkIn,
      hasVoted,
      castVote,
      addPosition,
      addNominee,
      openPosition,
      closePosition,
      setPaused,
      resetDemo,
      importMemberCounts,
      clearVotes,
      clearNominees,
      clearPositions,
    ],
  );

  return <AgmContext.Provider value={value}>{children}</AgmContext.Provider>;
}

export function useAgm() {
  const value = useContext(AgmContext);
  if (!value) throw new Error("useAgm must be used inside AgmProvider");
  return value;
}
