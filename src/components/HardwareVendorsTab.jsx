import React from 'react';

export default function HardwareVendorsTab({ assets }) {
  return (
    <div className="space-y-8 animate-entrance w-full">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#1A2530] text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between">
          <h3 className="font-bold text-sm tracking-wide uppercase">Hardware & Vendor Directory</h3>
        </div>
        
        <div className="p-16 text-center bg-gray-50/50">
          <span className="text-4xl mb-4 block">🔩</span>
          <h4 className="text-gray-800 font-black text-lg">Vendor Management Module</h4>
          <p className="text-xs text-gray-500 mt-2 max-w-md mx-auto">
            This dedicated module is being initialized to map specific replacement parts, service contracts, and vendor contacts to your {assets.length} registered systems.
          </p>
        </div>
      </div>
    </div>
  );
}