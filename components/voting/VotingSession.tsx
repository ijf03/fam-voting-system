"use client";

import { useState, type FormEvent } from "react";
import { mockPosition } from "@/lib/mock-election";

type VotingStage = "waiting" | "ballot" | "confirm" | "submitted";

type VotingSessionProps = {
  memberName: string;
  onExit: () => void;
};

export default function VotingSession({
  memberName,
  onExit,
}: VotingSessionProps) {
  const [stage, setStage] = useState<VotingStage>("waiting");
  const [selectedChoice, setSelectedChoice] = useState("");

  const selectedNominee = mockPosition.nominees.find(
    (nominee) => nominee.id === selectedChoice,
  );

  const selectedLabel =
    selectedChoice === "abstain"
      ? "Abstain"
      : selectedNominee?.displayName;

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedChoice) {
      return;
    }

    setStage("confirm");
  }

  if (stage === "waiting") {
    return (
      <section className="status-card">
        <div className="waiting-indicator" aria-hidden="true" />

        <p className="eyebrow">Checked in</p>
        <h2>Welcome, {memberName}</h2>
        <p>You are eligible to vote.</p>

        <div className="waiting-message">
          <strong>Waiting for the next position</strong>
          <span>The ballot will appear here when voting opens.</span>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={() => setStage("ballot")}
        >
          Open test ballot
        </button>

        <button className="secondary-button" type="button" onClick={onExit}>
          Return to member lookup
        </button>
      </section>
    );
  }

  if (stage === "ballot") {
    return (
      <form className="ballot-card" onSubmit={handleReview}>
        <p className="eyebrow">Voting is open</p>
        <h2>{mockPosition.title}</h2>
        <p>Select one option. You will review it before submitting.</p>

        <fieldset className="nominee-list">
          <legend className="sr-only">
            Select a nominee for {mockPosition.title}
          </legend>

          {mockPosition.nominees.map((nominee) => (
            <label className="nominee-option" key={nominee.id}>
              <input
                type="radio"
                name="nominee"
                value={nominee.id}
                checked={selectedChoice === nominee.id}
                onChange={(event) => setSelectedChoice(event.target.value)}
              />

              <span>{nominee.displayName}</span>
            </label>
          ))}

          {mockPosition.allowAbstain && (
            <label className="nominee-option abstain-option">
              <input
                type="radio"
                name="nominee"
                value="abstain"
                checked={selectedChoice === "abstain"}
                onChange={(event) => setSelectedChoice(event.target.value)}
              />

              <span>Abstain</span>
            </label>
          )}
        </fieldset>

        <button
          className="primary-button"
          type="submit"
          disabled={!selectedChoice}
        >
          Review vote
        </button>
      </form>
    );
  }

  if (stage === "confirm") {
    return (
      <section className="ballot-card">
        <p className="eyebrow">Confirm your vote</p>
        <h2>{mockPosition.title}</h2>

        <div className="selected-vote">
          <span>You selected</span>
          <strong>{selectedLabel}</strong>
        </div>

        <p className="vote-warning">
          Your vote cannot be changed after submission.
        </p>

        <div className="button-row">
          <button
            className="secondary-button"
            type="button"
            onClick={() => setStage("ballot")}
          >
            Back
          </button>

          <button
            className="primary-button"
            type="button"
            onClick={() => setStage("submitted")}
          >
            Confirm vote
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="status-card">
      <div className="status-icon">✓</div>

      <p className="eyebrow">Demo vote submitted</p>
      <h2>Your vote has been recorded</h2>

      <p>
        This test vote is stored only in the browser. It will be connected to
        the secure database later.
      </p>

      <div className="waiting-message">
        <strong>Waiting for the next position</strong>
        <span>Keep this page open during the AGM.</span>
      </div>

      <button className="secondary-button" type="button" onClick={onExit}>
        Return to member lookup
      </button>
    </section>
  );
}