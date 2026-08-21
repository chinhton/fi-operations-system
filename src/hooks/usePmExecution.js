import { useState } from 'react';

export default function usePmExecution(assets, setAssets, history, setHistory, currentUser, triggerModal) {
  const [isPmModalOpen, setIsPmModalOpen] = useState(false);
  const [selectedPmAsset, setSelectedPmAsset] = useState(null);
  const [selectedPmTemplate, setSelectedPmTemplate] = useState("");
  const [pmAnswers, setPmAnswers] = useState({});
  const [pmComments, setPmComments] = useState("");
  const [pmStatusState, setPmStatusState] = useState("Operational");
  const [isSubmittingPm, setIsSubmittingPm] = useState(false);

  const openPmModal = (asset, templateToAutoSelect = null) => {
    setSelectedPmAsset(asset);
    setSelectedPmTemplate(templateToAutoSelect || ""); // Auto-selects if provided, otherwise leaves blank
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
      
      // If any answer was marked OFFLINE, force the status to Corrective Maintenance
      const hasOfflineAnswers = Object.values(pmAnswers).some(val => val === 'OFFLINE');
      const finalStatus = hasOfflineAnswers ? "Corrective Maintenance" : pmStatusState;
      updatedAsset.status = finalStatus;

      // --- EXPLICIT WINDOW.FETCH FOR INTERCEPTOR ---
      await window.fetch('/api/assets', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(updatedAsset) 
      });

      // --- UNIFIED AUDIT LOG SCHEMA TO MATCH MASTER ROUTES ---
      const historyPayload = {
        id: `AUDIT-${Date.now().toString().slice(-4)}`,
        assetId: selectedPmAsset.id, 
        assetName: selectedPmAsset.name, 
        assetSerial: selectedPmAsset.serial,
        actionType: 'Preventative Maintenance', 
        templateName: selectedPmTemplate.name, 
        interval: selectedPmTemplate.interval,
        performedBy: currentUser?.name || "System Operator", 
        performedByEmail: currentUser?.email || "",          
        date: todayStr,                                      
        timestamp: exactTimestamp,                           
        status: finalStatus, 
        comments: pmComments, 
        responses: pmAnswers 
      };
      
      await window.fetch('/api/history', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(historyPayload) 
      });

      // --- THE FIX: DYNAMIC CORRECTIVE ACTION SPAWNING ---
      if (finalStatus === "Corrective Maintenance" || finalStatus === "Out of Calibration") {
        const newWorkOrder = {
          id: `WO-${Date.now()}`,
          title: `AUTO-FLAG: ${finalStatus} - ${selectedPmAsset.name}`,
          description: `Automatically generated from failed PM execution.\n\nSOP: ${selectedPmTemplate.name}\nNotes: ${pmComments}`,
          status: "Open",
          priority: "High",
          category: "Corrective",
          assetId: selectedPmAsset.id,
          assetName: selectedPmAsset.name,
          assignedTo: selectedPmAsset.operatorEmail || "Unassigned",
          createdBy: currentUser?.email || "System",
          dateCreated: todayStr,
          dueDate: new Date(Date.now() + 86400000 * 3).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) // Due in 3 days
        };

        await window.fetch('/api/workorders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newWorkOrder)
        });
      }

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

  return { 
      isPmModalOpen, selectedPmAsset, selectedPmTemplate, setSelectedPmTemplate, 
      pmAnswers, setPmAnswers, pmStatusState, setPmStatusState, pmComments, 
      setPmComments, isSubmittingPm, openPmModal, closePmModal, handlePmSubmit 
  };
}