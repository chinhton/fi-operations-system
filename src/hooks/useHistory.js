import { useState } from 'react';

export default function useHistory(triggerModal, closeModal) {
  const [history, setHistory] = useState([]);

  const deleteHistoryLog = async (id) => {
    try {
      const res = await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      
      // The Magic Fix: If the backend successfully deleted it, OR if it says it's already gone (404), wipe it from the UI.
      if (res.ok || res.status === 404) {
        setHistory(prevHistory => prevHistory.filter(log => log.id !== id));
      } else {
        console.error("Backend refused deletion.");
      }
    } catch (err) {
      console.error("Network error deleting history log:", err);
    }
  };

  // MUST RETURN THESE so the rest of the application can use them!
  return {
    history,
    setHistory,
    deleteHistoryLog
  };
}