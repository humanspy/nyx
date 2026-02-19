import { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Square, Shuffle, Repeat, List, Volume2 } from 'lucide-react';
import { musicApi } from '../../utils/api.js';
import { formatDuration } from '../../utils/helpers.js';

export default function MusicPlayer({ channelId, serverId, sendMusicCommand }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [state, setState] = useState({ playing: false, paused: false, loop: 'off', autoplay: false });
  const [showQueue, setShowQueue] = useState(false);

  useEffect(() => {
    if (!channelId) return;
    musicApi.getQueue(channelId).then(data => {
      setQueue(data.queue || []);
      setCurrent(data.current);
      if (data.state) setState(data.state);
    }).catch(() => {});
  }, [channelId]);

  useEffect(() => {
    const handler = (e) => {
      const { detail } = e;
      if (detail.channelId !== channelId) return;
      if (detail.queueUpdate) setQueue(detail.queue || []);
      if (detail.current !== undefined) setCurrent(detail.current);
      if (detail.state) setState(s => ({ ...s, ...detail.state }));
      // Handle play/pause state from command results
      if (detail.action === 'playing' || detail.action === 'resumed') setState(s => ({ ...s, playing: true, paused: false }));
      if (detail.action === 'paused') setState(s => ({ ...s, paused: true }));
      if (detail.action === 'stopped' || detail.action === 'queue_ended') setState(s => ({ ...s, playing: false, paused: false }));
    };
    window.addEventListener('nexus:music', handler);
    return () => window.removeEventListener('nexus:music', handler);
  }, [channelId]);

  function cmd(command, payload = {}) {
    sendMusicCommand(channelId, command, payload, serverId);
  }

  const loopIcons = { off: <Repeat size={14} style={{ opacity: 0.4 }} />, track: <Repeat size={14} color="var(--color-accent)" />, queue: <Repeat size={14} color="var(--color-success)" /> };

  return (
    <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '8px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Track info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {current ? (
            <div>
              <div className="truncate" style={{ fontSize: 13, fontWeight: 600 }}>{current.title}</div>
              <div className="truncate text-xs text-faint">{current.artist || current.platform}</div>
            </div>
          ) : (
            <div className="text-faint text-sm">No track playing</div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn btn-icon btn-ghost btn-sm" title="Previous" onClick={() => cmd('PREVIOUS')}><SkipBack size={15} /></button>
          <button
            className="btn btn-icon btn-primary"
            style={{ width: 34, height: 34 }}
            title={state.paused || !state.playing ? 'Play' : 'Pause'}
            onClick={() => state.playing ? cmd('PAUSE') : cmd('PLAY', {})}
          >
            {state.paused || !state.playing ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button className="btn btn-icon btn-ghost btn-sm" title="Skip" onClick={() => cmd('SKIP')}><SkipForward size={15} /></button>
          <button className="btn btn-icon btn-ghost btn-sm" title="Stop" onClick={() => cmd('STOP')}><Square size={14} /></button>
          <button className="btn btn-icon btn-ghost btn-sm" title="Shuffle" onClick={() => cmd('SHUFFLE')}><Shuffle size={14} style={{ color: 'var(--color-text-muted)' }} /></button>
          <button className="btn btn-icon btn-ghost btn-sm" title={`Loop: ${state.loop}`} onClick={() => cmd('LOOP')}>{loopIcons[state.loop] || loopIcons.off}</button>
          <button className="btn btn-icon btn-ghost btn-sm" title="Show queue" onClick={() => setShowQueue(v => !v)}>
            <List size={14} style={{ color: showQueue ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
          </button>
        </div>
      </div>

      {/* Queue panel */}
      {showQueue && (
        <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
          {queue.length === 0 ? (
            <div className="text-faint text-sm" style={{ textAlign: 'center', padding: 12 }}>Queue is empty</div>
          ) : (
            queue.map((track, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                <span className="text-faint" style={{ minWidth: 20, textAlign: 'right' }}>{i + 1}.</span>
                <span className="truncate flex-1">{track.title}</span>
                <span className="text-faint">{formatDuration(track.duration)}</span>
              </div>
            ))
          )}
          {queue.length > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => cmd('QUEUE_CLEAR')}>Clear Queue</button>
          )}
        </div>
      )}
    </div>
  );
}
