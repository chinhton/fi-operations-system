import { useState } from 'react';

const calculateNextDueDate = (dateStr, frequency) => {
  const lastDate = dateStr ? new Date(dateStr) : new Date();
  const nextDate = new Date(lastDate);

  switch (frequency) {
    case "Daily": nextDate.setDate(lastDate.getDate() + 1); break;
    case "Weekly": nextDate.setDate(lastDate.getDate() + 7); break;
    case "Monthly": nextDate.setMonth(lastDate.getMonth() + 1); break;
    case "Quarterly": nextDate.setMonth(lastDate.getMonth() + 3); break;
    case "Semi-Annually":
    case "Calibration (Semi-Annual)": nextDate.setMonth(lastDate.getMonth() + 6); break;
    case "Annually":
    case "Calibration (Annual)": nextDate.setFullYear(lastDate.getFullYear() + 1); break;
    case "2-Year": nextDate.setFullYear(lastDate.getFullYear() + 2); break;
    case "3-Year": nextDate.setFullYear(lastDate.getFullYear() + 3); break;
    case "4-Year": nextDate.setFullYear(lastDate.getFullYear() + 4); break;
    case "5-Year": nextDate.setFullYear(lastDate.getFullYear() + 5); break;
    default: return null;
  }
  return nextDate.toISOString().split('T')[0];
};

export default function useWorkOrders(currentUser, users, assets, triggerModal, closeModal, setHistory) {
  const [workOrders, setWorkOrders] = useState([]);
  const [isSubmittingWo, setIsSubmittingWo] = useState(false);
  const [newWo, setNewWo] = useState({
    title: "", description: "", assetId: "", assignedTo: "", priority: "",
    department: "", frequency: "", dueDate: "", remindersEnabled: true
  });

  const handleAddWorkOrder = async (e) => {
    e.preventDefault();
    if (isSubmittingWo) return;
    
    if (!newWo.title.trim() || !newWo.assignedTo || !newWo.priority) {
      triggerModal("Input Required", "Title, Assigned Operator, and Priority Level are strictly required fields.", "info");
      return;
    }

    setIsSubmittingWo(true);
    try {
      const created = {
        id: `WO-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
        ...newWo,
        department: newWo.department || currentUser?.department || "",
        status: "Open",
        createdBy: currentUser.name,
        creatorEmail: currentUser.email,
        timestamp: new Date().toISOString()
      };

      const res = await fetch('/api/workorders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(created) });
      if (res.ok) {
        const savedWo = await res.json();
        setWorkOrders([savedWo, ...workOrders]);
        setNewWo({
          title: "", description: "", assetId: "", assignedTo: "", priority: "",
          department: "", frequency: "", dueDate: "", remindersEnabled: true
        });
        triggerModal("Work Order Dispatched", `Task successfully assigned and queued for operator action.`, "success");

        const assignedUser = users.find(u => u.email === newWo.assignedTo);
        const assignedName = assignedUser ? assignedUser.name : 'Technician';
        const mailingList = Array.from(new Set([newWo.assignedTo, currentUser.email])).filter(Boolean).join(',');

        try {
          await fetch('/api/sendEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: mailingList,
              subject: `New Work Order Assigned: ${newWo.title} - FI Operations System`,
              body: `Hello,\n\nA new work order has been created and assigned in the Fairchild Imaging Operations System.\n\nTicket: ${newWo.title}\nAssigned To: ${assignedName}\nPriority: ${newWo.priority}`
            }),
          });
        } catch (err) { console.error(err); }
      }
    } finally { setIsSubmittingWo(false); }
  };

  const handleUpdateWoStatus = async (woId, newStatus) => {
    const targetWo = workOrders.find(w => w.id === woId);
    if (!targetWo) return;

    const isRecurringCompletion = newStatus === "Completed" && targetWo.frequency && targetWo.frequency !== "One-Time";

    const updatedWo = isRecurringCompletion
      ? { ...targetWo, status: "Open", dueDate: calculateNextDueDate(targetWo.dueDate, targetWo.frequency) }
      : { ...targetWo, status: newStatus };

    setWorkOrders(workOrders.map(w => w.id === woId ? updatedWo : w));

    try {
      await fetch('/api/workorders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedWo) });

      if (newStatus === "Completed") {
        const logEntry = {
          id: `LOG-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toLocaleString(),
          assetId: targetWo.assetId || "FACILITY-GEN",
          assetName: targetWo.assetId ? (assets.find(a=>a.id === targetWo.assetId)?.name || "Unknown") : "General Facility Area",
          templateName: `Ad-Hoc Work Order: ${targetWo.title}`,
          interval: targetWo.frequency || "On-Demand",
          technician: currentUser.name,
          email: currentUser.email,
          status: "Completed Pass",
          comments: targetWo.description || "Work order marked resolved by technician."
        };
        const logRes = await fetch('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logEntry) });
        if (logRes.ok) {
          const savedLog = await logRes.json();
          setHistory(prev => [savedLog, ...prev]);
        }
      }
    } catch (err) { console.error(err); }
  };

  const deleteWorkOrder = (id) => {
    triggerModal("Confirm Deletion", "Are you sure you want to permanently delete this dispatch ticket?", "confirm", async () => {
      try {
        const res = await fetch(`/api/workorders?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          setWorkOrders(workOrders.filter(w => w.id !== id));
          closeModal();
        }
      } catch (err) { triggerModal("Error", "Network error.", "error"); }
    });
  };

  return { workOrders, setWorkOrders, isSubmittingWo, newWo, setNewWo, handleAddWorkOrder, handleUpdateWoStatus, deleteWorkOrder };
}