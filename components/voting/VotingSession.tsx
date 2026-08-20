"use client";

import { useState, type FormEvent } from "react";
import { useAgm } from "@/components/AgmProvider";

type VotingStage = "waiting" | "ballot" | "confirm" | "submitted";

type VotingSessionProps = {
  memberId: string;
  memberName: string;
  onExit: () => void;
};

export default function VotingSession({
  memberId,
  memberName,
  onExit,
}: VotingSessionProps) {
  const { activePosition, castVote, hasVoted, state } = useAgm();
  const [stage, setStage] = useState<VotingStage>("waiting");
  const [selectedChoice, setSelectedChoice] = useState("");
  const [submitError, setSubmitError] = useState("");

  const selectedNominee = activePosition?.nominees.find(
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

  const alreadyVoted = activePosition
    ? hasVoted(activePosition.id, memberId)
    : false;

  if (state.paused) {
    return (
      <section className="status-card">
        <div className="pause-icon">!</div>
        <p className="eyebrow">Voting paused</p>
        <h2>Please wait for the Returning Officer</h2>
        <p>Do not close this page. Voting will resume here when it is safe.</p>
      </section>
    );
  }

  if (!activePosition || alreadyVoted || stage === "waiting") {
    return (
      <section className="status-card">
        <div className="waiting-indicator" aria-hidden="true" />

        <p className="eyebrow">Checked in</p>
        <h2>Welcome, {memberName}</h2>
        <p>You are eligible to vote.</p>

        <div className="waiting-message">
          <strong>
            {alreadyVoted ? "Vote recorded" : activePosition ? `${activePosition.title} is open` : "Waiting for the next position"}
          </strong>
          <span>
            {alreadyVoted
              ? "You can vote again when the next position opens."
              : activePosition
                ? "Your ballot is ready."
                : "The ballot will appear here when voting opens."}
          </span>
        </div>

        {activePosition && !alreadyVoted && (
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setSelectedChoice("");
              setStage("ballot");
            }}
          >
            Open ballot
          </button>
        )}

        <button className="secondary-button" type="button" onClick={onExit}>
          Return to member lookup
        </button>
      </section>
    );
  }

  if (stage === "ballot") {
    if (!activePosition) return null;
    return (
      <form className="ballot-card" onSubmit={handleReview}>
        <p className="eyebrow">Voting is open</p>
        <h2>{activePosition.title}</h2>
        <p>Select one option. You will review it before submitting.</p>

        <fieldset className="nominee-list">
          <legend className="sr-only">
            Select a nominee for {activePosition.title}
          </legend>

          {activePosition.nominees.map((nominee) => (
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

          {activePosition.allowAbstain && (
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
    if (!activePosition) return null;
    return (
      <section className="ballot-card">
        <p className="eyebrow">Confirm your vote</p>
        <h2>{activePosition.title}</h2>

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
            onClick={() => {
              const accepted = castVote(activePosition.id, memberId, selectedChoice);
              if (accepted) {
                setStage("submitted");
              } else {
                setSubmitError("This ballot is closed, paused, or already submitted.");
              }
            }}
          >
            Confirm vote
          </button>
        </div>
        {submitError && <p className="form-message error-message" role="alert">{submitError}</p>}
      </section>
    );
  }

  return (
    <section className="status-card">
      <div className="status-icon">✓</div>

      <p className="eyebrow">Vote submitted</p>
      <h2>Your vote has been recorded</h2>

      <p>Your anonymous vote has been recorded. It cannot be changed.</p>

      <div className="waiting-message">
        <strong>Waiting for the next position</strong>
        <span>Keep this page open during the AGM.</span>
      </div>

      <button className="secondary-button" type="button" onClick={() => setStage("waiting")}>
        Continue waiting
      </button>
    </section>
  );
}
