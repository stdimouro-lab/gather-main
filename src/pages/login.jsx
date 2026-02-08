import React, { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div style={{ maxWidth: 420, margin: "80px auto" }}>
      <h1>Sign in</h1>

      <label>Email</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, margin: "8px 0 16px" }}
      />

      <label>Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 10, margin: "8px 0 16px" }}
      />

      <button style={{ width: "100%", padding: 12 }}>
        Continue
      </button>

      <p style={{ opacity: 0.7, marginTop: 12 }}>
        (We’ll connect this button to Supabase next.)
      </p>
    </div>
  );
}
