const sessions = {};

export function getSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = { collectedData: {} };
  }
  return sessions[sessionId];
}

export function updateSession(session, newData) {
  session.collectedData = {
    ...session.collectedData,
    ...newData
  };
}