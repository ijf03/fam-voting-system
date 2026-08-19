import Image from "next/image";
import MemberLookupForm from "@/components/member/MemberLookupForm";

export default function Home() {
  return (
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
          <button className="nav-button active" type="button">
            Member
          </button>

          <button className="nav-button" type="button">
            Admin
          </button>
        </nav>
      </header>

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
    </main>
  );
}