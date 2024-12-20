// src/components/PaymentAccountsList.js

import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import api from './api'; 
import { useSelector } from 'react-redux';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import debounce from 'lodash.debounce'; // Added for debouncing search input

const PaymentAccountsList = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar
  const itemsPerPage = 15;

  // States for sorting and filtering inside the modal
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [tab, setTab] = useState('in'); // 'in' or 'out'
  const [filterMethod, setFilterMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  // Load selected accounts from localStorage or default select all
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);

  // Search state for the sidebar search input
  const [accountSearch, setAccountSearch] = useState('');

  // Fetch all payment accounts
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/accounts/allaccounts');
      const formattedAccounts = response.data.map((account) => ({
        ...account,
        paymentsIn: account.paymentsIn || [],
        paymentsOut: account.paymentsOut || [],
      }));
      setAccounts(formattedAccounts);

      // After fetching, set default selection if not already set in local storage
      const storedSelection = localStorage.getItem('selectedAccountIds');
      if (storedSelection) {
        setSelectedAccountIds(JSON.parse(storedSelection));
      } else {
        const allIds = formattedAccounts.map((a) => a._id);
        setSelectedAccountIds(allIds);
        localStorage.setItem('selectedAccountIds', JSON.stringify(allIds));
      }
    } catch (err) {
      setError('Failed to fetch payment accounts.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const totalPages = Math.ceil(accounts.length / itemsPerPage);

  // Debounced search handler to optimize performance
  const debouncedSearch = useCallback(
    debounce((query) => {
      setAccountSearch(query);
      setCurrentPage(1); // Reset to first page on new search
    }, 300),
    []
  );

  const handleAccountSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  // Filter accounts based on selectedAccountIds and accountSearch
  const filteredAccounts = accounts.filter((acc) =>
    selectedAccountIds.includes(acc._id) &&
    acc.accountName.toLowerCase().includes(accountSearch.toLowerCase())
  );

  // Calculate totals based on selected accounts
  const totalBalance = filteredAccounts.reduce((acc, account) => acc + account.balanceAmount, 0);

  const totalIn = filteredAccounts.reduce((total, account) => {
    return total + account.paymentsIn.reduce((sum, p) => sum + p.amount, 0);
  }, 0);

  const totalOut = filteredAccounts.reduce((total, account) => {
    return total + account.paymentsOut.reduce((sum, p) => sum + p.amount, 0);
  }, 0);

  // Paginate all accounts (for the main table)
  const paginateAccounts = () => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAccounts.slice(start, start + itemsPerPage);
  };

  // Generate PDF and show in a popup
  const generatePDF = (account) => {
    setPdfLoading(true);
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Payment Account Statement', 14, 22);
    doc.setFontSize(12);
    doc.text(`Account ID: ${account.accountId}`, 14, 32);
    doc.text(`Account Name: ${account.accountName}`, 14, 40);
    doc.text(`Balance Amount: Rs. ${account.balanceAmount.toFixed(2)}`, 14, 48);
    doc.text(
      `Created At: ${new Date(account.createdAt).toLocaleString()}`,
      14,
      56
    );

    // Payments In
    doc.setFontSize(14);
    doc.text('Payments In', 14, 70);
    const paymentsInData = account.paymentsIn.map((payment, index) => [
      index + 1,
      payment.amount.toFixed(2),
      payment.method,
      payment.remark || '',
      payment.submittedBy,
      new Date(payment.date).toLocaleString(),
    ]);

    doc.autoTable({
      startY: 75,
      head: [['#', 'Amount', 'Method', 'Remark', 'Submitted By', 'Date']],
      body: paymentsInData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [46, 204, 113] },
    });

    // Payments Out
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Payments Out', 14, finalY);
    const paymentsOutData = account.paymentsOut.map((payment, index) => [
      index + 1,
      payment.amount.toFixed(2),
      payment.method,
      payment.remark || '',
      payment.submittedBy,
      new Date(payment.date).toLocaleString(),
    ]);

    doc.autoTable({
      startY: finalY + 5,
      head: [['#', 'Amount', 'Method', 'Remark', 'Submitted By', 'Date']],
      body: paymentsOutData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [231, 76, 60] },
    });

    // Instead of saving, create a blob URL and open in a new window
    const pdfBlobUrl = doc.output('bloburl');
    // Open in a new window as a popup
    window.open(pdfBlobUrl, '_blank', 'width=800,height=600');

    setPdfLoading(false);
  };

  // Handle Removing an Account
  const handleRemove = async (id) => {
    if (window.confirm('Are you sure you want to remove this account?')) {
      try {
        await api.delete(`/api/accounts/acc/${id}/delete`);
        alert('Successfully deleted');
        setAccounts(accounts.filter((account) => account._id !== id));
        // Also remove from selection if present
        const updatedSelection = selectedAccountIds.filter(aid => aid !== id);
        setSelectedAccountIds(updatedSelection);
        localStorage.setItem('selectedAccountIds', JSON.stringify(updatedSelection));
      } catch (error) {
        setError('Error occurred while deleting the account.');
        console.error(error);
      }
    }
  };

  // Handle Viewing Account Details (modal)
  const handleView = (account) => {
    setSelectedAccount(account);
    setSearchQuery('');
    setSortField('date');
    setSortDirection('desc');
    setTab('in');
    setFilterMethod('');
    setStartDate('');
    setEndDate('');
  };

  const closeModal = () => {
    setSelectedAccount(null);
  };

  // Delete a single payment
  const handlePaymentDelete = async (paymentId, type) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        await api.delete(`/api/daily/acc/${paymentId}/delete`);
        const updatedAccount = { ...selectedAccount };
        if (type === 'in') {
          updatedAccount.paymentsIn = updatedAccount.paymentsIn.filter(
            (p) => p._id !== paymentId
          );
        } else {
          updatedAccount.paymentsOut = updatedAccount.paymentsOut.filter(
            (p) => p._id !== paymentId
          );
        }
        setSelectedAccount(updatedAccount);
      } catch (error) {
        console.error(error);
        alert('Error deleting payment.');
      }
    }
  };

  // Filtering and sorting logic for payments inside modal
  const filterAndSortPayments = (payments) => {
    let filtered = payments.filter((p) => {
      const matchesQuery =
        searchQuery.trim() === '' ||
        (p.remark && p.remark.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.method && p.method.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.submittedBy && p.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesMethod = filterMethod === '' || (p.method && p.method === filterMethod);

      const paymentDate = new Date(p.date);
      const withinStartDate = startDate ? paymentDate >= new Date(startDate) : true;
      const withinEndDate = endDate ? paymentDate <= new Date(endDate) : true;

      return matchesQuery && matchesMethod && withinStartDate && withinEndDate;
    });

    // Sort by selected field
    filtered.sort((a, b) => {
      let valA, valB;
      if (sortField === 'amount') {
        valA = a.amount;
        valB = b.amount;
      } else {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  // Dynamic methods options based on current tab
  const getMethodsOptions = () => {
    if (!selectedAccount) return [];
    const payments = tab === 'in' ? selectedAccount.paymentsIn : selectedAccount.paymentsOut;
    const uniqueMethods = [...new Set(payments.map(p => p.method))];
    return uniqueMethods;
  };

  // Render Skeletons
  const renderSkeleton = () => {
    const skeletonRows = Array.from({ length: itemsPerPage }, (_, index) => index);
    return (
      <div className="w-full">
        {/* Desktop Table Skeleton */}
        <div className="hidden md:block">
          <table className="w-full text-sm text-gray-500 bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-200">
              <tr className="divide-y text-xs">
                <th className="px-4 py-2 text-left">Account ID</th>
                <th className="px-2 py-2">Account Name</th>
                <th className="px-2 py-2">Balance</th>
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
  };

  // Pagination Handler
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPayments = (payments, type) => {
    const filteredPayments = filterAndSortPayments(payments);

    if (filteredPayments.length === 0) {
      return <p className="text-xs text-gray-500">No payments available.</p>;
    }

    return (
      <>
        <div className="hidden sm:block overflow-x-auto mt-4">
          <table className="min-w-full text-sm text-left text-gray-500">
            <thead className="text-xs uppercase bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2">Remark</th>
                <th className="px-4 py-2">Submitted By</th>
                <th className="px-4 py-2">Date & Time</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment, index) => (
                <tr key={payment._id || index} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs">{index + 1}</td>
                  <td
                    className={`px-4 py-2 text-xs font-semibold ${
                      type === 'in' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    ₹{payment.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-xs">{payment.method}</td>
                  <td className="px-4 py-2 text-xs">{payment.remark || '-'}</td>
                  <td className="px-4 py-2 text-xs">{payment.submittedBy}</td>
                  <td className="px-4 py-2 text-xs">{new Date(payment.date).toLocaleString()}</td>
                  <td className="px-4 py-2 text-xs">
                    <button
                      onClick={() => handlePaymentDelete(payment._id, type)}
                      className="bg-red-500 text-white px-2 font-bold py-1 rounded hover:bg-red-600 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards view for mobile */}
        <div className="sm:hidden flex flex-col space-y-4 mt-4">
          {filteredPayments.map((payment, index) => (
            <div key={payment._id || index} className="bg-white p-4 rounded shadow">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-gray-600">#{index + 1}</span>
                <button
                  onClick={() => handlePaymentDelete(payment._id, type)}
                  className="bg-red-500 text-white px-2 font-bold py-1 rounded hover:bg-red-600 text-xs"
                >
                  Delete
                </button>
              </div>
              <p className={`text-xs font-semibold ${type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                Amount: ₹{payment.amount.toFixed(2)}
              </p>
              <p className="text-xs"><span className="font-semibold">Method: </span>{payment.method}</p>
              <p className="text-xs"><span className="font-semibold">Remark: </span>{payment.remark || '-'}</p>
              <p className="text-xs"><span className="font-semibold">Submitted By: </span>{payment.submittedBy}</p>
              <p className="text-xs"><span className="font-semibold">Date & Time: </span>{new Date(payment.date).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </>
    );
  };

  // Handle checkbox selection for accounts in the sidebar
  const handleAccountSelectionChange = (accountId) => {
    let updatedSelections;
    if (selectedAccountIds.includes(accountId)) {
      // remove it
      updatedSelections = selectedAccountIds.filter((id) => id !== accountId);
    } else {
      // add it
      updatedSelections = [...selectedAccountIds, accountId];
    }
    setSelectedAccountIds(updatedSelections);
    localStorage.setItem('selectedAccountIds', JSON.stringify(updatedSelections));
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Sidebar for Filters - Visible on Desktop, Overlay on Mobile */}
      <div
        className={`fixed inset-y-0 left-0 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static md:inset-auto md:w-1/4 lg:w-1/5 bg-white p-4 shadow-md transition-transform duration-300 ease-in-out z-50`}
      >
        <h2 className="text-md font-bold text-red-600 mb-4 text-center">Filter Accounts</h2>
        {/* Search by Account Name */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by Account Name"
            onChange={handleAccountSearchChange}
            className="border text-xs p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        {/* Select Accounts */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Select Accounts</h3>
          <div className="max-h-60 overflow-auto border p-2 rounded">
            {accounts.map((acc) => (
              <div key={acc._id} className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={selectedAccountIds.includes(acc._id)}
                  onChange={() => handleAccountSelectionChange(acc._id)}
                  className="mr-2"
                />
                <span className="text-xs text-gray-700">
                  {acc.accountName} (ID: {acc.accountId})
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Payment Method Filter */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Filter by Method</h3>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="border text-xs p-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="">All Methods</option>
            {/* Dynamically populate methods */}
            {Array.from(new Set(accounts.flatMap(acc => acc.paymentsIn.map(p => p.method).concat(acc.paymentsOut.map(p => p.method))))).map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        </div>
        {/* Date Range Filter */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Filter by Date</h3>
          <div className="flex space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-red-500 w-1/2"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-red-500 w-1/2"
            />
          </div>
        </div>
        {/* Sorting Options */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Sort By</h3>
          <div className="flex space-x-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="border text-xs p-2 rounded w-1/2 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
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
            onClick={() => setIsSidebarOpen(false)}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-xs font-bold w-full"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Overlay for Mobile Sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 relative">
          <div
            onClick={() => navigate('/')}
            className="text-center cursor-pointer"
          >
            <h2 className="text-md font-bold text-red-600">KK TRADING</h2>
            <p className="text-gray-400 text-xs font-bold">
              All Payment Accounts Information and Transactions
            </p>
          </div>
          <i className="fa fa-list text-gray-500" />
          {/* Toggle Sidebar Button for Mobile */}
          <button
            className="md:hidden text-gray-600 hover:text-gray-800"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open Filters"
          >
            <i className="fa fa-filter text-lg"></i>
          </button>
        </div>

        {/* Totals */}
        <div className="flex justify-between items-center shadow-md rounded-lg p-4 mb-4 space-y-4 sm:space-y-0">
          <div className=" bg-white p-4 rounded shadow">
            <h3 className="text-sm font-bold text-gray-600">In</h3>
            <p className="text-sm sm:text-xs font-extrabold text-green-600">₹{totalIn.toFixed(2)}</p>
          </div>
          <div className=" bg-white p-4 rounded shadow">
            <h3 className="text-sm font-bold text-gray-600">Out</h3>
            <p className="text-sm sm:text-xs font-extrabold text-red-600">₹{totalOut.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm font-bold text-gray-600">Balance</h3>
            <p className="text-sm sm:text-xs font-extrabold text-gray-900">₹{totalBalance.toFixed(2)}</p>
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

        {/* Loading Skeletons */}
        {loading ? (
          renderSkeleton()
        ) : (
          <>
            {/* Accounts Table/Card View */}
            {filteredAccounts.length === 0 ? (
              <p className="text-center text-gray-500 text-xs">
                No payment accounts available.
              </p>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <table className="w-full text-xs text-gray-500 bg-white shadow-md rounded-lg overflow-hidden">
                    <thead className="bg-red-600 text-xs text-white">
                      <tr className="divide-y">
                        <th className="px-4 py-2 text-left">Account ID</th>
                        <th className="px-2 py-2">Account Name</th>
                        <th className="px-2 py-2">Balance (Rs.)</th>
                        <th className="px-2 py-2">Created At</th>
                        <th className="px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginateAccounts().map((account) => (
                        <tr
                          key={account._id}
                          className="hover:bg-gray-100 divide-y divide-x"
                        >
                          <td className="px-4 py-2 text-xs font-bold text-red-600">
                            {account.accountId}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {account.accountName}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            ₹{account.balanceAmount.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {new Date(account.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleView(account)}
                                className="bg-red-500 text-white px-2 font-bold py-1 rounded hover:bg-red-600 flex items-center text-xs"
                              >
                                <i className="fa fa-eye mr-1"></i> View
                              </button>
                              <button
                                onClick={() => generatePDF(account)}
                                className="bg-red-500 text-white px-2 font-bold py-1 rounded hover:bg-red-600 flex items-center text-xs"
                              >
                                <i className="fa fa-file-pdf-o mr-1"></i> Download
                              </button>
                              <button
                                onClick={() => handleRemove(account._id)}
                                className="bg-red-500 text-white px-2 font-bold py-1 rounded hover:bg-red-600 flex items-center text-xs"
                              >
                                <i className="fa fa-trash mr-1"></i> Delete
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
                  {paginateAccounts().map((account) => (
                    <div key={account._id} className="bg-white p-4 rounded shadow">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-red-600">Account ID: {account.accountId}</h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleView(account)}
                            className="bg-red-500 text-white px-2 font-bold py-1 rounded hover:bg-red-600 text-xs"
                          >
                            <i className="fa fa-eye mr-1"></i>
                          </button>
                          <button
                            onClick={() => generatePDF(account)}
                            className="bg-red-500 text-white px-2 font-bold py-1 rounded hover:bg-red-600 text-xs"
                          >
                            <i className="fa fa-file-pdf-o mr-1"></i>
                          </button>
                          <button
                            onClick={() => handleRemove(account._id)}
                            className="bg-red-500 text-white px-2 font-bold py-1 rounded hover:bg-red-600 text-xs"
                          >
                            <i className="fa fa-trash mr-1"></i>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs"><span className="font-semibold">Name: </span>{account.accountName}</p>
                      <p className="text-xs"><span className="font-semibold">Balance: </span>₹{account.balanceAmount.toFixed(2)}</p>
                      <p className="text-xs"><span className="font-semibold">Created At: </span>{new Date(account.createdAt).toLocaleDateString()}</p>
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

        {/* Full Transactions Modal */}
        {selectedAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
            <div className="bg-white w-full h-full p-4 sm:p-6 relative rounded-none">
              {/* Close Button */}
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-3xl"
                onClick={closeModal}
                aria-label="Close Modal"
              >
                &times;
              </button>

              {/* Modal Header */}
              <div className="mt-8 sm:mt-0">
                <h2 className="text-lg font-bold text-red-600 mb-4">
                  Transactions for Account ID: {selectedAccount.accountId}
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 mb-4">
                  <div>
                    <p className="text-sm font-semibold">
                      Balance Amount:{' '}
                      <span className="text-gray-900 font-bold">
                        ₹{selectedAccount.balanceAmount.toFixed(2)}
                      </span>
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setTab('in')}
                      className={`px-3 py-1 text-xs font-bold rounded ${
                        tab === 'in'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Payments In
                    </button>
                    <button
                      onClick={() => setTab('out')}
                      className={`px-3 py-1 text-xs font-bold rounded ${
                        tab === 'out'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Payments Out
                    </button>
                  </div>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="bg-gray-50 p-3 rounded mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                  <input
                    type="text"
                    placeholder="Search by Remark/Method/Submitted By"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-red-500 flex-1"
                  />
                  <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="border text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="">All Methods</option>
                    {getMethodsOptions().map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                    <span className="text-xs">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="border text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
                    className="border text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="amount">Sort by Amount</option>
                  </select>
                  <select
                    value={sortDirection}
                    onChange={(e) => setSortDirection(e.target.value)}
                    className="border text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
                </div>
              </div>

              {/* Payments Lists */}
              <div className="mt-4">
                {tab === 'in' ? (
                  <>
                    <h3 className="text-md font-semibold text-green-600 mb-2">Payments In</h3>
                    {renderPayments(selectedAccount.paymentsIn, 'in')}
                  </>
                ) : (
                  <>
                    <h3 className="text-md font-semibold text-red-600 mb-2">Payments Out</h3>
                    {renderPayments(selectedAccount.paymentsOut, 'out')}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Accounts Selection Sidebar */}
        {/* This section is handled by the sidebar on desktop and the overlay on mobile */}
      </div>
    </div>
  );
};

export default PaymentAccountsList;
