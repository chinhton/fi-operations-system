import { useState } from 'react';

export default function usePmExecution(assets, setAssets, history, setHistory, currentUser, triggerModal) {
  const [isPmModalOpen, setIsPmModalOpen] = useState(false);
  const [selectedPmAsset, setSelectedPmAsset] = useState(null);
  const [selectedPmTemplate, setSelectedPmTemplate] = useState("");
  const [pmAnswers, setPmAnswers] = useState({});
  const [pmComments, setPmComments] = useState("");
  const [pmStatusState, setPmStatusState] = useState("Operational");
  const [isSubmittingPm, setIsSubmittingPm] = useState(false);

  const openPmModal = (asset) => {
    setSelectedPmAsset(asset);
    setSelectedPmTemplate("");
    setPmAnswers({});
    setPmComments("");
    setPmStatusState("Operational");
    setIsPmModalOpen(true);
  };

  const closePmModal = () => {
    setIsPmModalOpen(false);
    setSelectedPmAsset(null);
  };

  const handlePmSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPmTemplate) { triggerModal("Error", "Please select a PM Protocol SOP.", "info"); return; }
    setIsSubmittingPm(true);

    try {
      const updatedAsset = { ...selectedPmAsset };
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const exactTimestamp = new Date().toLocaleString('en-US');
      
      if (!updatedAsset.pmDates) updatedAsset.pmDates = {};
      updatedAsset.pmDates[selectedPmTemplate.interval] = todayStr;
      updatedAsset.status = pmStatusState;

      // --- COSMOS DB CONNECTION ---
      await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) });

      const historyPayload = {
        id: `AUDIT-${Date.now().toString().slice(-4)}`,
        assetId: selectedPmAsset.id, 
        assetName: selectedPmAsset.name, 
        assetSerial: selectedPmAsset.serial,
        templateName: selectedPmTemplate.name, 
        interval: selectedPmTemplate.interval,
        technician: currentUser?.name || "System Operator",
        email: currentUser?.email || "",
        timestamp: exactTimestamp, 
        status: pmStatusState, 
        comments: pmComments, 
        responses: pmAnswers 
      };
      
      await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(historyPayload) });

      // --- REDUNDANT FRONTEND WEBHOOK STRIPPED OUT HERE ---

      setAssets(assets.map(a => a.id === selectedPmAsset.id ? updatedAsset : a));
      setHistory([historyPayload, ...history]);
      triggerModal("Protocol Logged", "Preventative Maintenance successfully recorded.", "success");
      closePmModal();
      
    } catch (err) { 
        triggerModal("Database Error", "Failed to commit PM action.", "error"); 
    } finally { 
        setIsSubmittingPm(false); 
    }
  };

  return { isPmModalOpen, selectedPmAsset, selectedPmTemplate, setSelectedPmTemplate, pmAnswers, setPmAnswers, pmStatusState, setPmStatusState, pmComments, setPmComments, isSubmittingPm, openPmModal, closePmModal, handlePmSubmit };
}