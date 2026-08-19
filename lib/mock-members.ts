export type MockMember = {
  id: string;
  studentId: string;
  email: string;
  firstName: string;
  lastName: string;
  campus: "CLAYTON" | "CAULFIELD" | "PARKVILLE";
  eligible: boolean;
};

export const mockMembers: MockMember[] = [
  {
    id: "member-1",
    studentId: "12345678",
    email: "demo@student.monash.edu",
    firstName: "Demo",
    lastName: "Member",
    campus: "CLAYTON",
    eligible: true,
  },
  {
    id: "member-2",
    studentId: "87654321",
    email: "guest@student.monash.edu",
    firstName: "Guest",
    lastName: "Member",
    campus: "CAULFIELD",
    eligible: false,
  },
];

export function findMockMember(studentId: string, email: string) {
  return mockMembers.find(
    (member) =>
      member.studentId === studentId.trim() &&
      member.email === email.trim().toLowerCase(),
  );
}