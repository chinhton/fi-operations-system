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
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      if (!updatedAsset.pmDates) updatedAsset.pmDates = {};
      updatedAsset.pmDates[selectedPmTemplate.interval] = today;
      updatedAsset.status = pmStatusState;

      // --- COSMOS DB CONNECTION ---
      await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedAsset) });

      const historyPayload = {
        id: `AUDIT-${Date.now().toString().slice(-4)}`,
        assetId: selectedPmAsset.id, assetName: selectedPmAsset.name, assetSerial: selectedPmAsset.serial,
        templateName: selectedPmTemplate.name, interval: selectedPmTemplate.interval,
        executedBy: currentUser?.name || "System Operator",
        date: today, status: pmStatusState, comments: pmComments, answers: pmAnswers 
      };
      
      await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(historyPayload) });

      // --- SENDEMAIL.JS CONNECTION ---
      const notifyEmails = [selectedPmTemplate.managerEmail, selectedPmTemplate.operatorEmail].filter(Boolean);
      if (notifyEmails.length > 0) {
         const mailList = Array.from(new Set(notifyEmails)).join(',');
         fetch('/api/sendEmail', {
           method: 'POST', headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             to: mailList,
             subject: `PM Executed: ${selectedPmTemplate.name} completed for ${selectedPmAsset.name}`,
             body: `Hello,\n\nThe following maintenance protocol has been executed in the FI Operations System.\n\nAsset: ${selectedPmAsset.name}\nProtocol: ${selectedPmTemplate.name}\nCycle: ${selectedPmTemplate.interval}\nExecuted By: ${currentUser?.name}\nStatus: ${pmStatusState}\nNotes: ${pmComments || 'No additional comments.'}`
           })
         }).catch(() => console.log("Silent Email Dispatch Failed"));
      }

      setAssets(assets.map(a => a.id === selectedPmAsset.id ? updatedAsset : a));
      setHistory([historyPayload, ...history]);
      triggerModal("Protocol Logged", "Preventative Maintenance successfully recorded and routed.", "success");
      closePmModal();
    } catch (err) { triggerModal("Database Error", "Failed to commit PM action.", "error"); } 
    finally { setIsSubmittingPm(false); }
  };

  return { isPmModalOpen, selectedPmAsset, selectedPmTemplate, setSelectedPmTemplate, pmAnswers, setPmAnswers, pmStatusState, setPmStatusState, pmComments, setPmComments, isSubmittingPm, openPmModal, closePmModal, handlePmSubmit };
}