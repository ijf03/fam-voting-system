export type PositionStatus = "Draft" | "Ready" | "Open" | "Closed";

export type AdminPosition = {
  id: string;
  title: string;
  nomineeCount: number;
  status: PositionStatus;
};

export const mockAttendance = {
  totalMembers: 281,
  checkedIn: 92,
  eligibleMembers: 175,
  eligibleCheckedIn: 73,
  quorumRequired: 60,
};

export const mockPositions: AdminPosition[] = [
  {
    id: "president",
    title: "President",
    nomineeCount: 3,
    status: "Ready",
  },
  {
    id: "vice-president",
    title: "Vice President",
    nomineeCount: 2,
    status: "Ready",
  },
  {
    id: "secretary",
    title: "Secretary",
    nomineeCount: 0,
    status: "Draft",
  },
  {
    id: "treasurer",
    title: "Treasurer",
    nomineeCount: 1,
    status: "Ready",
  },
];