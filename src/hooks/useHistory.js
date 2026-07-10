import { useState } from 'react';

export default function useHistory(triggerModal, closeModal) {
  const [history, setHistory] = useState([]);

  const deleteHistoryLog = (id) => {
    triggerModal("Delete Audit Record", "Delete this system log permanently? This overrides compliance tracking.", "confirm", async () => {
      try {
        await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
        setHistory(history.filter(h => h.id !== id));
        closeModal();
      } catch (err) {
        closeModal();
        triggerModal("Error", "Failed to delete log from database.", "error");
      }
    });
  };

  return { history, setHistory, deleteHistoryLog };
}