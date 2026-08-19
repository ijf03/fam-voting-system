export type Nominee = {
  id: string;
  displayName: string;
};

export type Position = {
  id: string;
  title: string;
  nominees: Nominee[];
  allowAbstain: boolean;
};

export const mockPosition: Position = {
  id: "position-president",
  title: "President",
  allowAbstain: true,
  nominees: [
    {
      id: "nominee-1",
      displayName: "Candidate A",
    },
    {
      id: "nominee-2",
      displayName: "Candidate B",
    },
    {
      id: "nominee-3",
      displayName: "Candidate C",
    },
  ],
};