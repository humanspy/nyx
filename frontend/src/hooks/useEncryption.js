import { useState, useCallback } from 'react';
import { getChannelKey, saveChannelKey } from '../crypto/keyManager.js';
import { generateAndDistributeChannelKey, receiveChannelKey } from '../crypto/groupKeys.js';
import { channelsApi, usersApi } from '../utils/api.js';

export function useEncryption() {
  const [keyStatus, setKeyStatus] = useState({}); // { [channelId]: 'loading'|'ready'|'missing' }

  const ensureChannelKey = useCallback(async (channelId) => {
    if (keyStatus[channelId] === 'ready') return true;
    setKeyStatus(s => ({ ...s, [channelId]: 'loading' }));

    const existing = await getChannelKey(channelId);
    if (existing) {
      setKeyStatus(s => ({ ...s, [channelId]: 'ready' }));
      return true;
    }

    // Try to fetch from server (our key slot)
    try {
      const { key } = await channelsApi.get(channelId + '/key').catch(() => ({ key: null }));
      if (key) {
        const { encrypted_key, nonce, sender_public_key } = key;
        await receiveChannelKey(channelId, encrypted_key, nonce, sender_public_key);
        setKeyStatus(s => ({ ...s, [channelId]: 'ready' }));
        return true;
      }
    } catch {}

    setKeyStatus(s => ({ ...s, [channelId]: 'missing' }));
    return false;
  }, [keyStatus]);

  const initializeChannelKey = useCallback(async (channelId, memberUserIds) => {
    const { distributions } = await generateAndDistributeChannelKey(channelId, memberUserIds);
    // Post distributions to server
    await Promise.all(distributions.map(d =>
      fetch(`/api/channels/${channelId}/key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(d),
      })
    ));
    setKeyStatus(s => ({ ...s, [channelId]: 'ready' }));
  }, []);

  return { keyStatus, ensureChannelKey, initializeChannelKey };
}
