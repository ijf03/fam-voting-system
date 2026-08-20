"use client";

import { useState, type FormEvent } from "react";
import { useAgm } from "@/components/AgmProvider";

export default function AdminDashboard() {
  const {
    state,
    addPosition,
    addNominee,
    openPosition,
    closePosition,
    setPaused,
    resetDemo,
  } = useAgm();
  const [newPosition, setNewPosition] = useState("");
  const [nomineeNames, setNomineeNames] = useState<Record<string, string>>({});
  const [showAddPosition, setShowAddPosition] = useState(false);
  const totalMembers = 281;
  const eligibleMembers = 175;
  const checkedIn = 91 + state.checkIns.length;
  const eligibleCheckedIn = 72 + state.eligibleCheckIns.length;
  const quorumRequired = 24;
  const quorumReached =
    eligibleCheckedIn >= quorumRequired;

  const quorumProgress = Math.min(
    (eligibleCheckedIn /
      quorumRequired) *
      100,
    100,
  );

  return (
    <section className="admin-dashboard">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>FAM AGM 2026</h1>
          <p>Monitor attendance and manage election positions.</p>
        </div>

        <div className="admin-top-actions">
          <button
            className={`pause-button ${state.paused ? "resume" : ""}`}
            type="button"
            onClick={() => setPaused(!state.paused)}
          >
            {state.paused ? "Resume voting" : "Pause all voting"}
          </button>
          <span className="demo-badge">Local live demo</span>
        </div>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>Total members</span>
          <strong>{totalMembers}</strong>
        </article>

        <article className="metric-card">
          <span>Checked in</span>
          <strong>{checkedIn}</strong>
        </article>

        <article className="metric-card">
          <span>Eligible members</span>
          <strong>{eligibleMembers}</strong>
        </article>

        <article className="metric-card">
          <span>Eligible checked in</span>
          <strong>{eligibleCheckedIn}</strong>
        </article>
      </div>

      <article className="quorum-card">
        <div className="quorum-heading">
          <div>
            <span>Quorum</span>
            <strong>
              {eligibleCheckedIn} / {quorumRequired}
            </strong>
          </div>

          <span
            className={
              quorumReached
                ? "quorum-status reached"
                : "quorum-status not-reached"
            }
          >
            {quorumReached ? "Quorum reached" : "Quorum not reached"}
          </span>
        </div>

        <div
          className="quorum-progress"
          role="progressbar"
          aria-label="Quorum progress"
          aria-valuemin={0}
          aria-valuemax={quorumRequired}
          aria-valuenow={eligibleCheckedIn}
        >
          <div style={{ width: `${quorumProgress}%` }} />
        </div>
      </article>

      <div className="positions-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Election setup</p>
            <h2>Positions</h2>
          </div>

          <button className="primary-button compact-button" type="button" onClick={() => setShowAddPosition(!showAddPosition)}>
            Add position
          </button>
        </div>

        {showAddPosition && (
          <form
            className="inline-form"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              if (!newPosition.trim()) return;
              addPosition(newPosition.trim());
              setNewPosition("");
              setShowAddPosition(false);
            }}
          >
            <label htmlFor="new-position">Position name</label>
            <input id="new-position" value={newPosition} onChange={(event) => setNewPosition(event.target.value)} placeholder="e.g. Events Officer" />
            <button className="primary-button compact-button" type="submit">Create</button>
          </form>
        )}

        <div className="position-list">
          {state.positions.map((position) => {
            const tally = state.tallies[position.id] ?? {};
            const voteCount = Object.values(tally).reduce((sum, count) => sum + count, 0);
            return (
            <article className="position-card" key={position.id}>
              <div>
                <h3>{position.title}</h3>
                <p>
                  {position.nominees.length}{" "}
                  {position.nominees.length === 1 ? "nominee" : "nominees"} · {voteCount} votes
                </p>
                <div className="nominee-tags">
                  {position.nominees.map((nominee) => (
                    <span key={nominee.id}>
                      {nominee.displayName}
                      {position.status === "closed" ? ` (${tally[nominee.id] ?? 0})` : ""}
                    </span>
                  ))}
                  {position.status === "closed" && position.allowAbstain && (
                    <span>Abstain ({tally.abstain ?? 0})</span>
                  )}
                </div>
              </div>

              <div className="position-actions">
                <span
                  className={`position-status ${position.status}`}
                >
                  {position.status[0].toUpperCase() + position.status.slice(1)}
                </span>

                {position.status === "open" ? (
                  <button className="danger-button compact-button" type="button" onClick={() => closePosition(position.id)}>Close poll</button>
                ) : (
                  <button className="primary-button compact-button" type="button" disabled={!position.nominees.length || state.paused} onClick={() => openPosition(position.id)}>
                    {position.status === "closed" ? "Reopen" : "Open poll"}
                  </button>
                )}
              </div>
              {position.status !== "open" && (
                <form className="nominee-form" onSubmit={(event) => {
                  event.preventDefault();
                  const name = nomineeNames[position.id]?.trim();
                  if (!name) return;
                  addNominee(position.id, name);
                  setNomineeNames((current) => ({ ...current, [position.id]: "" }));
                }}>
                  <label className="sr-only" htmlFor={`nominee-${position.id}`}>Nominee name</label>
                  <input id={`nominee-${position.id}`} value={nomineeNames[position.id] ?? ""} onChange={(event) => setNomineeNames((current) => ({ ...current, [position.id]: event.target.value }))} placeholder="Add nominee" />
                  <button className="secondary-button compact-button" type="submit">Add</button>
                </form>
              )}
            </article>
          )})}
        </div>
      </div>
      <button className="text-button" type="button" onClick={resetDemo}>Reset local demo data</button>
    </section>
  );
}
