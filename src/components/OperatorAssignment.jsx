import React, { useState } from 'react';

export default function OperatorAssignment() {
  const [selectedOperator, setSelectedOperator] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Mock data - replace with your actual API fetch later if needed
  const operators = [
    { id: 1, name: 'Alice Smith', email: 'alice@fairchildimaging.com' },
    { id: 2, name: 'Bob Jones', email: 'bob@fairchildimaging.com' }
  ];

  const handleAssign = async () => {
    if (!selectedOperator) {
      setStatusMessage('Please select an operator first.');
      return;
    }

    setIsSending(true);
    setStatusMessage('Assigning and sending email...');

    try {
      // Calling your Azure Static Web Apps backend endpoint
      const response = await fetch('/api/sendEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedOperator,
          subject: 'New Task Assignment',
          body: 'You have been assigned a new task in the operations system. Please log in to view the details.'
        }),
      });

      if (response.ok) {
        setStatusMessage('Success: Operator assigned and notified!');
      } else {
        const errorData = await response.json();
        setStatusMessage(`Error: ${errorData.error || 'Failed to send email'}`);
      }
    } catch (error) {
      console.error('Email trigger error:', error);
      setStatusMessage('System Error: Could not connect to the email service.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm max-w-md">
      <h2 className="text-lg font-bold mb-4">Assign Operator</h2>
      
      <select 
        className="block w-full p-2 mb-4 border rounded"
        value={selectedOperator}
        onChange={(e) => setSelectedOperator(e.target.value)}
        disabled={isSending}
      >
        <option value="">-- Select an Operator --</option>
        {operators.map((op) => (
          <option key={op.id} value={op.email}>
            {op.name}
          </option>
        ))}
      </select>

      <button 
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        onClick={handleAssign}
        disabled={isSending}
      >
        {isSending ? 'Sending...' : 'Assign & Notify'}
      </button>

      {statusMessage && (
        <p className="mt-4 text-sm font-medium text-gray-700">
          {statusMessage}
        </p>
      )}
    </div>
  );
}