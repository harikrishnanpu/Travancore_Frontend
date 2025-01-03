// src/screens/ReturnListingScreen.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { useSelector } from 'react-redux';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { FaFilter, FaTimes, FaDownload, FaTrash, FaEye, FaPrint } from 'react-icons/fa';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import html2pdf from 'html2pdf.js';

export default function ReturnListingScreen() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [printLoading, setPrintLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [returnStartDate, setReturnStartDate] = useState('');
  const [returnEndDate, setReturnEndDate] = useState('');
  const [returnType, setReturnType] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // Tabs: All, Purchase Returns, Billing Returns
  const [activeTab, setActiveTab] = useState('All');

  // Sidebar for mobile filters
  const [showSidebar, setShowSidebar] = useState(false);

  // Bulk Actions
  const [selectedReturns, setSelectedReturns] = useState([]);

  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  // Fetch all returns from the server
  const fetchReturns = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/returns'); // Ensure this endpoint exists
      setReturns(data);
    } catch (err) {
      setError('Error fetching returns data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  // Debounced Search Term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Compute filtered and sorted data
  const filteredReturns = useMemo(() => {
    let data = [...returns];

    // Active Tab Filter
    if (activeTab === 'Purchase Returns') {
      data = data.filter((ret) => ret.returnType === 'purchase');
    } else if (activeTab === 'Billing Returns') {
      data = data.filter((ret) => ret.returnType === 'bill');
    }

    // Search
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      data = data.filter(
        (ret) =>
          (ret.returnNo && ret.returnNo.toLowerCase().includes(lowerSearch)) ||
          (ret.products && ret.products.some((prod) => prod.name.toLowerCase().includes(lowerSearch)))
      );
    }

    // Return Date Range Filter
    if (returnStartDate && returnEndDate) {
      const start = new Date(returnStartDate);
      const end = new Date(returnEndDate);
      data = data.filter((ret) => {
        const returnDate = new Date(ret.returnDate);
        return returnDate >= start && returnDate <= end;
      });
    }

    // Return Type Filter (redundant due to tabs, but kept for flexibility)
    if (returnType) {
      data = data.filter((ret) => ret.returnType === returnType);
    }

    // Sorting
    if (sortField) {
      data.sort((a, b) => {
        let aField = a[sortField];
        let bField = b[sortField];

        // Handle nested fields if any
        if (sortField.includes('.')) {
          const fields = sortField.split('.');
          aField = fields.reduce((acc, curr) => acc && acc[curr], a);
          bField = fields.reduce((acc, curr) => acc && acc[curr], b);
        }

        if (typeof aField === 'string') {
          aField = aField.toLowerCase();
          bField = bField.toLowerCase();
        }

        if (aField < bField) return sortOrder === 'asc' ? -1 : 1;
        if (aField > bField) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [
    returns,
    debouncedSearchTerm,
    returnStartDate,
    returnEndDate,
    returnType,
    sortField,
    sortOrder,
    activeTab,
  ]);

  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);

  const paginatedReturns = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReturns.slice(start, start + itemsPerPage);
  }, [filteredReturns, currentPage]);

  // Statistics based on filtered data
  const stats = useMemo(() => {
    const total = filteredReturns.length;
    const totalAmount = filteredReturns.reduce((acc, ret) => acc + ret.netReturnAmount, 0);

    const purchaseReturns = filteredReturns.filter((ret) => ret.returnType === 'purchase');
    const billingReturns = filteredReturns.filter((ret) => ret.returnType === 'bill');

    const purchaseAmount = purchaseReturns.reduce((acc, ret) => acc + ret.netReturnAmount, 0);
    const billingAmount = billingReturns.reduce((acc, ret) => acc + ret.netReturnAmount, 0);

    return {
      total,
      purchaseReturns: purchaseReturns.length,
      billingReturns: billingReturns.length,
      totalAmount,
      purchaseAmount,
      billingAmount,
    };
  }, [filteredReturns]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setReturnStartDate('');
    setReturnEndDate('');
    setReturnType('');
    setSortField('');
    setSortOrder('asc');
    setActiveTab('All');
  };

  const toggleSidebar = () => {
    setShowSidebar((prev) => !prev);
  };

  // Function to print return invoice via backend API
  const printReturnInvoice = async (returnEntry) => {
    setPrintLoading(true);
    try {
      const response = await api.post(
        '/api/print/generate-return-invoice-html',
        { returnNo: returnEntry.returnNo }, // Send only returnNo
        { responseType: 'blob' }
      );

      // Create a Blob from the response
      const blob = new Blob([response.data], { type: 'text/html' });

      // Create a URL for the Blob and open it in a new tab
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error generating return invoice:', error);
      alert('Failed to load the return invoice. Please try again.');
    } finally {
      setPrintLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (window.confirm('Are you sure you want to remove this return entry?')) {
      try {
        await api.delete(`/api/returns/return/delete/${id}/`); // Ensure this endpoint exists
        const updatedReturns = returns.filter((ret) => ret._id !== id);
        setReturns(updatedReturns);
      } catch (error) {
        setError('Error occurred while deleting the return entry.');
        console.error(error);
      }
    }
  };

  const handleView = (returnEntry) => {
    setSelectedReturn(returnEntry);
  };

  const closeModal = () => {
    setSelectedReturn(null);
  };

  // Bulk Remove
  const handleBulkRemove = async () => {
    if (selectedReturns.length === 0) return;
    if (window.confirm('Are you sure you want to remove the selected return entries?')) {
      try {
        await Promise.all(selectedReturns.map((id) => api.delete(`/api/returns/return/delete/${id}/`)));
        const updatedReturns = returns.filter((ret) => !selectedReturns.includes(ret._id));
        setReturns(updatedReturns);
        setSelectedReturns([]);
      } catch (error) {
        setError('Error occurred while deleting the selected return entries.');
        console.error(error);
      }
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvData = filteredReturns.map((ret) => ({
      'Return No': ret.returnNo,
      'Return Date': new Date(ret.returnDate).toLocaleDateString(),
      'Return Type': ret.returnType.charAt(0).toUpperCase() + ret.returnType.slice(1),
      'Number of Products': ret.products.length,
      'Net Return Amount': ret.netReturnAmount.toFixed(2),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'return_list.csv');
  };

  // Export to PDF (Simplistic Approach)
  const exportToPDF = () => {
    // For a more robust solution, consider using a library like jsPDF
    const element = document.getElementById('return-table');
    if (!element) return;

    const opt = {
      margin:       0.5,
      filename:     'return_list.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  // Handle Selection
  const handleSelectReturn = (id) => {
    setSelectedReturns((prev) =>
      prev.includes(id) ? prev.filter((retId) => retId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedReturns.length === paginatedReturns.length) {
      setSelectedReturns([]);
    } else {
      setSelectedReturns(paginatedReturns.map((ret) => ret._id));
    }
  };

  // Render Selection Checkbox
  const renderSelectionCheckbox = (id) => (
    <input
      type="checkbox"
      checked={selectedReturns.includes(id)}
      onChange={() => handleSelectReturn(id)}
      className="form-checkbox h-4 w-4 text-red-600"
    />
  );

  // Render Table Headers with Sort Indicators
  const renderTableHeader = () => {
    const headers = [
      { label: 'Select', field: 'select', sortable: false },
      { label: 'Return No', field: 'returnNo', sortable: true },
      { label: 'Return Date', field: 'returnDate', sortable: true },
      { label: 'Return Type', field: 'returnType', sortable: true },
      { label: 'Products', field: 'products.length', sortable: true },
      { label: 'Net Return Amount', field: 'netReturnAmount', sortable: true },
      { label: 'Actions', field: 'actions', sortable: false },
    ];

    return (
      <tr>
        {headers.map((header) => (
          <th
            key={header.field}
            className="px-4 py-2 text-left text-xs font-medium text-red-700 uppercase tracking-wider"
            onClick={() => {
              if (!header.sortable) return;
              setSortField(header.field);
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            }}
          >
            <div className="flex items-center">
              {header.label}
              {header.sortable && sortField === header.field && (
                <span className="ml-1">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </div>
          </th>
        ))}
      </tr>
    );
  };

  // Render Table Rows
  const renderTableRows = () => {
    return paginatedReturns.map((returnEntry) => (
      <tr key={returnEntry._id} className="hover:bg-red-100">
        <td className="px-4 py-2">
          {renderSelectionCheckbox(returnEntry._id)}
        </td>
        <td
          onClick={() => handleView(returnEntry)}
          className={`px-2 cursor-pointer flex text-xs font-bold py-2 ${
            returnEntry.returnType === 'bill' ? 'text-red-600' : 'text-red-600'
          }`}
        >
          {returnEntry.returnNo}
        </td>
        <td className="px-2 text-xs py-2">
          {new Date(returnEntry.returnDate).toLocaleDateString()}
        </td>
        <td className="px-2 text-xs py-2">
          {returnEntry.returnType.charAt(0).toUpperCase() + returnEntry.returnType.slice(1)}
        </td>
        <td className="px-2 text-xs py-2">
          {returnEntry.products.length}
        </td>
        <td className="px-2 text-xs py-2">
          ₹{returnEntry.netReturnAmount.toFixed(2)}
        </td>
        <td className="px-2 text-xs py-2">
          <div className="flex space-x-2">
            <button
              onClick={() => printReturnInvoice(returnEntry)}
              className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 flex items-center"
              title="Print Invoice"
            >
              <FaPrint className="mr-1" /> Print
            </button>
            <button
              onClick={() => handleView(returnEntry)}
              className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 flex items-center"
              title="View Details"
            >
              <FaEye className="mr-1" /> View
            </button>
            <button
              onClick={() => handleRemove(returnEntry._id)}
              className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 flex items-center"
              title="Remove Entry"
            >
              <FaTrash className="mr-1" /> Remove
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  // Render Table Skeleton
  const renderTableSkeleton = () => {
    const skeletonRows = Array.from({ length: itemsPerPage }, (_, index) => index);
    return (
      <table className="w-full text-sm text-white bg-white shadow-md rounded-lg overflow-hidden">
        <thead className="bg-red-200">
          <tr>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-2 py-2">Return No</th>
            <th className="px-2 py-2">Return Date</th>
            <th className="px-2 py-2">Return Type</th>
            <th className="px-2 py-2">Products</th>
            <th className="px-2 py-2">Net Return Amount</th>
            <th className="px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {skeletonRows.map((row) => (
            <tr key={row} className="hover:bg-red-100 divide-y divide-x">
              <td className="px-4 py-2 text-center">
                <Skeleton circle={true} height={12} width={12} />
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

  // Render Card Skeleton
  const renderCardSkeleton = () => {
    const skeletonCards = Array.from({ length: itemsPerPage }, (_, index) => index);
    return skeletonCards.map((card) => (
      <div
        key={card}
        className="bg-white rounded-lg shadow-md p-6 mb-4 animate-pulse"
      >
        <div className="flex justify-between items-center">
          <Skeleton height={20} width={`60%`} />
          <Skeleton circle={true} height={12} width={12} />
        </div>
        <p className="text-red-600 text-xs mt-2">
          <Skeleton height={10} width={`80%`} />
        </p>
        <p className="text-red-600 text-xs mt-1">
          <Skeleton height={10} width={`70%`} />
        </p>
        <p className="text-red-600 text-xs mt-1">
          <Skeleton height={10} width={`50%`} />
        </p>
        <div className="flex justify-between">
          <p className="text-red-600 text-xs font-bold mt-1">
            <Skeleton height={10} width={`40%`} />
          </p>
          <p className="text-red-400 italic text-xs mt-1">
            <Skeleton height={10} width={`30%`} />
          </p>
        </div>
        <div className="flex mt-4 text-xs space-x-2">
          <Skeleton height={30} width={60} />
          <Skeleton height={30} width={60} />
          <Skeleton height={30} width={60} />
          <Skeleton height={30} width={60} />
        </div>
      </div>
    ));
  };

  // Render Selected Actions (Bulk Actions)
  const renderBulkActions = () => {
    if (selectedReturns.length === 0) return null;

    return (
      <div className="flex justify-between items-center bg-yellow-100 p-3 rounded mb-4">
        <p className="text-yellow-700 text-sm">
          {selectedReturns.length} selected
        </p>
        <div className="flex space-x-2">
          <button
            onClick={handleBulkRemove}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 flex items-center text-xs"
            title="Remove Selected"
          >
            <FaTrash className="mr-1" /> Remove Selected
          </button>
          <button
            onClick={exportToCSV}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 flex items-center text-xs"
            title="Export as CSV"
          >
            <FaDownload className="mr-1" /> Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 flex items-center text-xs"
            title="Export as PDF"
          >
            <FaDownload className="mr-1" /> Export PDF
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-gradient-to-l from-red-200 via-red-100 to-red-50 shadow-md p-5 rounded-lg mb-4 relative">
        <div onClick={() => navigate('/')} className="text-center cursor-pointer">
          <h2 className="text-md font-bold text-red-600">Travancore Backers</h2>
          <p className="text-red-400 text-xs font-bold">Return Listing and Management</p>
        </div>
        <button onClick={toggleSidebar} className="md:hidden">
          <FaFilter className="text-red-500 text-2xl" />
        </button>
      </div>

      {/* Print Loading Spinner */}
      {printLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="flex flex-col items-center">
            <FaTimes className="fa fa-spinner fa-spin text-white text-4xl mb-4" />
            <p className="text-white text-xs">Loading Return Invoice...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <p className="text-red-500 text-center mb-4 text-xs">{error}</p>}

      <div className="w-full">
        <div className="max-w-full mx-auto bg-white rounded-lg p-2">
          {/* Sidebar for mobile filters */}
          <div
            className={`fixed z-50 inset-0 bg-black bg-opacity-50 ${
              showSidebar ? 'block' : 'hidden'
            } md:hidden`}
            onClick={() => setShowSidebar(false)}
          ></div>
          <div
            className={`fixed top-0 left-0 h-full bg-white shadow-md p-4 w-64 z-50 transform ${
              showSidebar ? 'translate-x-0' : '-translate-x-full'
            } transition-transform md:translate-x-0 md:static md:hidden md:p-0`}
          >
            <h2 className="text-md font-bold text-red-600 mb-4">Filters & Sorting</h2>
            <button
              className="absolute top-2 right-2 text-red-400 hover:text-red-600 md:hidden"
              onClick={() => setShowSidebar(false)}
            >
              <FaTimes />
            </button>
            {/* Search */}
            <div className="mb-4">
              <label className="block text-xs font-bold mb-1" htmlFor="search">
                Search
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by Return No or Product Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            {/* Return Date Range */}
            <div className="mb-4">
              <label className="block text-xs font-bold mb-1" htmlFor="returnStartDate">
                Return Start Date
              </label>
              <input
                type="date"
                id="returnStartDate"
                value={returnStartDate}
                onChange={(e) => setReturnStartDate(e.target.value)}
                className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold mb-1" htmlFor="returnEndDate">
                Return End Date
              </label>
              <input
                type="date"
                id="returnEndDate"
                value={returnEndDate}
                onChange={(e) => setReturnEndDate(e.target.value)}
                className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            {/* Return Type */}
            <div className="mb-4">
              <label className="block text-xs font-bold mb-1" htmlFor="returnType">
                Return Type
              </label>
              <select
                id="returnType"
                value={returnType}
                onChange={(e) => setReturnType(e.target.value)}
                className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">All</option>
                <option value="bill">Billing Returns</option>
                <option value="purchase">Purchase Returns</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="mb-4">
              <label className="block text-xs font-bold mb-1" htmlFor="sortField">
                Sort By
              </label>
              <select
                id="sortField"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">None</option>
                <option value="returnNo">Return No</option>
                <option value="returnDate">Return Date</option>
                <option value="returnType">Return Type</option>
                <option value="products.length">Number of Products</option>
                <option value="netReturnAmount">Net Return Amount</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold mb-1" htmlFor="sortOrder">
                Sort Order
              </label>
              <select
                id="sortOrder"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={resetFilters}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-xs font-bold flex items-center"
              >
                <FaDownload className="fa fa-refresh mr-1" />
                Reset Filters
              </button>
            </div>
          </div>

          {/* Desktop Filters and Sorting */}
          <div className="hidden md:block bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:flex-wrap sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold mb-1" htmlFor="search">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search by Return No or Product Name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {/* Return Date Range */}
              <div className="min-w-[150px]">
                <label className="block text-xs font-bold mb-1" htmlFor="returnStartDate">
                  Return Start Date
                </label>
                <input
                  type="date"
                  id="returnStartDate"
                  value={returnStartDate}
                  onChange={(e) => setReturnStartDate(e.target.value)}
                  className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="min-w-[150px]">
                <label className="block text-xs font-bold mb-1" htmlFor="returnEndDate">
                  Return End Date
                </label>
                <input
                  type="date"
                  id="returnEndDate"
                  value={returnEndDate}
                  onChange={(e) => setReturnEndDate(e.target.value)}
                  className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>

              {/* Return Type */}
              <div className="min-w-[150px]">
                <label className="block text-xs font-bold mb-1" htmlFor="returnType">
                  Return Type
                </label>
                <select
                  id="returnType"
                  value={returnType}
                  onChange={(e) => setReturnType(e.target.value)}
                  className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">All</option>
                  <option value="bill">Billing Returns</option>
                  <option value="purchase">Purchase Returns</option>
                </select>
              </div>

              {/* Sorting */}
              <div className="min-w-[150px]">
                <label className="block text-xs font-bold mb-1" htmlFor="sortField">
                  Sort By
                </label>
                <select
                  id="sortField"
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">None</option>
                  <option value="returnNo">Return No</option>
                  <option value="returnDate">Return Date</option>
                  <option value="returnType">Return Type</option>
                  <option value="products.length">Number of Products</option>
                  <option value="netReturnAmount">Net Return Amount</option>
                </select>
              </div>
              <div className="min-w-[150px]">
                <label className="block text-xs font-bold mb-1" htmlFor="sortOrder">
                  Sort Order
                </label>
                <select
                  id="sortOrder"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>

              <div className="mt-auto">
                <button
                  onClick={resetFilters}
                  className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded text-xs font-bold flex items-center"
                >
                  <i className="fa fa-refresh mr-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {renderBulkActions()}

          {/* Stats Bar */}
          {userInfo.isAdmin && (
            <div className="mb-6 space-y-4">
              <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                <div className="bg-white p-4 rounded-lg shadow-md flex-1 min-w-[200px]">
                  <p className="text-xs font-bold text-red-600">Total Returns</p>
                  <p className="text-xs text-red-500">{stats.total} returns</p>
                  <p className="text-sm font-bold text-red-700">₹{stats.totalAmount.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md flex-1 min-w-[200px]">
                  <p className="text-xs font-bold text-red-600">Purchase Returns</p>
                  <p className="text-xs text-red-500">{stats.purchaseReturns} returns</p>
                  <p className="text-sm font-bold text-red-700">₹{stats.purchaseAmount.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md flex-1 min-w-[200px]">
                  <p className="text-xs font-bold text-red-600">Billing Returns</p>
                  <p className="text-xs text-red-500">{stats.billingReturns} returns</p>
                  <p className="text-sm font-bold text-red-700">₹{stats.billingAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status Tabs */}
          <div className="flex flex-wrap justify-center sm:justify-start space-x-2 mb-4">
            {['All', 'Purchase Returns', 'Billing Returns'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                  setSelectedReturns([]);
                }}
                className={`px-3 py-1 rounded text-xs font-bold ${
                  activeTab === tab
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                {tab}
                {tab === 'Purchase Returns' && ` (${stats.purchaseReturns})`}
                {tab === 'Billing Returns' && ` (${stats.billingReturns})`}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading ? (
            <div>
              <div className="hidden md:block">{renderTableSkeleton()}</div>
              <div className="md:hidden">{renderCardSkeleton()}</div>
            </div>
          ) : filteredReturns.length === 0 ? (
            <p className="text-center text-red-500 text-xs">
              No returns match your search and filter criteria.
            </p>
          ) : (
            <>
              {/* Table View for Large Screens */}
              <div className="hidden md:block" id="return-table">
                <table className="w-full text-xs text-red-500 bg-white shadow-md rounded-lg overflow-hidden">
                  <thead className="bg-red-400 text-xs text-white">
                    {renderTableHeader()}
                  </thead>
                  <tbody>{renderTableRows()}</tbody>
                </table>
              </div>

              {/* Card View for Mobile Screens */}
              <div className="md:hidden space-y-4">
                {paginatedReturns.map((returnEntry) => (
                  <div
                    key={returnEntry._id}
                    className="bg-white rounded-lg shadow-md p-6 mb-4"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedReturns.includes(returnEntry._id)}
                          onChange={() => handleSelectReturn(returnEntry._id)}
                          className="form-checkbox h-4 w-4 text-red-600"
                        />
                        <p
                          onClick={() => handleView(returnEntry)}
                          className={`text-xs font-bold text-red-600 cursor-pointer`}
                        >
                          {returnEntry.returnNo}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {/* Optional Status Indicator */}
                      </div>
                    </div>
                    <p className="text-red-600 text-xs mt-2">
                      Return Date: {new Date(returnEntry.returnDate).toLocaleDateString()}
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      Return Type: {returnEntry.returnType.charAt(0).toUpperCase() + returnEntry.returnType.slice(1)}
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      Products: {returnEntry.products.length}
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      Net Return Amount: ₹{returnEntry.netReturnAmount.toFixed(2)}
                    </p>
                    <div className="flex space-x-2 mt-4">
                      <button
                        onClick={() => printReturnInvoice(returnEntry)}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 flex items-center text-xs"
                        title="Print Invoice"
                      >
                        <FaPrint className="mr-1" /> Print
                      </button>
                      <button
                        onClick={() => handleView(returnEntry)}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 flex items-center text-xs"
                        title="View Details"
                      >
                        <FaEye className="mr-1" /> View
                      </button>
                      <button
                        onClick={() => handleRemove(returnEntry._id)}
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 flex items-center text-xs"
                        title="Remove Entry"
                      >
                        <FaTrash className="mr-1" /> Remove
                      </button>
                    </div>
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
                      ? 'bg-red-200 text-red-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  Previous
                </button>
                <span className="text-xs text-red-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 text-xs font-bold py-2 rounded-lg ${
                    currentPage === totalPages
                      ? 'bg-red-200 text-red-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  Next
                </button>
              </div>
            </>
          )}

          {/* Modal for Viewing Return Details */}
          {selectedReturn && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
              <div className="bg-white rounded-lg p-5 w-full max-w-2xl relative">
                <button
                  className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                  onClick={closeModal}
                >
                  <FaTimes />
                </button>
                <div className="mt-2 p-2">
                  <p className="text-sm text-red-600 font-bold mb-2 text-red-600">
                    Details for Return No. {selectedReturn.returnNo}
                  </p>

                  <div className="flex justify-between">
                    <p className="text-xs mb-1">
                      Return Date:{' '}
                      <span className="text-red-700">
                        {new Date(selectedReturn.returnDate).toLocaleDateString()}
                      </span>
                    </p>
                    <p className="text-xs mb-1">
                      Return Type:{' '}
                      <span className="text-red-700">
                        {selectedReturn.returnType.charAt(0).toUpperCase() + selectedReturn.returnType.slice(1)}
                      </span>
                    </p>
                  </div>

                  <div className="flex justify-between">
                    <p className="text-xs mb-1">
                      {selectedReturn.returnType === 'bill' ? 'Billing No' : 'Purchase No'}:{' '}
                      <span className="text-red-700">
                        {selectedReturn.billingNo || selectedReturn.purchaseNo || 'N/A'}
                      </span>
                    </p>
                    <p className="text-xs mb-1">
                      Discount:{' '}
                      <span className="text-red-700">₹{parseFloat(selectedReturn.discount).toFixed(2)}</span>
                    </p>
                  </div>

                  {selectedReturn.returnType === 'bill' ? (
                    <>
                      <p className="text-xs mb-1">
                        Customer Address:{' '}
                        <span className="text-red-700">{selectedReturn.customerAddress || 'N/A'}</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs mb-1">
                        Seller Name:{' '}
                        <span className="text-red-700">{selectedReturn.sellerName || 'N/A'}</span>
                      </p>
                      <p className="text-xs mb-1">
                        Seller Address:{' '}
                        <span className="text-red-700">{selectedReturn.sellerAddress || 'N/A'}</span>
                      </p>
                    </>
                  )}

                  <h3 className="text-sm font-bold text-red-600 mt-5">
                    Products: {selectedReturn.products?.length}
                  </h3>
                  <div className="mx-auto my-8">
                    <div className="relative overflow-x-auto">
                      <table className="w-full text-sm text-left text-red-500">
                        <thead className="text-xs text-red-700 uppercase bg-red-50">
                          <tr>
                            <th scope="col" className="px-4 py-3">
                              Sl
                            </th>
                            <th scope="col" className="px-4 py-3">
                              Item ID
                            </th>
                            <th scope="col" className="px-4 py-3">
                              Item Name
                            </th>
                            <th scope="col" className="px-4 py-3">
                              Quantity
                            </th>
                            <th scope="col" className="px-4 py-3">
                              Unit
                            </th>
                            <th scope="col" className="px-4 py-3">
                              Return Price
                            </th>
                            <th scope="col" className="px-4 py-3">
                              Discount
                            </th>
                            <th scope="col" className="px-4 py-3">
                              CGST (9%)
                            </th>
                            <th scope="col" className="px-4 py-3">
                              SGST (9%)
                            </th>
                            <th scope="col" className="px-4 py-3">
                              Total Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReturn?.products.map((product, index) => {
                            // Calculate per-product discount
                            const perProductDiscount =
                              selectedReturn.discount / selectedReturn.products.length || 0;

                            // Net amount after discount
                            const netAmount = product.quantity * product.returnPrice - perProductDiscount;

                            // Calculate CGST and SGST per product
                            const cgst = netAmount * 0.09;
                            const sgst = netAmount * 0.09;

                            // Total amount for the product
                            const totalAmount = netAmount + cgst + sgst;

                            return (
                              <tr
                                key={index}
                                className="bg-white border-b hover:bg-red-50"
                              >
                                <th
                                  scope="row"
                                  className="px-4 py-4 text-xs font-medium text-red-900 whitespace-nowrap"
                                >
                                  {index + 1}
                                </th>
                                <td className="px-4 py-4 text-xs text-red-600">{product.item_id || 'N/A'}</td>
                                <td className="px-4 py-4 text-xs text-red-600">{product.name || 'N/A'}</td>
                                <td className="px-4 py-4 text-xs text-red-600">{product.quantity || '0'}</td>
                                <td className="px-4 py-4 text-xs text-red-600">{product.unit || 'N/A'}</td>
                                <td className="px-4 py-4 text-xs text-red-600">₹{product.returnPrice.toFixed(2)}</td>
                                <td className="px-4 py-4 text-xs text-red-600">₹{perProductDiscount.toFixed(2)}</td>
                                <td className="px-4 py-4 text-xs text-red-600">₹{cgst.toFixed(2)}</td>
                                <td className="px-4 py-4 text-xs text-red-600">₹{sgst.toFixed(2)}</td>
                                <td className="px-4 py-4 text-xs text-red-600">₹{totalAmount.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Totals Section */}
                      <div className="mt-10 text-right mr-2">
                        <p className="text-xs mb-1">
                          Subtotal: <span className="text-red-600">₹{selectedReturn.returnAmount.toFixed(2)}</span>
                        </p>
                        {selectedReturn.cgst > 0 && (
                          <p className="text-xs mb-1">
                            CGST (9%): <span className="text-red-600">₹{selectedReturn.cgst.toFixed(2)}</span>
                          </p>
                        )}
                        {selectedReturn.sgst > 0 && (
                          <p className="text-xs mb-1">
                            SGST (9%): <span className="text-red-600">₹{selectedReturn.sgst.toFixed(2)}</span>
                          </p>
                        )}
                        <p className="text-xs mb-1">
                          Total Tax: <span className="text-red-600">₹{selectedReturn.totalTax.toFixed(2)}</span>
                        </p>
                        <p className="text-sm font-bold mb-1">
                          Grand Total: <span className="text-red-600">₹{selectedReturn.netReturnAmount.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
    </div>
  );
}
