"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import MemberLookupForm from "@/components/member/MemberLookupForm";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { AgmProvider } from "@/components/AgmProvider";

type ActiveView = "member" | "admin";

export default function AppShell() {
  const [activeView, setActiveView] = useState<ActiveView>("member");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [submittingPassword, setSubmittingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { authenticated?: boolean }) => setAdminUnlocked(result.authenticated === true))
      .catch(() => setAdminUnlocked(false))
      .finally(() => setCheckingAdmin(false));
  }, []);

  async function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setSubmittingPassword(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setPasswordError(result.error || "Unable to unlock the admin portal.");
        return;
      }
      setAdminUnlocked(true);
      setPassword("");
    } catch {
      setPasswordError("Unable to contact the server. Please try again.");
    } finally {
      setSubmittingPassword(false);
    }
  }

  async function handleAdminLock() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    setAdminUnlocked(false);
    setPassword("");
  }

  return (
    <AgmProvider>
    <main className="app-container">
      <header className="app-header">
        <Image
          className="brand-logo"
          src="/fam-logo.jpg"
          alt="Filipino Association Monash"
          width={112}
          height={112}
          priority
        />

        <nav className="app-navigation" aria-label="Main navigation">
          <button
            className={`nav-button ${
              activeView === "member" ? "active" : ""
            }`}
            type="button"
            onClick={() => setActiveView("member")}
          >
            Member
          </button>

          <button
            className={`nav-button ${
              activeView === "admin" ? "active" : ""
            }`}
            type="button"
            onClick={() => setActiveView("admin")}
          >
            Admin
          </button>
        </nav>
      </header>

      {activeView === "member" ? (
        <section className="member-section">
          <div className="intro">
            <p className="eyebrow">FAM AGM 2026</p>
            <h1>Check in and vote securely</h1>
            <p>
              Confirm your membership before checking in and participating in
              available elections.
            </p>
          </div>

          <MemberLookupForm />
        </section>
      ) : checkingAdmin ? (
        <section className="admin-login-section"><p>Checking admin access...</p></section>
      ) : adminUnlocked ? (
        <AdminDashboard onLock={handleAdminLock} />
      ) : (
        <section className="admin-login-section">
          <form className="admin-login-card" onSubmit={handleAdminLogin}>
            <div className="lock-mark" aria-hidden="true">FAM</div>
            <p className="eyebrow">Committee access</p>
            <h1>Admin portal</h1>
            <p>Enter the committee password to manage attendance and voting.</p>
            <label htmlFor="admin-password">Admin password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              required
            />
            {passwordError && <p className="form-message error-message" role="alert">{passwordError}</p>}
            <button className="primary-button" type="submit" disabled={submittingPassword}>
              {submittingPassword ? "Checking..." : "Unlock admin portal"}
            </button>
            <p className="login-help">Access expires automatically after 12 hours.</p>
          </form>
        </section>
      )}
    </main>
    </AgmProvider>
  );
}
