import React from 'react';
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