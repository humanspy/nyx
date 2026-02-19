import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <Link to="/" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>← Back to NYX</Link>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>
          Effective date: 1 January 2025 · Hosted at <strong>nyx.spygroup.dev</strong>
        </p>

        <Section title="1. Overview">
          NYX is built with privacy as a core principle. All messages, files, and voice/video calls are encrypted end-to-end. This Policy explains what data we collect, how it is used, and your rights regarding that data.
        </Section>

        <Section title="2. What We Collect">
          <strong>Account data:</strong> username, email address (required to register and access NYX), hashed password (bcrypt, never stored in plaintext), and account creation timestamp.
          <br /><br />
          <strong>Metadata:</strong> message timestamps, sender/recipient identifiers, channel membership, and IP addresses in server logs (retained for up to 30 days for security purposes).
          <br /><br />
          <strong>What we do NOT collect:</strong> message content (encrypted client-side before transmission), voice/video call audio or video (peer-to-peer and encrypted), or private encryption keys (derived locally from your password and never transmitted to our servers).
        </Section>

        <Section title="3. End-to-End Encryption">
          Message content is encrypted using AES-256-GCM before it leaves your device. Private keys are stored only in your browser's IndexedDB, encrypted with a key derived from your password using PBKDF2. We are technically incapable of reading your messages.
          <br /><br />
          Voice and video calls use WebRTC with mandatory DTLS-SRTP transport encryption, supplemented by an additional end-to-end encryption layer via the WebRTC Insertable Streams API where supported. TURN relay servers only ever see double-encrypted media — even our relay infrastructure cannot intercept your calls.
        </Section>

        <Section title="4. How We Use Your Data">
          <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li>To create and authenticate your account</li>
            <li>To operate and maintain the Service</li>
            <li>To enforce our Terms of Service</li>
            <li>To respond to security incidents</li>
            <li>We do <strong>not</strong> sell, rent, or share your data with third parties for advertising or analytics purposes</li>
          </ul>
        </Section>

        <Section title="5. Cookies & Local Storage">
          NYX does <strong>not</strong> use third-party cookies or tracking technologies of any kind.
          <br /><br />
          We store the following in your browser's <strong>localStorage</strong> (not HTTP cookies):
          <ul style={{ paddingLeft: 20, lineHeight: 2, marginTop: 8 }}>
            <li><strong>Authentication token</strong> — required to keep you signed in. Without this, the Service cannot function.</li>
            <li><strong>Refresh token</strong> — used to renew your session without requiring a new login.</li>
            <li><strong>UI preferences</strong> — your chosen theme, accent colour, font size, and other display settings.</li>
            <li><strong>Encryption key material</strong> — your local E2E key material, stored encrypted and never transmitted.</li>
          </ul>
          <br />
          This storage is <strong>essential for the Service to operate</strong>. Declining storage consent will prevent you from using NYX, as authentication relies on it. No advertising, profiling, or cross-site tracking is performed.
        </Section>

        <Section title="6. Data Retention & Account Deletion">
          Encrypted message payloads are stored for as long as your account exists. Deleted messages have their payload permanently removed; only a cryptographic deletion proof is retained to maintain conversation integrity.
          <br /><br />
          <strong>Account deletion:</strong> You may delete your account at any time from <em>Settings → Privacy &amp; Security → Danger Zone</em>. Upon requesting deletion:
          <ul style={{ paddingLeft: 20, lineHeight: 2, marginTop: 8 }}>
            <li>You are immediately signed out and all active sessions are revoked.</li>
            <li>Your account enters a <strong>3-day grace period</strong> during which you may log back in and cancel the deletion.</li>
            <li>After 3 days, your account data — including your username, email, profile, server memberships, and <strong>all messages you have sent</strong> — is permanently and irreversibly deleted from our servers.</li>
            <li>Encrypted message content that you sent to others will be removed.</li>
          </ul>
          <br />
          IP address logs are purged on a rolling 30-day basis regardless of account status.
        </Section>

        <Section title="7. Third-Party Services">
          Media files are stored in Railway Buckets (S3-compatible object storage provided by Railway, Inc.). Files are stored encrypted at rest. Audio/video signalling passes through our WebSocket server but carries only encrypted payloads.
          <br /><br />
          We do not use Google Analytics, Facebook Pixel, or any third-party analytics or advertising SDKs.
        </Section>

        <Section title="8. Your Rights">
          Depending on your jurisdiction (e.g. GDPR, UK GDPR, CCPA) you may have the right to: access a copy of your data, correct inaccurate personal data, request deletion, or object to processing. Contact us at{' '}
          <a href="mailto:privacy@spygroup.dev" style={{ color: 'var(--color-accent)' }}>privacy@spygroup.dev</a>.
          Note: we cannot provide your message content as we do not hold the decryption keys.
        </Section>

        <Section title="9. Children">
          NYX is not directed at children under 13. We do not knowingly collect data from children under 13. Contact <a href="mailto:privacy@spygroup.dev" style={{ color: 'var(--color-accent)' }}>privacy@spygroup.dev</a> if you believe a child has registered.
        </Section>

        <Section title="10. Changes to This Policy">
          We may update this Policy. Significant changes will be notified via an in-app banner. The effective date at the top reflects when the Policy was last revised. Continued use constitutes acceptance.
        </Section>

        <Section title="11. Contact">
          <a href="mailto:privacy@spygroup.dev" style={{ color: 'var(--color-accent)' }}>privacy@spygroup.dev</a>
        </Section>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 16 }}>
          <Link to="/terms" style={{ color: 'var(--color-accent)' }}>Terms of Service</Link>
          <Link to="/" style={{ color: 'var(--color-text-muted)' }}>Back to NYX</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{title}</h2>
      <div style={{ color: 'var(--color-text-muted)', lineHeight: 1.75, fontSize: 15 }}>{children}</div>
    </div>
  );
}
