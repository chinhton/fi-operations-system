import { useState } from 'react';

export default function useModals() {
  const [customModal, setCustomModal] = useState({ 
    show: false, 
    title: "", 
    message: "", 
    type: "info", 
    onConfirm: null 
  });

  const triggerModal = (title, message, type = "info", onConfirm = null) => {
    setCustomModal({ show: true, title, message, type, onConfirm });
  };

  const closeModal = () => {
    setCustomModal({ show: false, title: "", message: "", type: "info", onConfirm: null });
  };

  return { customModal, triggerModal, closeModal };
}