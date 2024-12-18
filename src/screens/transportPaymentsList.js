// src/components/TransportPaymentList.js

import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import api from './api'; // Ensure this is correctly set up to handle API requests
import { useSelector } from 'react-redux';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const TransportPaymentList = () => {
  const navigate = useNavigate();
  const [transportPayments, setTransportPayments] = useState([]);
  const [filteredTransportPayments, setFilteredTransportPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Main filters/search/sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [billAmountMin, setBillAmountMin] = useState('');
  const [billAmountMax, setBillAmountMax] = useState('');
  const [paymentAmountMin, setPaymentAmountMin] = useState('');
  const [paymentAmountMax, setPaymentAmountMax] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

  // Modal for selecting payments to calculate totals
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectedForTotals, setSelectedForTotals] = useState({});

  // View Modal Filters and Sorting (for Billings and Payments)
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

  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  // Fetch all transport payments
  const fetchTransportPayments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/transportpayments/all');
      setTransportPayments(response.data);
      setFilteredTransportPayments(response.data);
      const initialSelection = {};
      response.data.forEach((payment) => {
        initialSelection[payment._id] = true;
      });
      setSelectedForTotals(initialSelection);
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

  // Main filtering and sorting logic
  useEffect(() => {
    let temp = [...transportPayments];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      temp = temp.filter(
        (payment) =>
          payment.transportName.toLowerCase().includes(q) ||
          payment.transportType.toLowerCase().includes(q)
      );
    }

    // Date Range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      temp = temp.filter((payment) => new Date(payment.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      temp = temp.filter((payment) => new Date(payment.createdAt) <= toDate);
    }

    // Payment Status
    if (paymentStatusFilter) {
      if (paymentStatusFilter === 'Completed') {
        temp = temp.filter((payment) => payment.paymentRemaining === 0);
      } else if (paymentStatusFilter === 'Pending') {
        temp = temp.filter((payment) => payment.paymentRemaining > 0);
      }
    }

    // Bill Amount Range
    if (billAmountMin !== '') {
      temp = temp.filter((payment) => payment.totalAmountBilled >= parseFloat(billAmountMin));
    }
    if (billAmountMax !== '') {
      temp = temp.filter((payment) => payment.totalAmountBilled <= parseFloat(billAmountMax));
    }

    // Payment Amount Range
    if (paymentAmountMin !== '') {
      temp = temp.filter((payment) => payment.totalAmountPaid >= parseFloat(paymentAmountMin));
    }
    if (paymentAmountMax !== '') {
      temp = temp.filter((payment) => payment.totalAmountPaid <= parseFloat(paymentAmountMax));
    }

    // Sorting
    if (sortConfig.key !== '') {
      temp.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (sortConfig.key === 'createdAt') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredTransportPayments(temp);
    setCurrentPage(1);
  }, [
    transportPayments,
    searchQuery,
    dateFrom,
    dateTo,
    paymentStatusFilter,
    billAmountMin,
    billAmountMax,
    paymentAmountMin,
    paymentAmountMax,
    sortConfig,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredTransportPayments.length / itemsPerPage);
  const paginateTransportPayments = () => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransportPayments.slice(start, start + itemsPerPage);
  };
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
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

    // Save PDF
    doc.save(`Transport_Payment_${payment._id}.pdf`);
    setPdfLoading(false);
  };

  // Handle Removing a Transport Payment
  const handleRemove = async (id) => {
    if (window.confirm('Are you sure you want to delete this transport payment record?')) {
      try {
        await api.delete(`/api/transportpayments/${id}/delete`);
        alert('Transport payment record deleted successfully.');
        setTransportPayments(transportPayments.filter((payment) => payment._id !== id));
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
      <table className="w-full text-xs text-gray-500 bg-white shadow-md rounded-lg overflow-hidden">
        <thead className="bg-gray-200">
          <tr className="divide-y text-xs">
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
    );
  };

  // Sorting Handler
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Totals Based on Selected Payments
  const visibleSelectedPayments = transportPayments.filter((payment) => selectedForTotals[payment._id]);
  const totalBilledSelected = useMemo(
    () => visibleSelectedPayments.reduce((sum, payment) => sum + payment.totalAmountBilled, 0),
    [visibleSelectedPayments]
  );
  const totalPaidSelected = useMemo(
    () => visibleSelectedPayments.reduce((sum, payment) => sum + payment.totalAmountPaid, 0),
    [visibleSelectedPayments]
  );
  const totalPendingSelected = useMemo(
    () => visibleSelectedPayments.reduce((sum, payment) => sum + payment.paymentRemaining, 0),
    [visibleSelectedPayments]
  );

  // Selection Modal Handlers
  const toggleSelection = (id) => {
    setSelectedForTotals((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filters for Billings and Payments in View Modal
  const filteredBillings = useMemo(() => {
    if (!selectedPayment) return [];
    let temp = [...selectedPayment.billings];

    if (billingSearchQuery.trim()) {
      const q = billingSearchQuery.toLowerCase();
      temp = temp.filter((billing) =>
        billing.invoiceNo.toLowerCase().includes(q)
      );
    }

    if (billingDateFrom) {
      const from = new Date(billingDateFrom);
      temp = temp.filter((billing) => new Date(billing.date) >= from);
    }
    if (billingDateTo) {
      const to = new Date(billingDateTo);
      temp = temp.filter((billing) => new Date(billing.date) <= to);
    }

    if (billingAmountMin !== '') {
      temp = temp.filter((billing) => billing.amount >= parseFloat(billingAmountMin));
    }
    if (billingAmountMax !== '') {
      temp = temp.filter((billing) => billing.amount <= parseFloat(billingAmountMax));
    }

    if (billingSortConfig.key !== '') {
      temp.sort((a, b) => {
        let aValue = a[billingSortConfig.key];
        let bValue = b[billingSortConfig.key];

        if (billingSortConfig.key === 'date') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return billingSortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return billingSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return temp;
  }, [
    selectedPayment,
    billingSearchQuery,
    billingDateFrom,
    billingDateTo,
    billingAmountMin,
    billingAmountMax,
    billingSortConfig,
  ]);

  const filteredPayments = useMemo(() => {
    if (!selectedPayment) return [];
    let temp = [...selectedPayment.payments];

    if (paymentSearchQuery.trim()) {
      const q = paymentSearchQuery.toLowerCase();
      temp = temp.filter(
        (paymentItem) =>
          paymentItem.submittedBy.toLowerCase().includes(q) ||
          paymentItem.method.toLowerCase().includes(q) ||
          (paymentItem.referenceId && paymentItem.referenceId.toLowerCase().includes(q))
      );
    }

    if (paymentDateFrom) {
      const from = new Date(paymentDateFrom);
      temp = temp.filter((paymentItem) => new Date(paymentItem.date) >= from);
    }
    if (paymentDateTo) {
      const to = new Date(paymentDateTo);
      temp = temp.filter((paymentItem) => new Date(paymentItem.date) <= to);
    }

    if (paymentAmountMinView !== '') {
      temp = temp.filter((paymentItem) => paymentItem.amount >= parseFloat(paymentAmountMinView));
    }
    if (paymentAmountMaxView !== '') {
      temp = temp.filter((paymentItem) => paymentItem.amount <= parseFloat(paymentAmountMaxView));
    }

    if (paymentMethodFilter) {
      temp = temp.filter(
        (paymentItem) => paymentItem.method.toLowerCase() === paymentMethodFilter.toLowerCase()
      );
    }

    if (paymentSortConfig.key !== '') {
      temp.sort((a, b) => {
        let aValue = a[paymentSortConfig.key];
        let bValue = b[paymentSortConfig.key];

        if (paymentSortConfig.key === 'date') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return paymentSortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return paymentSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return temp;
  }, [
    selectedPayment,
    paymentSearchQuery,
    paymentDateFrom,
    paymentDateTo,
    paymentAmountMinView,
    paymentAmountMaxView,
    paymentMethodFilter,
    paymentSortConfig,
  ]);

  const handleBillingSort = (key) => {
    let direction = 'asc';
    if (billingSortConfig.key === key && billingSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setBillingSortConfig({ key, direction });
  };

  const handlePaymentSort = (key) => {
    let direction = 'asc';
    if (paymentSortConfig.key === key && paymentSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setPaymentSortConfig({ key, direction });
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4">
        <div onClick={() => navigate('/')} className="text-center cursor-pointer">
          <h2 className="text-sm font-bold text-red-600">KK TRADING</h2>
          <p className="text-gray-400 text-xs font-bold">
            All Transport Payments Information and Transactions
          </p>
        </div>
        <i className="fa fa-list text-gray-500" />
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

      {/* Filters and Searches */}
      <div className="bg-white p-4 shadow-md rounded-lg mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* Column 1: Search & Date Range */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-semibold">Search</label>
            <input
              type="text"
              placeholder="Transport Name or Type"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border px-2 py-1 text-xs rounded w-full"
            />
            <label className="text-xs font-semibold">Created At</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border px-2 py-1 text-xs rounded w-full"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border px-2 py-1 text-xs rounded w-full"
              />
            </div>
          </div>

          {/* Column 2: Payment Status & Bill Amount */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-semibold">Payment Status</label>
            <select
              className="border px-2 py-1 text-xs rounded w-full"
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
            </select>
            <label className="text-xs font-semibold">Bill Amount (₹)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={billAmountMin}
                onChange={(e) => setBillAmountMin(e.target.value)}
                className="border px-2 py-1 text-xs rounded w-full"
                min="0"
              />
              <input
                type="number"
                placeholder="Max"
                value={billAmountMax}
                onChange={(e) => setBillAmountMax(e.target.value)}
                className="border px-2 py-1 text-xs rounded w-full"
                min="0"
              />
            </div>
          </div>

          {/* Column 3: Payment Amount */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-semibold">Payment Amount (₹)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={paymentAmountMin}
                onChange={(e) => setPaymentAmountMin(e.target.value)}
                className="border px-2 py-1 text-xs rounded w-full"
                min="0"
              />
              <input
                type="number"
                placeholder="Max"
                value={paymentAmountMax}
                onChange={(e) => setPaymentAmountMax(e.target.value)}
                className="border px-2 py-1 text-xs rounded w-full"
                min="0"
              />
            </div>
          </div>

          {/* Column 4: Select Payments for Totals */}
          <div className="flex flex-col justify-end">
            <button
              onClick={() => setIsSelectionModalOpen(true)}
              className="bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded hover:bg-red-600 flex items-center"
            >
              <i className="fa fa-check-square mr-1"></i> Select Payments for Totals
            </button>
          </div>

        </div>
      </div>

      {/* Totals */}
      <div className="flex flex-col md:flex-row justify-between bg-white shadow-md rounded-lg p-4 mb-4 text-xs">
        <div className="flex items-center space-x-4 mb-2 md:mb-0">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 font-semibold">Total Billed:</span>
            <span className="text-gray-700">₹{totalBilledSelected.toFixed(2)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-blue-600 font-semibold">Total Paid:</span>
            <span className="text-gray-700">₹{totalPaidSelected.toFixed(2)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-red-600 font-semibold">Total Pending:</span>
            <span className="text-gray-700">₹{totalPendingSelected.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Loading or Transport Payments Table */}
      {loading ? (
        renderSkeleton()
      ) : filteredTransportPayments.length === 0 ? (
        <p className="text-center text-gray-500 text-xs">No transport payment records available.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-gray-500 bg-white shadow-md rounded-lg overflow-hidden">
              <thead className="bg-red-600 text-xs text-white">
                <tr className="divide-y">
                  <th
                    className="px-4 py-2 text-left cursor-pointer select-none"
                    onClick={() => handleSort('transportName')}
                  >
                    Transport Name
                    {sortConfig.key === 'transportName' && (
                      <i className={`fa fa-sort-${sortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                    )}
                  </th>
                  <th
                    className="px-2 py-2 cursor-pointer select-none"
                    onClick={() => handleSort('transportType')}
                  >
                    Transport Type
                    {sortConfig.key === 'transportType' && (
                      <i className={`fa fa-sort-${sortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                    )}
                  </th>
                  <th
                    className="px-2 py-2 cursor-pointer select-none"
                    onClick={() => handleSort('totalAmountBilled')}
                  >
                    Total Billed (₹)
                    {sortConfig.key === 'totalAmountBilled' && (
                      <i className={`fa fa-sort-${sortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                    )}
                  </th>
                  <th
                    className="px-2 py-2 cursor-pointer select-none"
                    onClick={() => handleSort('totalAmountPaid')}
                  >
                    Total Paid (₹)
                    {sortConfig.key === 'totalAmountPaid' && (
                      <i className={`fa fa-sort-${sortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                    )}
                  </th>
                  <th
                    className="px-2 py-2 cursor-pointer select-none"
                    onClick={() => handleSort('paymentRemaining')}
                  >
                    Payment Remaining (₹)
                    {sortConfig.key === 'paymentRemaining' && (
                      <i className={`fa fa-sort-${sortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                    )}
                  </th>
                  <th
                    className="px-2 py-2 cursor-pointer select-none"
                    onClick={() => handleSort('createdAt')}
                  >
                    Created At
                    {sortConfig.key === 'createdAt' && (
                      <i className={`fa fa-sort-${sortConfig.direction === 'asc' ? 'asc' : 'desc'} ml-1`}></i>
                    )}
                  </th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginateTransportPayments().map((payment) => (
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

      {/* Selection Modal for Totals */}
      {isSelectionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 my-8 relative shadow-lg">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={() => setIsSelectionModalOpen(false)}
              aria-label="Close Modal"
            >
              &times;
            </button>
            <h2 className="text-sm font-semibold text-red-600 mb-4">Select Payments for Totals</h2>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {transportPayments.map((payment) => (
                <div key={payment._id} className="flex items-center text-xs">
                  <input
                    type="checkbox"
                    checked={!!selectedForTotals[payment._id]}
                    onChange={() => toggleSelection(payment._id)}
                    className="mr-2"
                  />
                  <span>{payment.transportName} - {payment.transportType}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setIsSelectionModalOpen(false)}
              className="bg-red-500 text-white px-3 py-1 text-xs font-semibold rounded hover:bg-red-600 mt-4"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* View Modal (Fullscreen) */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-auto">
          <div className="bg-white w-full h-full relative p-6">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={closeModal}
              aria-label="Close Modal"
            >
              &times;
            </button>

            {/* Modal Content */}
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-red-600 mb-4">
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
                  placeholder="Bill Min (₹)"
                  value={billingAmountMin}
                  onChange={(e) => setBillingAmountMin(e.target.value)}
                  className="border px-2 py-1 text-xs rounded"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Bill Max (₹)"
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
                        <tr key={index} className="bg-white border-b hover:bg-gray-100">
                          <td className="px-4 py-2 text-xs">{index + 1}</td>
                          <td className="px-4 py-2 text-xs">{billing.billId}</td>
                          <td className="px-4 py-2 text-xs">{billing.invoiceNo}</td>
                          <td className="px-4 py-2 text-xs">₹{billing.amount.toFixed(2)}</td>
                          <td className="px-4 py-2 text-xs">{new Date(billing.date).toLocaleDateString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-2 text-xs text-center text-gray-500">
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

    </>
  );
};

export default TransportPaymentList;
