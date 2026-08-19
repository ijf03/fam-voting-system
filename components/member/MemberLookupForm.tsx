"use client";

import { useState, type FormEvent } from "react";

export default function MemberLookupForm() {
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{8}$/.test(studentId)) {
      setError("Enter your 8-digit student ID.");
      return;
    }

    if (!email.includes("@")) {
      setError("Enter a valid Monash email address.");
      return;
    }

    setMessage("Details accepted. Database lookup will be connected next.");
  }

  return (
    <form className="member-form" onSubmit={handleSubmit}>
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

      {message && (
        <p className="form-message success-message" role="status">
          {message}
        </p>
      )}

      <button className="primary-button" type="submit">
        Continue
      </button>
    </form>
  );
}