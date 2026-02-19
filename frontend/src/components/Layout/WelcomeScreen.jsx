import { Lock, Shield, Zap } from 'lucide-react';

export default function WelcomeScreen() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 40, background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Welcome to Nexus</h1>
        <p className="text-muted" style={{ fontSize: 16 }}>Select a channel or direct message to get started.</p>
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        {[
          { icon: Lock, title: 'End-to-End Encrypted', desc: 'All messages are encrypted before they leave your device.' },
          { icon: Shield, title: 'Zero Knowledge', desc: 'The server never sees your message content.' },
          { icon: Zap, title: 'Real-Time', desc: 'Instant delivery with WebSocket connections.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card" style={{ width: 200, textAlign: 'center', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Icon size={28} color="var(--color-accent)" />
            </div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
            <div className="text-muted text-sm">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
