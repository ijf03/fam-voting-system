import {
  mockAttendance,
  mockPositions,
} from "@/lib/mock-admin";

export default function AdminDashboard() {
  const quorumReached =
    mockAttendance.eligibleCheckedIn >= mockAttendance.quorumRequired;

  const quorumProgress = Math.min(
    (mockAttendance.eligibleCheckedIn /
      mockAttendance.quorumRequired) *
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

        <span className="demo-badge">Demo data</span>
      </div>

      <div className="metric-grid">
        <article className="metric-card">
          <span>Total members</span>
          <strong>{mockAttendance.totalMembers}</strong>
        </article>

        <article className="metric-card">
          <span>Checked in</span>
          <strong>{mockAttendance.checkedIn}</strong>
        </article>

        <article className="metric-card">
          <span>Eligible members</span>
          <strong>{mockAttendance.eligibleMembers}</strong>
        </article>

        <article className="metric-card">
          <span>Eligible checked in</span>
          <strong>{mockAttendance.eligibleCheckedIn}</strong>
        </article>
      </div>

      <article className="quorum-card">
        <div className="quorum-heading">
          <div>
            <span>Quorum</span>
            <strong>
              {mockAttendance.eligibleCheckedIn} /{" "}
              {mockAttendance.quorumRequired}
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
          aria-valuemax={mockAttendance.quorumRequired}
          aria-valuenow={mockAttendance.eligibleCheckedIn}
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

          <button className="primary-button compact-button" type="button">
            Add position
          </button>
        </div>

        <div className="position-list">
          {mockPositions.map((position) => (
            <article className="position-card" key={position.id}>
              <div>
                <h3>{position.title}</h3>
                <p>
                  {position.nomineeCount}{" "}
                  {position.nomineeCount === 1 ? "nominee" : "nominees"}
                </p>
              </div>

              <div className="position-actions">
                <span
                  className={`position-status ${position.status.toLowerCase()}`}
                >
                  {position.status}
                </span>

                <button
                  className="secondary-button compact-button"
                  type="button"
                  disabled
                  title="Nominee management will be added next"
                >
                  Manage
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}