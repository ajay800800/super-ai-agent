import React from 'react';

export default function NewChatButton({ onClick }) {
  return (
    <div style={{ marginTop: "10px", textAlign: "center" }}>
      <button className="new-chat" onClick={onClick}>🧹 Start New Chat</button>
    </div>
  );
}
