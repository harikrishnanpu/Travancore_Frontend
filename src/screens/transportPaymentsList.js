// src/components/TransportPaymentList.js

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import api from './api'; // Ensure this is correctly set up to handle API requests
import { useSelector } from 'react-redux';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import debounce from 'lodash.debounce'; // For debouncing search input

const TransportPaymentList = () => {
  const navigate = useNavigate();
  const [transportPayments, setTransportPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // States for sidebar filtering and sorting
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [billAmountMin, setBillAmountMin] = useState('');
  const [billAmountMax, setBillAmountMax] = useState('');
  const [paymentAmountMin, setPaymentAmountMin] = useState('');
  const [paymentAmountMax, setPaymentAmountMax] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // Sidebar search state
  const [sidebarSearch, setSidebarSearch] = useState('');
  // States for filtering and sorting in modals
const [billingSearchQuery, setBillingSearchQuery] = useState('');
const [billingDateFrom, setBillingDateFrom] = useState('');
const [billingDateTo, setBillingDateTo] = useState('');
const [billingAmountMin, setBillingAmountMin] = useState('');
const [billingAmountMax, setBillingAmountMax] = useState('');
const [billingSortConfig, setBillingSortConfig] = useState({ key: '', direction: 'asc' });

const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
const [paymentDateFrom, setPaymentDateFrom] = useState('');
const [paymentDateTo, setPaymentDateTo] = useState('');
const [paymentAmountMinView, setPaymentAmountMinView] = useState('');
const [paymentAmountMaxView, setPaymentAmountMaxView] = useState('');
const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
const [paymentSortConfig, setPaymentSortConfig] = useState({ key: '', direction: 'asc' });

// Handlers for sorting
const handleBillingSort = (key) => {
  const direction = billingSortConfig.key === key && billingSortConfig.direction === 'asc' ? 'desc' : 'asc';
  setBillingSortConfig({ key, direction });
};

const handlePaymentSort = (key) => {
  const direction = paymentSortConfig.key === key && paymentSortConfig.direction === 'asc' ? 'desc' : 'asc';
  setPaymentSortConfig({ key, direction });
};

// Placeholder data for filteredBillings and filteredPayments
const filteredBillings = selectedPayment?.billings || [];
const filteredPayments = selectedPayment?.payments || [];


  // State for selected transport payments for total calculations
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);

  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  // Fetch all transport payments
  const fetchTransportPayments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/transportpayments/all');
      setTransportPayments(response.data);

      // Load selected payments from localStorage or select all by default
      const storedSelection = localStorage.getItem('selectedTransportPaymentIds');
      if (storedSelection) {
        setSelectedPaymentIds(JSON.parse(storedSelection));
      } else {
        const allIds = response.data.map((payment) => payment._id);
        setSelectedPaymentIds(allIds);
        localStorage.setItem('selectedTransportPaymentIds', JSON.stringify(allIds));
      }
    } catch (err) {
      setError('Failed to fetch transport payments.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportPayments();
  }, []);

  // Debounced sidebar search handler
  const debouncedSidebarSearch = useCallback(
    debounce((query) => {
      setSidebarSearch(query);
      setCurrentPage(1);
    }, 300),
    []
  );

  const handleSidebarSearchChange = (e) => {
    debouncedSidebarSearch(e.target.value);
  };

  // Filter transport payments based on sidebar search and selected IDs
  const filteredTransportPayments = useMemo(() => {
    let temp = transportPayments.filter(
      (payment) =>
        selectedPaymentIds.includes(payment._id) &&
        (payment.transportName.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
          payment.transportType.toLowerCase().includes(sidebarSearch.toLowerCase()))
    );

    // Payment Status Filter
    if (paymentStatusFilter === 'Completed') {
      temp = temp.filter((payment) => payment.paymentRemaining === 0);
    } else if (paymentStatusFilter === 'Pending') {
      temp = temp.filter((payment) => payment.paymentRemaining > 0);
    }

    // Bill Amount Range Filter
    if (billAmountMin !== '') {
      temp = temp.filter((payment) => payment.totalAmountBilled >= parseFloat(billAmountMin));
    }
    if (billAmountMax !== '') {
      temp = temp.filter((payment) => payment.totalAmountBilled <= parseFloat(billAmountMax));
    }

    // Payment Amount Range Filter
    if (paymentAmountMin !== '') {
      temp = temp.filter((payment) => payment.totalAmountPaid >= parseFloat(paymentAmountMin));
    }
    if (paymentAmountMax !== '') {
      temp = temp.filter((payment) => payment.totalAmountPaid <= parseFloat(paymentAmountMax));
    }

    // Sorting
    temp.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // If sorting by createdAt, convert to Date
      if (sortField === 'createdAt') {
        valA = new Date(valA);
        valB = new Date(valB);
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return temp;
  }, [
    transportPayments,
    selectedPaymentIds,
    sidebarSearch,
    paymentStatusFilter,
    billAmountMin,
    billAmountMax,
    paymentAmountMin,
    paymentAmountMax,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredTransportPayments.length / itemsPerPage);
  const paginatedTransportPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransportPayments.slice(start, start + itemsPerPage);
  }, [filteredTransportPayments, currentPage, itemsPerPage]);

  // Calculate Totals
  const totalBilled = useMemo(
    () => filteredTransportPayments.reduce((acc, payment) => acc + payment.totalAmountBilled, 0),
    [filteredTransportPayments]
  );
  const totalPaid = useMemo(
    () => filteredTransportPayments.reduce((acc, payment) => acc + payment.totalAmountPaid, 0),
    [filteredTransportPayments]
  );
  const totalPending = useMemo(
    () => filteredTransportPayments.reduce((acc, payment) => acc + payment.paymentRemaining, 0),
    [filteredTransportPayments]
  );

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  

  // PDF Generation
  const generatePDF = (payment) => {
    setPdfLoading(true);
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Transport Payment Statement', 14, 22);
    doc.setFontSize(12);
    doc.text(`Transport Name: ${payment.transportName}`, 14, 32);
    doc.text(`Transport Type: ${payment.transportType}`, 14, 40);
    doc.text(`Total Amount Billed: ₹${payment.totalAmountBilled.toFixed(2)}`, 14, 48);
    doc.text(`Total Amount Paid: ₹${payment.totalAmountPaid.toFixed(2)}`, 14, 56);
    doc.text(`Payment Remaining: ₹${payment.paymentRemaining.toFixed(2)}`, 14, 64);
    doc.text(`Created At: ${new Date(payment.createdAt).toLocaleDateString()}`, 14, 72);

    // Billings Section
    doc.setFontSize(14);
    doc.text('Billings', 14, 86);
    const billingsData = payment.billings.map((billing, index) => [
      index + 1,
      billing.billId,
      billing.invoiceNo,
      `₹${billing.amount.toFixed(2)}`,
      new Date(billing.date).toLocaleDateString(),
    ]);

    doc.autoTable({
      startY: 90,
      head: [['#', 'Bill ID', 'Invoice No.', 'Amount', 'Date']],
      body: billingsData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 0, 0] },
    });

    // Payments Section
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Payments', 14, finalY);
    const paymentsData = payment.payments.map((paymentItem, index) => [
      index + 1,
      `₹${paymentItem.amount.toFixed(2)}`,
      paymentItem.method,
      paymentItem.submittedBy,
      paymentItem.remark || '-',
      new Date(paymentItem.date).toLocaleDateString(),
    ]);

    doc.autoTable({
      startY: finalY + 5,
      head: [['#', 'Amount', 'Method', 'Submitted By', 'Remark', 'Date']],
      body: paymentsData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 0, 0] },
    });

    // Open PDF in new tab
    const pdfBlobUrl = doc.output('bloburl');
    window.open(pdfBlobUrl, '_blank', 'width=800,height=600');

    setPdfLoading(false);
  };

  // Handle Removing a Transport Payment
  const handleRemove = async (id) => {
    if (window.confirm('Are you sure you want to delete this transport payment record?')) {
      try {
        await api.delete(`/api/transportpayments/${id}/delete`);
        alert('Transport payment record deleted successfully.');
        setTransportPayments(transportPayments.filter((payment) => payment._id !== id));

        // Also remove from selectedPaymentIds if present
        setSelectedPaymentIds(selectedPaymentIds.filter((paymentId) => paymentId !== id));
        localStorage.setItem('selectedTransportPaymentIds', JSON.stringify(selectedPaymentIds.filter((paymentId) => paymentId !== id)));
      } catch (error) {
        setError('Error occurred while deleting the transport payment record.');
        console.error(error);
      }
    }
  };

  // Handle Viewing Payment Details
  const handleView = (payment) => {
    // Reset view modal filters
    setBillingSearchQuery('');
    setBillingDateFrom('');
    setBillingDateTo('');
    setBillingAmountMin('');
    setBillingAmountMax('');
    setBillingSortConfig({ key: '', direction: 'asc' });

    setPaymentSearchQuery('');
    setPaymentDateFrom('');
    setPaymentDateTo('');
    setPaymentAmountMinView('');
    setPaymentAmountMaxView('');
    setPaymentMethodFilter('');
    setPaymentSortConfig({ key: '', direction: 'asc' });

    setSelectedPayment(payment);
  };

  const closeModal = () => {
    setSelectedPayment(null);
  };

  // Skeleton Loading
  const renderSkeleton = () => {
    const skeletonRows = Array.from({ length: itemsPerPage }, (_, index) => index);
    return (
      <div className="w-full">
        {/* Desktop Table Skeleton */}
        <div className="hidden md:block">
          <table className="w-full text-xs text-gray-500 bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-200">
              <tr className="divide-y">
                <th className="px-4 py-2 text-left">Transport Name</th>
                <th className="px-2 py-2">Transport Type</th>
                <th className="px-2 py-2">Total Billed (₹)</th>
                <th className="px-2 py-2">Total Paid (₹)</th>
                <th className="px-2 py-2">Payment Remaining (₹)</th>
                <th className="px-2 py-2">Created At</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {skeletonRows.map((row) => (
                <tr key={row} className="hover:bg-gray-100 divide-y divide-x">
                  <td className="px-4 py-2">
                    <Skeleton height={10} />
                  </td>
                  <td className="px-2 py-2">
                    <Skeleton height={10} />
                  </td>
                  <td className="px-2 py-2">
                    <Skeleton height={10} />
                  </td>
                  <td className="px-2 py-2">
                    <Skeleton height={10} />
                  </td>
                  <td className="px-2 py-2">
                    <Skeleton height={10} />
                  </td>
                  <td className="px-2 py-2">
                    <Skeleton height={10} />
                  </td>
                  <td className="px-2 py-2">
                    <Skeleton height={10} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Skeleton */}
        <div className="md:hidden flex flex-col space-y-4">
          {skeletonRows.map((row) => (
            <div key={row} className="bg-white p-4 rounded shadow">
              <Skeleton height={10} width={`60%`} className="mb-2" />
              <Skeleton height={10} width={`80%`} className="mb-2" />
              <Skeleton height={10} width={`40%`} className="mb-2" />
              <Skeleton height={10} width={`90%`} className="mb-2" />
              <Skeleton height={10} width={`50%`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Sorting Handler
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortField === key && sortDirection === 'asc') {
      direction = 'desc';
    }
    setSortField(key);
    setSortDirection(direction);
  };

  // Calculate Totals Based on Selected Payments
  const totalBilledSelected = useMemo(
    () => transportPayments
      .filter((payment) => selectedPaymentIds.includes(payment._id))
      .reduce((sum, payment) => sum + payment.totalAmountBilled, 0),
    [transportPayments, selectedPaymentIds]
  );
  const totalPaidSelected = useMemo(
    () => transportPayments
      .filter((payment) => selectedPaymentIds.includes(payment._id))
      .reduce((sum, payment) => sum + payment.totalAmountPaid, 0),
    [transportPayments, selectedPaymentIds]
  );
  const totalPendingSelected = useMemo(
    () => transportPayments
      .filter((payment) => selectedPaymentIds.includes(payment._id))
      .reduce((sum, payment) => sum + payment.paymentRemaining, 0),
    [transportPayments, selectedPaymentIds]
  );

  // Selection Modal Handlers
  const toggleSelection = (id) => {
    let updatedSelections;
    if (selectedPaymentIds.includes(id)) {
      updatedSelections = selectedPaymentIds.filter((paymentId) => paymentId !== id);
    } else {
      updatedSelections = [...selectedPaymentIds, id];
    }
    setSelectedPaymentIds(updatedSelections);
    localStorage.setItem('selectedTransportPaymentIds', JSON.stringify(updatedSelections));
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Sidebar for Filters */}
      <div
        className={`fixed inset-y-0 left-0 transform ${
          isSelectionModalOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:inset-auto md:w-1/4 lg:w-1/5 bg-white p-4 shadow-md transition-transform duration-300 ease-in-out z-50`}
      >
        <h2 onClick={()=>  setIsSelectionModalOpen(false)} className="text-xs font-bold text-red-600 mb-4 text-center">Filter Transport Payments</h2>

        {/* Search in Sidebar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search Transport Name/Type"
            onChange={handleSidebarSearchChange}
            className="border text-xs p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        {/* Select Transport Payments */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Select Payments</h3>
          <div className="max-h-60 overflow-auto border p-2 rounded">
            {transportPayments
              .filter(
                (payment) =>
                  payment.transportName.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                  payment.transportType.toLowerCase().includes(sidebarSearch.toLowerCase())
              )
              .map((payment) => (
                <div key={payment._id} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={selectedPaymentIds.includes(payment._id)}
                    onChange={() => toggleSelection(payment._id)}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-700">
                    {payment.transportName} - {payment.transportType}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Payment Status Filter */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Payment Status</h3>
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="border text-xs p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        {/* Bill Amount Range Filter */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Bill Amount Range (₹)</h3>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={billAmountMin}
              onChange={(e) => setBillAmountMin(e.target.value)}
              className="border text-xs p-2 rounded w-1/2"
              min="0"
            />
            <input
              type="number"
              placeholder="Max"
              value={billAmountMax}
              onChange={(e) => setBillAmountMax(e.target.value)}
              className="border text-xs p-2 rounded w-1/2"
              min="0"
            />
          </div>
        </div>

        {/* Payment Amount Range Filter */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Payment Amount Range (₹)</h3>
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={paymentAmountMin}
              onChange={(e) => setPaymentAmountMin(e.target.value)}
              className="border text-xs p-2 rounded w-1/2"
              min="0"
            />
            <input
              type="number"
              placeholder="Max"
              value={paymentAmountMax}
              onChange={(e) => setPaymentAmountMax(e.target.value)}
              className="border text-xs p-2 rounded w-1/2"
              min="0"
            />
          </div>
        </div>

        {/* Sorting Options */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Sort By</h3>
          <div className="flex space-x-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="border text-xs p-2 rounded w-1/2 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="createdAt">Created At</option>
              <option value="transportName">Transport Name</option>
              <option value="transportType">Transport Type</option>
              <option value="totalAmountBilled">Total Billed</option>
              <option value="totalAmountPaid">Total Paid</option>
              <option value="paymentRemaining">Payment Remaining</option>
            </select>
            <select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value)}
              className="border text-xs p-2 rounded w-1/2 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>

        {/* Apply Filters Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {}}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-xs font-bold w-full"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Overlay for Mobile Sidebar */}
      {false && ( /* You can add state to handle mobile sidebar if needed */
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => {}}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 relative">
          <div onClick={() => navigate('/')} className="text-center cursor-pointer">
            <h2 className="text-xs font-bold text-red-600">Travancore Backers</h2>
            <p className="text-gray-400 text-xs font-bold">
              All Transport Payments Information and Transactions
            </p>
          </div>
          {/* Toggle Sidebar Button for Mobile */}
          {/* Add a button here if you implement mobile sidebar toggling */}
          <button
            className="md:hidden text-gray-600 hover:text-gray-800"
            onClick={() => setIsSelectionModalOpen(true)}
            aria-label="Open Filters"
          >
            <i className="fa fa-filter text-lg"></i>
          </button>
        </div>

        {/* Totals */}
        <div className="flex justify-between items-center shadow-md rounded-lg p-4 mb-4 text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-green-600 font-semibold">Total Billed:</span>
              <span className="text-gray-700">₹{totalBilled.toFixed(2)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-600 font-semibold">Total Paid:</span>
              <span className="text-gray-700">₹{totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-red-600 font-semibold">Total Pending:</span>
              <span className="text-gray-700">₹{totalPending.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* PDF Loading Spinner */}
        {pdfLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="flex flex-col items-center">
              <i className="fa fa-spinner fa-spin text-white text-4xl mb-4"></i>
              <p className="text-white text-xs">Generating PDF...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="text-red-500 text-center mb-4 text-xs">{error}</p>
        )}

        {/* Loading Skeletons or Transport Payments */}
        {loading ? (
          renderSkeleton()
        ) : (
          <>
            {filteredTransportPayments.length === 0 ? (
              <p className="text-center text-gray-500 text-xs">
                No transport payment records available.
              </p>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <table className="w-full text-xs text-gray-500 bg-white shadow-md rounded-lg overflow-hidden">
                    <thead className="bg-red-600 text-xs text-white">
                      <tr className="divide-y">
                        <th
                          className="px-4 py-2 text-left cursor-pointer select-none"
                          onClick={() => handleSort('transportName')}
                        >
                          Transport Name
                          {sortField === 'transportName' && (
                            <i className={`fa fa-sort-${sortDirection === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                          )}
                        </th>
                        <th
                          className="px-2 py-2 cursor-pointer select-none"
                          onClick={() => handleSort('transportType')}
                        >
                          Transport Type
                          {sortField === 'transportType' && (
                            <i className={`fa fa-sort-${sortDirection === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                          )}
                        </th>
                        <th
                          className="px-2 py-2 cursor-pointer select-none"
                          onClick={() => handleSort('totalAmountBilled')}
                        >
                          Total Billed (₹)
                          {sortField === 'totalAmountBilled' && (
                            <i className={`fa fa-sort-${sortDirection === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                          )}
                        </th>
                        <th
                          className="px-2 py-2 cursor-pointer select-none"
                          onClick={() => handleSort('totalAmountPaid')}
                        >
                          Total Paid (₹)
                          {sortField === 'totalAmountPaid' && (
                            <i className={`fa fa-sort-${sortDirection === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                          )}
                        </th>
                        <th
                          className="px-2 py-2 cursor-pointer select-none"
                          onClick={() => handleSort('paymentRemaining')}
                        >
                          Payment Remaining (₹)
                          {sortField === 'paymentRemaining' && (
                            <i className={`fa fa-sort-${sortDirection === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                          )}
                        </th>
                        <th
                          className="px-2 py-2 cursor-pointer select-none"
                          onClick={() => handleSort('createdAt')}
                        >
                          Created At
                          {sortField === 'createdAt' && (
                            <i className={`fa fa-sort-${sortDirection === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                          )}
                        </th>
                        <th className="px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTransportPayments.map((payment) => (
                        <tr
                          key={payment._id}
                          className="hover:bg-gray-100 divide-y divide-x"
                        >
                          <td
                            onClick={() => navigate(`/transport-payments/edit/${payment._id}`)}
                            className="px-4 py-2 text-xs font-bold text-red-600 cursor-pointer"
                          >
                            {payment.transportName}
                          </td>
                          <td className="px-2 py-2 text-xs capitalize">
                            {payment.transportType}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            ₹{payment.totalAmountBilled.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            ₹{payment.totalAmountPaid.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            ₹{payment.paymentRemaining.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleView(payment)}
                                className="bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded hover:bg-red-600 flex items-center"
                              >
                                <i className="fa fa-eye mr-1"></i> View
                              </button>
                              <button
                                onClick={() => generatePDF(payment)}
                                className="bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded hover:bg-red-600 flex items-center"
                              >
                                <i className="fa fa-file-pdf-o mr-1"></i> Download
                              </button>
                              <button
                                onClick={() => handleRemove(payment._id)}
                                className="bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded hover:bg-red-600 flex items-center"
                              >
                                <i className="fa fa-trash mr-1"></i> Delete
                              </button>
                              <button
                                onClick={() => navigate(`/transport-payments/edit/${payment._id}`)}
                                className="bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded hover:bg-red-600 flex items-center"
                              >
                                <i className="fa fa-edit mr-1"></i> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col space-y-4">
                  {paginatedTransportPayments.map((payment) => (
                    <div key={payment._id} className="bg-white p-4 rounded shadow">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-red-600">Transport Name: {payment.transportName}</h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleView(payment)}
                            className="bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded hover:bg-red-600 flex items-center"
                          >
                            <i className="fa fa-eye mr-1"></i>
                          </button>
                          <button
                            onClick={() => generatePDF(payment)}
                            className="bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded hover:bg-red-600 flex items-center"
                          >
                            <i className="fa fa-file-pdf-o mr-1"></i>
                          </button>
                          <button
                            onClick={() => handleRemove(payment._id)}
                            className="bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded hover:bg-red-600 flex items-center"
                          >
                            <i className="fa fa-trash mr-1"></i>
                          </button>
                          <button
                            onClick={() => navigate(`/transport-payments/edit/${payment._id}`)}
                            className="bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded hover:bg-red-600 flex items-center"
                          >
                            <i className="fa fa-edit mr-1"></i>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs"><span className="font-semibold">Type: </span>{payment.transportType}</p>
                      <p className="text-xs"><span className="font-semibold">Total Billed: </span>₹{payment.totalAmountBilled.toFixed(2)}</p>
                      <p className="text-xs"><span className="font-semibold">Total Paid: </span>₹{payment.totalAmountPaid.toFixed(2)}</p>
                      <p className="text-xs"><span className="font-semibold">Payment Remaining: </span>₹{payment.paymentRemaining.toFixed(2)}</p>
                      <p className="text-xs"><span className="font-semibold">Created At: </span>{new Date(payment.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 text-xs font-bold py-2 rounded-lg ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-4 text-xs font-bold py-2 rounded-lg ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Selection Modal for Totals */}
        {/* Already handled via sidebar selection; this can be omitted or repurposed if needed */}

        {/* View Modal (Fullscreen) */}

      {/* View Modal (Fullscreen) */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
          <div className="bg-white w-full h-full p-4 sm:p-6 relative rounded-none">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={closeModal}
              aria-label="Close Modal"
            >
              &times;
            </button>

            {/* Modal Content */}
            <div className="mt-8 sm:mt-0">
              <h2 className="text-xs font-semibold text-red-600 mb-4">
                Transactions for Transport: {selectedPayment.transportName}
              </h2>

              {/* Account Summary */}
              <div className="mb-4 text-xs">
                <p>
                  <span className="font-semibold">Transport Type:</span> {selectedPayment.transportType}
                </p>
                <p>
                  <span className="font-semibold">Total Amount Billed:</span> ₹{selectedPayment.totalAmountBilled.toFixed(2)}
                </p>
                <p>
                  <span className="font-semibold">Total Amount Paid:</span> <span className="text-green-600">₹{selectedPayment.totalAmountPaid.toFixed(2)}</span>
                </p>
                <p>
                  <span className="font-semibold">Payment Remaining:</span> <span className="text-red-600">₹{selectedPayment.paymentRemaining.toFixed(2)}</span>
                </p>
                <p>
                  <span className="font-semibold">Created At:</span> {new Date(selectedPayment.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Billings Filters */}
              <h3 className="text-xs font-semibold text-red-600 mb-2">Billings</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Search Invoice No."
                  value={billingSearchQuery}
                  onChange={(e) => setBillingSearchQuery(e.target.value)}
                  className="border px-2 py-1 text-xs rounded"
                />
                <input
                  type="date"
                  placeholder="Date From"
                  value={billingDateFrom}
                  onChange={(e) => setBillingDateFrom(e.target.value)}
                  className="border px-2 py-1 text-xs rounded"
                />
                <input
                  type="date"
                  placeholder="Date To"
                  value={billingDateTo}
                  onChange={(e) => setBillingDateTo(e.target.value)}
                  className="border px-2 py-1 text-xs rounded"
                />
                <input
                  type="number"
                  placeholder="Amount Min (₹)"
                  value={billingAmountMin}
                  onChange={(e) => setBillingAmountMin(e.target.value)}
                  className="border px-2 py-1 text-xs rounded"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Amount Max (₹)"
                  value={billingAmountMax}
                  onChange={(e) => setBillingAmountMax(e.target.value)}
                  className="border px-2 py-1 text-xs rounded"
                  min="0"
                />
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="min-w-full text-xs text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handleBillingSort('billId')}
                      >
                        Bill ID
                        {billingSortConfig.key === 'billId' && (
                          <i className={`fa fa-sort-${billingSortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handleBillingSort('invoiceNo')}
                      >
                        Invoice No.
                        {billingSortConfig.key === 'invoiceNo' && (
                          <i className={`fa fa-sort-${billingSortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handleBillingSort('amount')}
                      >
                        Amount (₹)
                        {billingSortConfig.key === 'amount' && (
                          <i className={`fa fa-sort-${billingSortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handleBillingSort('date')}
                      >
                        Date
                        {billingSortConfig.key === 'date' && (
                          <i className={`fa fa-sort-${billingSortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBillings.length > 0 ? (
                      filteredBillings.map((billing, index) => (
                        <tr
                          key={index}
                          className="bg-white border-b hover:bg-gray-100"
                        >
                          <td className="px-4 py-2 text-xs">{index + 1}</td>
                          <td className="px-4 py-2 text-xs">{billing.billId}</td>
                          <td className="px-4 py-2 text-xs">{billing.invoiceNo}</td>
                          <td className="px-4 py-2 text-xs">₹{billing.amount.toFixed(2)}</td>
                          <td className="px-4 py-2 text-xs">{new Date(billing.date).toLocaleDateString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-2 text-xs text-center text-gray-500">
                          No billings match the criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Payments Filters */}
              <h3 className="text-xs font-semibold text-red-600 mb-2">Payments</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Search by Submitted By/Method/Ref ID"
                  value={paymentSearchQuery}
                  onChange={(e) => setPaymentSearchQuery(e.target.value)}
                  className="border px-2 py-1 text-xs rounded"
                />
                <input
                  type="date"
                  placeholder="Date From"
                  value={paymentDateFrom}
                  onChange={(e) => setPaymentDateFrom(e.target.value)}
                  className="border px-2 py-1 text-xs rounded"
                />
                <input
                  type="date"
                  placeholder="Date To"
                  value={paymentDateTo}
                  onChange={(e) => setPaymentDateTo(e.target.value)}
                  className="border px-2 py-1 text-xs rounded"
                />
                <input
                  type="number"
                  placeholder="Amount Min (₹)"
                  value={paymentAmountMinView}
                  onChange={(e) => setPaymentAmountMinView(e.target.value)}
                  className="border px-2 py-1 text-xs rounded"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Amount Max (₹)"
                  value={paymentAmountMaxView}
                  onChange={(e) => setPaymentAmountMaxView(e.target.value)}
                  className="border px-2 py-1 text-xs rounded"
                  min="0"
                />
                <input
                  type="text"
                  placeholder="Method"
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="border px-2 py-1 text-xs rounded"
                />
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="min-w-full text-xs text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handlePaymentSort('amount')}
                      >
                        Amount (₹)
                        {paymentSortConfig.key === 'amount' && (
                          <i className={`fa fa-sort-${paymentSortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handlePaymentSort('method')}
                      >
                        Method
                        {paymentSortConfig.key === 'method' && (
                          <i className={`fa fa-sort-${paymentSortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handlePaymentSort('submittedBy')}
                      >
                        Submitted By
                        {paymentSortConfig.key === 'submittedBy' && (
                          <i className={`fa fa-sort-${paymentSortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                        )}
                      </th>
                      <th className="px-4 py-2">Remark</th>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handlePaymentSort('date')}
                      >
                        Date
                        {paymentSortConfig.key === 'date' && (
                          <i className={`fa fa-sort-${paymentSortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length > 0 ? (
                      filteredPayments.map((paymentItem, index) => (
                        <tr
                          key={index}
                          className="bg-white border-b hover:bg-gray-100"
                        >
                          <td className={`px-4 py-2 text-xs ${paymentItem.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{paymentItem.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {paymentItem.method}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {paymentItem.submittedBy}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {paymentItem.remark || '-'}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {new Date(paymentItem.date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-2 text-xs text-center text-gray-500">
                          No payments match the criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      </div>
      
        )}
    </div>
    </div>
  );
};

export default TransportPaymentList;
