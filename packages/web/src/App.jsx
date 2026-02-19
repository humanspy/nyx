import React, { useState } from 'react';
import './App.css';

// Mock Data
const mockServers = [
  { id: '1', name: 'Server 1', channels: [
      { id: 'c1', name: 'general' },
      { id: 'c2', name: 'random' },
    ] 
  },
  { id: '2', name: 'Server 2', channels: [
      { id: 'c3', name: 'welcome' },
      { id: 'c4', name: 'dev-talk' },
    ]
  },
];

function App() {
  const [selectedServer, setSelectedServer] = useState(mockServers[0]);
  const [selectedChannel, setSelectedChannel] = useState(selectedServer.channels[0]);

  const handleSelectServer = (server) => {
    setSelectedServer(server);
    setSelectedChannel(server.channels[0]);
  }

  return (
    <div className="app">
      <div className="servers-list">
        {mockServers.map(server => (
          <div 
            key={server.id} 
            className={`server-icon ${selectedServer.id === server.id ? 'active' : ''}`}
            onClick={() => handleSelectServer(server)}
          >
            {server.name.charAt(0)}
          </div>
        ))}
      </div>
      <div className="channels-list">
        <h2>{selectedServer.name}</h2>
        {selectedServer.channels.map(channel => (
          <div 
            key={channel.id}
            className={`channel-item ${selectedChannel.id === channel.id ? 'active' : ''}`}
            onClick={() => setSelectedChannel(channel)}
          >
            # {channel.name}
          </div>
        ))}
      </div>
      <div className="main-content">
        <h1># {selectedChannel.name}</h1>
        <p>Content for {selectedChannel.name} goes here.</p>
      </div>
    </div>
  );
}

export default App;
