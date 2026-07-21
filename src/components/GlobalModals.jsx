import React, { useEffect } from 'react';
import HardwareVendorModal from './HardwareVendorModal';
import PmExecutionModal from './PmExecutionModal';
import GlobalAlertModal from './GlobalAlertModal';

export default function GlobalModals({
  // Hardware Vendor Modal Props
  showAssetModal, activeAssetDetails, setShowAssetModal,
  newPart, setNewPart, addPart, removePart,
  newVendor, setNewVendor, addVendor, removeVendor,
  
  // PM Execution Modal Props
  isPmModalOpen, closePmModal, handlePmSubmit,
  selectedPmAsset, selectedPmTemplate, setSelectedPmTemplate,
  pmTemplates, pmAnswers, setPmAnswers, pmStatusState,
  setPmStatusState, pmComments, setPmComments, isSubmittingPm,
  
  // Global Alert Modal Props
  customModal, closeModal
}) {

  // --- GLOBAL ENTER KEY LISTENER ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger if the Global Alert Modal is currently on the screen
      if (customModal.show && e.key === 'Enter') {
        e.preventDefault(); // Prevent accidental background form submissions
        
        // If it's a confirmation modal, run the confirm action. Otherwise, just close it.
        if (customModal.onConfirm) {
          customModal.onConfirm();
        } else {
          closeModal();
        }
      }
    };

    // Attach the listener to the whole window
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up the listener when the modal closes
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [customModal, closeModal]);
  // ---------------------------------

  return (
    <>
      {showAssetModal && activeAssetDetails && (
        <HardwareVendorModal 
          show={showAssetModal} activeAssetDetails={activeAssetDetails} onClose={() => setShowAssetModal(false)}
          newPart={newPart} setNewPart={setNewPart} addPart={addPart} removePart={removePart}
          newVendor={newVendor} setNewVendor={setNewVendor} addVendor={addVendor} removeVendor={removeVendor}
        />
      )}
      
      <PmExecutionModal 
        isPmModalOpen={isPmModalOpen} closePmModal={closePmModal} handlePmSubmit={handlePmSubmit}
        selectedPmAsset={selectedPmAsset} selectedPmTemplate={selectedPmTemplate} 
        setSelectedPmTemplate={setSelectedPmTemplate} pmTemplates={pmTemplates} pmAnswers={pmAnswers} 
        setPmAnswers={setPmAnswers} pmStatusState={pmStatusState} setPmStatusState={setPmStatusState} 
        pmComments={pmComments} setPmComments={setPmComments} isSubmittingPm={isSubmittingPm}
      />

      <GlobalAlertModal 
        show={customModal.show} title={customModal.title} message={customModal.message} 
        type={customModal.type} onConfirm={customModal.onConfirm} onClose={closeModal} 
      />
    </>
  );
}