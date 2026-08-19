"use client";

import { useState, type FormEvent } from "react";
import {
  findMockMember,
  type MockMember,
} from "@/lib/mock-members";

import VotingSession from "@/components/voting/VotingSession";

type CheckInStage = "lookup" | "member-found" | "checked-in";

export default function MemberLookupForm() {
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [member, setMember] = useState<MockMember | null>(null);
  const [stage, setStage] = useState<CheckInStage>("lookup");
  const [error, setError] = useState("");

  function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!/^\d{8}$/.test(studentId)) {
      setError("Enter your 8-digit student ID.");
      return;
    }

    const matchedMember = findMockMember(studentId, email);

    if (!matchedMember) {
      setError("We could not find a membership matching those details.");
      return;
    }

    setMember(matchedMember);
    setStage("member-found");
  }

  function handleCheckIn() {
    setStage("checked-in");
  }

  function handleReset() {
    setStudentId("");
    setEmail("");
    setMember(null);
    setError("");
    setStage("lookup");
  }

  if (stage === "checked-in" && member) {
    return (
      <section className="status-card" aria-live="polite">
        <div className="status-icon">✓</div>

        <p className="eyebrow">Check-in complete</p>
        <h2>You&apos;re checked in</h2>

        <p>
          Welcome, {member.firstName}. Your attendance has been recorded.
        </p>

        {member.eligible ? (
          <div className="eligibility-message eligible">
            <strong>Eligible to vote</strong>
            <span>Wait here for the next position to open.</span>
          </div>
        ) : (
          <div className="eligibility-message ineligible">
            <strong>Not eligible to vote</strong>
            <span>
              You are counted in attendance but cannot vote in this election.
            </span>
          </div>
        )}

        <button
          className="secondary-button"
          type="button"
          onClick={handleReset}
        >
          Return to member lookup
        </button>
      </section>
    );
  }

  if (stage === "member-found" && member) {
    return (
      <section className="member-form" aria-live="polite">
        <p className="eyebrow">Membership found</p>
        <h2>
          Welcome, {member.firstName} {member.lastName}
        </h2>

        <dl className="member-details">
          <div>
            <dt>Student ID</dt>
            <dd>{member.studentId}</dd>
          </div>

          <div>
            <dt>Campus</dt>
            <dd>{member.campus}</dd>
          </div>

          <div>
            <dt>Voting status</dt>
            <dd>
              <span
                className={
                  member.eligible
                    ? "eligibility-badge eligible"
                    : "eligibility-badge ineligible"
                }
              >
                {member.eligible ? "Eligible" : "Not eligible"}
              </span>
            </dd>
          </div>
        </dl>

        <button
          className="primary-button"
          type="button"
          onClick={handleCheckIn}
        >
          Check in
        </button>

        <button
          className="secondary-button"
          type="button"
          onClick={handleReset}
        >
          This isn&apos;t me
        </button>
      </section>
    );
  }

  return (
    <form className="member-form" onSubmit={handleLookup}>
      <div className="form-heading">
        <p className="eyebrow">Member check-in</p>
        <h2>Find your membership</h2>
        <p>Enter the details associated with your FAM membership.</p>
      </div>

      <label htmlFor="studentId">Student ID</label>
      <input
        id="studentId"
        name="studentId"
        type="text"
        inputMode="numeric"
        autoComplete="username"
        placeholder="12345678"
        maxLength={8}
        value={studentId}
        onChange={(event) =>
          setStudentId(event.target.value.replace(/\D/g, ""))
        }
        required
      />

      <label htmlFor="email">Monash email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="name@student.monash.edu"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      {error && (
        <p className="form-message error-message" role="alert">
          {error}
        </p>
      )}

      <button className="primary-button" type="submit">
        Find membership
      </button>
    </form>
  );
}