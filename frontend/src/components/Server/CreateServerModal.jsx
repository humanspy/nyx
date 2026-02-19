import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { serversApi } from '../../utils/api.js';
import { useServerStore } from '../../store/serverStore.js';
import { useNavigate } from 'react-router-dom';

export default function CreateServerModal({ onClose }) {
  const [name, setName] = useState('');
  const [vanityUrl, setVanityUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { fetchServers, setActiveServer } = useServerStore();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setLoading(true);
    try {
      const server = await serversApi.create({ name: name.trim(), vanity_url: vanityUrl.trim() || undefined });
      await fetchServers();
      setActiveServer(server.id);
      navigate(`/channels/${server.id}`);
      onClose();
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">Create a Server</span>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={16} /></button>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Server Name *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="My Awesome Server" required />
          </div>
          <div className="form-group">
            <label className="form-label">Vanity URL <span style={{ color: 'var(--color-text-faint)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span style={{ padding: '8px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', fontSize: 14, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>nexus.app/</span>
              <input
                value={vanityUrl}
                onChange={e => setVanityUrl(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-server"
                style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}
              />
            </div>
          </div>

          {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              {loading ? 'Creating…' : 'Create Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
