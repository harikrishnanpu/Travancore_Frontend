// src/components/PrintOptionsModal.jsx
import React from 'react';

export default function PrintOptionsModal({ onClose, onThermalPrint, onNormalPrint }) {
  return (
    <div className='fixed inset-0 flex items-center justify-center z-50 bg-gray-800 bg-opacity-50'>
      <div className='bg-white p-6 rounded-lg shadow-lg w-80'>
        <h2 className='text-sm font-bold mb-4'>Print Options</h2>
        <button
          onClick={onThermalPrint}
          className='w-full bg-red-500 text-xs font-bold text-white py-2 px-4 rounded-lg mb-3 hover:bg-red-600'
        >
          Thermal Print
        </button>
        <button
          onClick={onNormalPrint}
          className='w-full bg-red-500 text-xs font-bold text-white py-2 px-4 rounded-lg hover:bg-red-600'
        >
          Normal Print
        </button>
        <button
          onClick={onClose}
          className='mt-4 w-full bg-gray-300 text-xs text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400'
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
