"use client";

import { useState } from "react";
import Image from "next/image";
import MemberLookupForm from "@/components/member/MemberLookupForm";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { AgmProvider } from "@/components/AgmProvider";

type ActiveView = "member" | "admin";

export default function AppShell() {
  const [activeView, setActiveView] = useState<ActiveView>("member");

  return (
    <AgmProvider>
    <main className="app-container">
      <header className="app-header">
        <Image
          src="/fam-logo.png"
          alt="Filipino Association Monash"
          width={150}
          height={70}
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
      ) : (
        <AdminDashboard />
      )}
    </main>
    </AgmProvider>
  );
}
