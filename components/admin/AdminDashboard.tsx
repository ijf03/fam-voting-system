"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useAgm } from "@/components/AgmProvider";
import { readMemberWorkbook } from "@/lib/xlsx-member-import";

export default function AdminDashboard({ onLock }: { onLock: () => void }) {
  const {
    state,
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
  } = useAgm();
  const [newPosition, setNewPosition] = useState("");
  const [nomineeNames, setNomineeNames] = useState<Record<string, string>>({});
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const totalMembers = state.memberImport.totalMembers;
  const eligibleMembers = state.memberImport.eligibleMembers;
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
          <button className="secondary-button compact-button" type="button" onClick={onLock}>
            Lock admin
          </button>
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

      <article className="member-import-card">
        <div>
          <p className="eyebrow">Membership source</p>
          <h2>Import member totals</h2>
          <p>
            Choose the current MSA member export. The file is read in this browser only;
            names, IDs, and emails are not stored by this demo.
          </p>
          <p className="import-source">
            <strong>Current source:</strong> {state.memberImport.sourceFile}<br />
            <span>Eligibility rule: {state.memberImport.rule}</span>
          </p>
        </div>
        <label className="upload-button">
          {importing ? "Reading workbook..." : "Choose Excel file"}
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleWorkbook}
            disabled={importing}
          />
        </label>
        {importStatus && <p className="form-message success-message" role="status">{importStatus}</p>}
        {importError && <p className="form-message error-message" role="alert">{importError}</p>}
      </article>

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
      <section className="danger-zone">
        <div>
          <p className="eyebrow">Data controls</p>
          <h2>Clear meeting data</h2>
          <p>These actions affect this browser&apos;s local demo data.</p>
        </div>
        <div className="danger-actions">
          <button className="secondary-button compact-button" type="button" onClick={() => {
            if (window.confirm("Clear all recorded votes? This cannot be undone.")) clearVotes();
          }}>Clear votes</button>
          <button className="secondary-button compact-button" type="button" onClick={() => {
            if (window.confirm("Remove every nominee? Recorded votes will also be cleared.")) clearNominees();
          }}>Clear nominees</button>
          <button className="danger-button compact-button" type="button" onClick={() => {
            if (window.confirm("Remove every position, nominee, and vote? This cannot be undone.")) clearPositions();
          }}>Remove all positions</button>
          <button className="text-button" type="button" onClick={() => {
            if (window.confirm("Restore all original demo data and counts?")) resetDemo();
          }}>Restore demo defaults</button>
        </div>
      </section>
    </section>
  );

  async function handleWorkbook(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError("");
    setImportStatus("");
    try {
      const summary = await readMemberWorkbook(file);
      importMemberCounts(summary);
      setImportStatus(
        `Imported ${summary.totalMembers} members; ${summary.eligibleMembers} eligible.`,
      );
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to read that workbook.");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }
}
