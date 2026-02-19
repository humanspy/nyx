import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <Link to="/" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>← Back to NYX</Link>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>
          Effective date: 1 January 2025 · Hosted at <strong>nyx.spygroup.dev</strong>
        </p>

        <Section title="1. Acceptance">
          By creating an account or accessing NYX ("the Service"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use the Service.
        </Section>

        <Section title="2. Eligibility">
          You must be at least 13 years old to use NYX. By registering, you represent that you meet this age requirement and that the information you provide is accurate.
        </Section>

        <Section title="3. Account Responsibility">
          You are responsible for maintaining the confidentiality of your account credentials. Your private encryption key is derived from your password and is never transmitted to our servers — if you lose your password, encrypted message history cannot be recovered. You are responsible for all activity under your account.
        </Section>

        <Section title="4. Acceptable Use">
          You agree not to use NYX to:
          <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 2 }}>
            <li>Transmit illegal content, malware, or material that infringes third-party rights</li>
            <li>Harass, threaten, or abuse other users</li>
            <li>Attempt to circumvent end-to-end encryption for surveillance purposes</li>
            <li>Conduct unauthorised access to servers, accounts, or infrastructure</li>
            <li>Violate any applicable local, national, or international law or regulation</li>
          </ul>
        </Section>

        <Section title="5. End-to-End Encryption">
          NYX encrypts all user-generated content client-side before transmission. The server stores only ciphertext and never has access to plaintext message content. We cannot read your messages or recover deleted content.
        </Section>

        <Section title="6. Content & Intellectual Property">
          You retain ownership of content you create. By posting content, you grant NYX a limited licence to store and transmit it (in encrypted form) as necessary to provide the Service. You must not post content you do not have the right to share.
        </Section>

        <Section title="7. Service Availability">
          NYX is provided "as is" without warranties of any kind. We may modify, suspend, or discontinue the Service at any time. We are not liable for any loss or damage arising from service interruptions.
        </Section>

        <Section title="8. Termination">
          We reserve the right to suspend or terminate accounts that violate these Terms. You may delete your account at any time from the Settings page.
        </Section>

        <Section title="9. Changes to These Terms">
          We may update these Terms from time to time. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.
        </Section>

        <Section title="10. Contact">
          For questions about these Terms, contact us at <a href="mailto:legal@spygroup.dev">legal@spygroup.dev</a>.
        </Section>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 16 }}>
          <Link to="/privacy" style={{ color: 'var(--color-accent)' }}>Privacy Policy</Link>
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
