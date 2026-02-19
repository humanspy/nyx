import { useEffect, useRef, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import MessageItem from './MessageItem.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import { useMessageStore } from '../../store/messageStore.js';

export default function MessageList({ channelId }) {
  const { messages, hasMore, fetchMessages, getTyping } = useMessageStore();
  const msgs = messages[channelId] || [];
  const typing = getTyping(channelId);
  const virtuosoRef = useRef(null);

  useEffect(() => {
    if (channelId) fetchMessages(channelId);
  }, [channelId]);

  useEffect(() => {
    virtuosoRef.current?.scrollToIndex({ index: msgs.length - 1, behavior: 'smooth' });
  }, [msgs.length]);

  const loadMore = useCallback(() => {
    if (hasMore[channelId] && msgs.length > 0) {
      fetchMessages(channelId, msgs[0]?.id);
    }
  }, [channelId, hasMore, msgs]);

  if (!msgs.length && !typing.length) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        No messages yet. Say hello!
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Virtuoso
        ref={virtuosoRef}
        data={msgs}
        style={{ flex: 1 }}
        followOutput="auto"
        startReached={loadMore}
        itemContent={(index, msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            prevMessage={msgs[index - 1]}
            channelId={channelId}
          />
        )}
        components={{
          Footer: () => typing.length > 0 ? <TypingIndicator users={typing} /> : null,
        }}
      />
    </div>
  );
}
