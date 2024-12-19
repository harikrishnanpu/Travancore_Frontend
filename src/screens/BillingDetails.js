import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { useSelector } from 'react-redux';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { FaUser } from 'react-icons/fa';

const BillingList = () => {
  const navigate = useNavigate();
  const [billings, setBillings] = useState([]);
  const [selectedBilling, setSelectedBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceStartDate, setInvoiceStartDate] = useState('');
  const [invoiceEndDate, setInvoiceEndDate] = useState('');
  const [deliveryStartDate, setDeliveryStartDate] = useState('');
  const [deliveryEndDate, setDeliveryEndDate] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // Tab filters: All, Paid, Pending, Overdue, Draft
  const [statusTab, setStatusTab] = useState('All');

  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  const fetchBillings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/billing');
      setBillings(response.data);
    } catch (err) {
      setError('Failed to fetch billings.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillings();
  }, []);

  // Compute filtered data
  const filteredBillings = useMemo(() => {
    let data = [...billings];

    // Filter based on user role: non-admin can see only approved or their own submitted
    if (!userInfo.isAdmin) {
      data = data.filter(
        (billing) => billing.isApproved || billing.submittedBy === userInfo._id
      );
    }

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      data = data.filter(
        (billing) =>
          billing.invoiceNo.toLowerCase().includes(lowerSearch) ||
          billing.customerName.toLowerCase().includes(lowerSearch) ||
          billing.salesmanName.toLowerCase().includes(lowerSearch) ||
          billing.marketedBy?.toLowerCase()?.includes(lowerSearch)
      );
    }

    // Invoice Date Range Filter
    if (invoiceStartDate && invoiceEndDate) {
      const start = new Date(invoiceStartDate);
      const end = new Date(invoiceEndDate);
      data = data.filter((billing) => {
        const invoiceDate = new Date(billing.invoiceDate);
        return invoiceDate >= start && invoiceDate <= end;
      });
    }

    // Expected Delivery Date Range Filter
    if (deliveryStartDate && deliveryEndDate) {
      const start = new Date(deliveryStartDate);
      const end = new Date(deliveryEndDate);
      data = data.filter((billing) => {
        const deliveryDate = new Date(billing.expectedDeliveryDate);
        return deliveryDate >= start && deliveryDate <= end;
      });
    }

    // Determine statuses for filters
    const now = new Date();

    // Categories:
    // Paid: paymentStatus === 'Paid'
    // Draft: !isApproved
    // Overdue: expectedDeliveryDate < now && paymentStatus !== 'Paid'
    // Pending: Not paid, not overdue, not draft
    data = data.filter((billing) => {
      const isDraft = !billing.isApproved;
      const isPaid = billing.paymentStatus === 'Paid';
      const isOverdue =
        new Date(billing.expectedDeliveryDate) < now && billing.paymentStatus !== 'Paid' && !isDraft;
      const isPending = !isPaid && !isDraft && !isOverdue;

      if (statusTab === 'All') return true;
      if (statusTab === 'Paid' && isPaid) return true;
      if (statusTab === 'Pending' && isPending) return true;
      if (statusTab === 'Overdue' && isOverdue) return true;
      if (statusTab === 'Draft' && isDraft) return true;
      return false;
    });

    // Sorting
    if (sortField) {
      data.sort((a, b) => {
        let aField = a[sortField];
        let bField = b[sortField];

        // Nested fields
        if (sortField.includes('.')) {
          const fields = sortField.split('.');
          aField = fields.reduce((acc, curr) => acc[curr], a);
          bField = fields.reduce((acc, curr) => acc[curr], b);
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
    billings,
    searchTerm,
    invoiceStartDate,
    invoiceEndDate,
    deliveryStartDate,
    deliveryEndDate,
    sortField,
    sortOrder,
    statusTab,
    userInfo.isAdmin,
    userInfo._id,
  ]);

  const totalPages = Math.ceil(filteredBillings.length / itemsPerPage);

  const paginatedBillings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBillings.slice(start, start + itemsPerPage);
  }, [filteredBillings, currentPage]);

  // Calculate top stats based on filtered data
  const stats = useMemo(() => {
    const now = new Date();
    let totalAmount = 0;
    let paidInvoices = 0;
    let paidAmount = 0;
    let pendingInvoices = 0;
    let pendingAmount = 0;
    let overdueInvoices = 0;
    let overdueAmount = 0;
    let draftInvoices = 0;
    let draftAmount = 0;

    filteredBillings.forEach((b) => {
      const amount = b.grandTotal || 0;
      totalAmount += amount;

      const isDraft = !b.isApproved;
      const isPaid = b.paymentStatus === 'Paid';
      const isOverdue =
        new Date(b.expectedDeliveryDate) < now && b.paymentStatus !== 'Paid' && !isDraft;
      const isPending = !isPaid && !isDraft && !isOverdue;

      if (isPaid) {
        paidInvoices += 1;
        paidAmount += amount;
      } else if (isOverdue) {
        overdueInvoices += 1;
        overdueAmount += amount;
      } else if (isDraft) {
        draftInvoices += 1;
        draftAmount += amount;
      } else if (isPending) {
        pendingInvoices += 1;
        pendingAmount += amount;
      }
    });

    return {
      totalInvoices: filteredBillings.length,
      totalAmount,
      paidInvoices,
      paidAmount,
      pendingInvoices,
      pendingAmount,
      overdueInvoices,
      overdueAmount,
      draftInvoices,
      draftAmount,
    };
  }, [filteredBillings]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // PDF and Print functions
  const generatePDF = async (bill) => {
    setPdfLoading(true);
    try {
      const transformedProducts = bill.products.map((product) => {
        const { quantity, psRatio = '1', deliveredQuantity = 0 } = product;
        return {
          ...product,
          quantity,
          psRatio,
          deliveredQuantity,
        };
      });

      const formData = {
        invoiceNo: bill.invoiceNo,
        customerName: bill.customerName,
        customerAddress: bill.customerAddress,
        customerContactNumber: bill.customerContactNumber,
        marketedBy: bill.marketedBy,
        salesmanName: bill.salesmanName,
        invoiceDate: bill.invoiceDate,
        expectedDeliveryDate: bill.expectedDeliveryDate,
        deliveryStatus: bill.deliveryStatus,
        billingAmountReceived: bill.billingAmountReceived || 0,
        payments: bill.payments || [],
        deliveries: bill.deliveries || [],
        products: transformedProducts,
      };

      const response = await api.post('/api/print/generate-loading-slip-pdf', formData);
      const htmlContent = response.data;

      const printWindow = window.open('', '', 'height=800,width=600');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setPdfLoading(false);
      } else {
        setPdfLoading(false);
        alert('Popup blocked! Please allow popups for this website.');
      }
    } catch (err) {
      setPdfLoading(false);
      setError('Failed to generate PDF.');
      console.error(err);
    }
  };

  const printInvoice = async (bill) => {
    setPdfLoading(true);
    try {
      const cgst = ((parseFloat(bill.billingAmount) - parseFloat(bill.billingAmount / 1.18)) / 2).toFixed(2);
      const sgst = ((parseFloat(bill.billingAmount) - parseFloat(bill.billingAmount / 1.18)) / 2).toFixed(2);
      const subTotal = (parseFloat(bill.billingAmount) - parseFloat(cgst) - parseFloat(sgst)).toFixed(2);

      const formData = {
        invoiceNo: bill.invoiceNo,
        invoiceDate: bill.invoiceDate,
        salesmanName: bill.salesmanName,
        expectedDeliveryDate: bill.expectedDeliveryDate,
        deliveryStatus: bill.deliveryStatus,
        salesmanPhoneNumber: bill.salesmanPhoneNumber,
        paymentStatus: bill.paymentStatus,
        billingAmount: bill.billingAmount,
        paymentAmount: bill.paymentAmount,
        paymentMethod: bill.paymentMethod || '',
        paymentReceivedDate: bill.updatedAt || '',
        customerName: bill.customerName,
        customerAddress: bill.customerAddress,
        customerContactNumber: bill.customerContactNumber,
        marketedBy: bill.marketedBy,
        subTotal,
        cgst,
        sgst,
        discount: bill.discount,
        products: bill.products.map((product) => ({
          item_id: product.item_id,
          name: product.name,
          category: product.category,
          brand: product.brand,
          quantity: product.quantity,
          sellingPrice: product.sellingPrice,
          enteredQty: product.enteredQty,
          sellingPriceinQty: product.sellingPriceinQty,
          unit: product.unit,
          size: product.size,
        })),
      };

      const response = await api.post('/generate-invoice-html', formData);
      const htmlContent = response.data;

      const printWindow = window.open('', '', 'height=800,width=600');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        alert('Popup blocked! Please allow popups for this website.');
      }
    } catch (error) {
      setError('Failed to print invoice.');
      console.error('Error:', error);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if (window.confirm('Are you sure you want to remove this billing?')) {
      try {
        await api.delete(`/api/billing/billings/delete/${id}?userId=${userInfo._id}`);
        setBillings(billings.filter((billing) => billing._id !== id));
      } catch (error) {
        setError('Error occurred while deleting the billing.');
        console.error(error);
      }
    }
  };

  const handleApprove = async (bill) => {
    try {
      if (window.confirm('Are you sure you want to approve this billing?')) {
        await api.put(`/api/billing/bill/approve/${bill._id}`, { userId: userInfo._id });
        setBillings(
          billings.map((b) =>
            b._id === bill._id ? { ...b, isApproved: true } : b
          )
        );
      }
    } catch (error) {
      setError('Error occurred while approving the billing.');
      console.error(error);
    }
  };

  const handleView = (billing) => {
    setSelectedBilling(billing);
  };

  const closeModal = () => {
    setSelectedBilling(null);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setInvoiceStartDate('');
    setInvoiceEndDate('');
    setDeliveryStartDate('');
    setDeliveryEndDate('');
    setSortField('');
    setSortOrder('asc');
    setStatusTab('All');
  };


  const renderCard = (billing) => (
    <div
      key={billing.invoiceNo}
      className="bg-white rounded-lg shadow-md p-6 mb-4 transition-transform transform hover:scale-100 duration-200"
    >
      <div className="flex justify-between items-center">
        <p
          onClick={() => navigate(`/driver/${billing._id}`)}
          className={`text-md flex cursor-pointer font-bold ${billing.isApproved ? 'text-red-600' : 'text-yellow-600'}`}
        >
          {billing.invoiceNo} {billing.isApproved && <img className='h-4 w-4 ml-1 mt-1' src='/images/tick.svg' alt="Approved" />}
        </p>
        <div className="flex items-center">
          {renderStatusIndicator(billing)}
        </div>
      </div>
      <p className="text-gray-600 text-xs mt-2">Customer: {billing.customerName}</p>
      <p className="text-gray-600 text-xs mt-1">Salesman: {billing.salesmanName}</p>
      <p className="text-gray-600 text-xs mt-1">
        Expected Delivery:{' '}
        {new Date(billing.expectedDeliveryDate).toLocaleDateString()}
      </p>
      <div className="flex justify-between">
        <p className="text-gray-600 text-xs font-bold mt-1">
          Total Products: {billing.products.length}
        </p>
        <p className="text-gray-400 italic text-xs mt-1">
          Last Edited:{' '}
          {new Date(billing.updatedAt ? billing.updatedAt : billing.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex mt-4 text-xs space-x-2">
        <button
          disabled={!userInfo.isAdmin && billing.isApproved}
          onClick={() => navigate(`/bills/edit/${billing._id}`)}
          className={`${billing.isApproved && !userInfo.isAdmin ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'} text-white px-3 font-bold py-1 rounded flex items-center`}
        >
          <i className="fa fa-pen mr-2"></i> Edit
        </button>
        {userInfo.isAdmin && (
          <button
            onClick={() => generatePDF(billing)}
            className="bg-red-500 hover:bg-red-600 text-white px-3 font-bold py-1 rounded flex items-center"
          >
            <i className="fa fa-truck mr-2"></i>
          </button>
        )}
        <button
          onClick={() => handleView(billing)}
          className="bg-red-500 hover:bg-red-600 text-white px-3 font-bold py-1 rounded flex items-center"
        >
          <i className="fa fa-eye mr-2"></i> View
        </button>
        <button
          onClick={() => handleRemove(billing._id)}
          className="bg-red-500 hover:bg-red-600 text-white px-3 font-bold py-1 rounded flex items-center"
        >
          <i className="fa fa-trash mr-2"></i> 
        </button>
        {userInfo.isAdmin && (
          <>
            <button
              onClick={() => printInvoice(billing)}
              className="bg-red-500 hover:bg-red-600 text-white px-3 font-bold py-1 rounded flex items-center"
            >
              <i className="fa fa-print mr-2"></i>
            </button>
            {!billing.isApproved && (
              <button
                onClick={() => handleApprove(billing)}
                className="bg-green-500 hover:bg-green-600 text-white px-3 font-bold py-1 rounded flex items-center"
              >
                Approve
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );


  const renderStatusIndicator = (billing) => {
    const { deliveryStatus, paymentStatus } = billing;
    let color = 'red';
    if (deliveryStatus === 'Delivered' && paymentStatus === 'Paid') {
      color = 'green';
    } else if (deliveryStatus === 'Delivered' || paymentStatus === 'Paid') {
      color = 'yellow';
    }

    return (
      <span className="relative flex h-3 w-3 mx-auto">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${color}-400 opacity-75`}
        ></span>
        <span
          className={`relative inline-flex rounded-full h-3 w-3 bg-${color}-500`}
        ></span>
      </span>
    );
  };

  const renderTableSkeleton = () => {
    const skeletonRows = Array.from({ length: itemsPerPage }, (_, index) => index);
    return (
      <table className="w-full text-xs text-gray-500 bg-white shadow-md rounded-lg overflow-hidden">
        <thead className="bg-gray-200">
          <tr className="divide-y">
            <th className="px-4 py-2 text-left">Invoice No</th>
            <th className="px-2 py-2">Customer</th>
            <th className="px-2 py-2">Payment Status</th>
            <th className="px-2 py-2">Delivery Status</th>
            <th className="px-2 py-2">Amount</th>
            <th className="px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {skeletonRows.map((row) => (
            <tr key={row} className="hover:bg-gray-100 divide-y">
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

  const renderCardSkeleton = () => {
    const skeletonCards = Array.from({ length: itemsPerPage }, (_, index) => index);
    return skeletonCards.map((card) => (
      <div
        key={card}
        className="bg-white rounded-lg shadow-md p-4 mb-4 animate-pulse"
      >
        <Skeleton height={20} width={`60%`} />
        <Skeleton height={10} width={`80%`} className="mt-2" />
        <Skeleton height={10} width={`70%`} className="mt-1" />
        <Skeleton height={10} width={`50%`} className="mt-1" />
        <div className="flex mt-4 space-x-2">
          <Skeleton height={30} width={60} />
          <Skeleton height={30} width={60} />
          <Skeleton height={30} width={60} />
          <Skeleton height={30} width={60} />
        </div>
      </div>
    ));
  };

  return (
    <>
      {/* PDF Loading Spinner */}
      {pdfLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="flex flex-col items-center">
            <i className="fa fa-spinner fa-spin text-white text-4xl mb-4"></i>
            <p className="text-white text-xs">Generating PDF...</p>
          </div>
        </div>
      )}

<div className="flex items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 relative">
        <div
          onClick={() => navigate('/')}
          className="text-center cursor-pointer"
        >
          <h2 className="text-md font-bold text-red-600">KK TRADING</h2>
          <p className="text-gray-400 text-xs font-bold">
            All Billings Information And Updation
          </p>
        </div>
        <i className="fa fa-list text-gray-500" />
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-center mb-4 text-xs">{error}</p>
      )}

      {/* Page Header and Stats */}
      <div className="mb-6 space-y-4">

        {/* Stats bar */}
        <div className="flex flex-wrap justify-center sm:justify-start gap-4">
          <div className="bg-white p-4 rounded-lg shadow-md flex-1 min-w-[200px]">
            <p className="text-xs font-bold text-red-600">Total</p>
            <p className="text-xs text-gray-500">{stats.totalInvoices} invoices</p>
            <p className="text-sm font-bold text-gray-700">Rs. {stats.totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md flex-1 min-w-[200px]">
            <p className="text-xs font-bold text-green-600">Paid</p>
            <p className="text-xs text-gray-500">{stats.paidInvoices} invoices</p>
            <p className="text-sm font-bold text-gray-700">Rs. {stats.paidAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md flex-1 min-w-[200px]">
            <p className="text-xs font-bold text-yellow-600">Pending</p>
            <p className="text-xs text-gray-500">{stats.pendingInvoices} invoices</p>
            <p className="text-sm font-bold text-gray-700">Rs. {stats.pendingAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md flex-1 min-w-[200px]">
            <p className="text-xs font-bold text-red-600">Overdue</p>
            <p className="text-xs text-gray-500">{stats.overdueInvoices} invoices</p>
            <p className="text-sm font-bold text-gray-700">Rs. {stats.overdueAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md flex-1 min-w-[200px]">
            <p className="text-xs font-bold text-blue-600">Draft</p>
            <p className="text-xs text-gray-500">{stats.draftInvoices} invoices</p>
            <p className="text-sm font-bold text-gray-700">Rs. {stats.draftAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Tabs for Status Filter */}
      <div className="flex flex-wrap justify-center sm:justify-start space-x-2 mb-4">
        {['All', 'Paid', 'Pending', 'Overdue', 'Draft'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatusTab(tab); setCurrentPage(1); }}
            className={`px-3 py-1 rounded text-xs font-bold ${
              statusTab === tab
                ? 'bg-red-600 text-white'
                : 'bg-gray-50 text-red-700 hover:bg-red-100'
            }`}
          >
            {tab} {tab !== 'All' && tab === 'Paid' && `(${stats.paidInvoices})`}
            {tab !== 'All' && tab === 'Pending' && `(${stats.pendingInvoices})`}
            {tab !== 'All' && tab === 'Overdue' && `(${stats.overdueInvoices})`}
            {tab !== 'All' && tab === 'Draft' && `(${stats.draftInvoices})`}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:flex-wrap sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold mb-1" htmlFor="search">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by Invoice No, Customer, Salesman..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Invoice Start/End Date */}
          <div className="min-w-[150px]">
            <label className="block text-xs font-bold mb-1" htmlFor="invoiceStartDate">
              Invoice Start Date
            </label>
            <input
              type="date"
              id="invoiceStartDate"
              value={invoiceStartDate}
              onChange={(e) => setInvoiceStartDate(e.target.value)}
              className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-bold mb-1" htmlFor="invoiceEndDate">
              Invoice End Date
            </label>
            <input
              type="date"
              id="invoiceEndDate"
              value={invoiceEndDate}
              onChange={(e) => setInvoiceEndDate(e.target.value)}
              className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Delivery Start/End Date */}
          <div className="min-w-[150px]">
            <label className="block text-xs font-bold mb-1" htmlFor="deliveryStartDate">
              Delivery Start Date
            </label>
            <input
              type="datetime-local"
              id="deliveryStartDate"
              value={deliveryStartDate}
              onChange={(e) => setDeliveryStartDate(e.target.value)}
              className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-bold mb-1" htmlFor="deliveryEndDate">
              Delivery End Date
            </label>
            <input
              type="datetime-local"
              id="deliveryEndDate"
              value={deliveryEndDate}
              onChange={(e) => setDeliveryEndDate(e.target.value)}
              className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Sort */}
          <div className="min-w-[200px]">
            <label className="block text-xs font-bold mb-1" htmlFor="sortField">
              Sort By
            </label>
            <div className="flex items-center space-x-1">
              <select
                id="sortField"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">None</option>
                <option value="invoiceNo">Invoice No</option>
                <option value="invoiceDate">Invoice Date</option>
                <option value="expectedDeliveryDate">Expected Delivery Date</option>
                <option value="customerName">Customer Name</option>
                <option value="salesmanName">Salesman Name</option>
                <option value="grandTotal">Amount</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="bg-red-200 rounded px-2 py-2 text-xs flex justify-center items-center focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={resetFilters}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div>
          <div className="hidden md:block">
            {renderTableSkeleton()}
          </div>
          <div className="md:hidden">
            {renderCardSkeleton()}
          </div>
        </div>
      ) : filteredBillings.length === 0 ? (
        <p className="text-center text-gray-500 text-xs">
          No invoices match your search and filter criteria.
        </p>
      ) : (
        <>
          {/* Table view for large screens */}
          <div className="hidden md:block">
          <table className="w-full text-xs text-gray-500 bg-white shadow-md rounded-lg overflow-hidden">
                  <thead className="bg-red-600 text-xs text-white">
                    <tr className="divide-y">
                      <th className="px-4 py-2 text-left">Status</th>
                      <th
                        className="px-2 py-2 cursor-pointer"
                        onClick={() => {
                          setSortField('invoiceNo');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        Invoice No {sortField === 'invoiceNo' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-2 py-2 cursor-pointer"
                        onClick={() => {
                          setSortField('invoiceDate');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        Invoice Date {sortField === 'invoiceDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-2 py-2 cursor-pointer"
                        onClick={() => {
                          setSortField('deliveryDate');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        Delivery Date {sortField === 'deliveryDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>


                      <th
                        className="px-2 py-2 cursor-pointer"
                        onClick={() => {
                          setSortField('showroom');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                       Showroom {sortField === 'showroom' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>

                      <th
                        className="px-2 py-2 cursor-pointer"
                        onClick={() => {
                          setSortField('salesmanName');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        Salesman Name {sortField === 'salesmanName' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>


                      <th
                        className="px-2 py-2 cursor-pointer"
                        onClick={() => {
                          setSortField('customerName');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        Customer Name {sortField === 'customerName' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-2 py-2 cursor-pointer"
                        onClick={() => {
                          setSortField('products.length');
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        Products {sortField === 'products.length' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBillings.map((billing) => (
                      <tr
                        key={billing.invoiceNo}
                        className="hover:bg-gray-100 divide-y divide-x"
                      >
                        <td className="px-4 py-2 text-center">
                          {renderStatusIndicator(billing)}
                        </td>
                        <td
                          onClick={() => navigate(`/driver/${billing._id}`)}
                          className={`px-2 cursor-pointer flex text-xs font-bold py-2 ${billing.isApproved ? 'text-red-600' : 'text-yellow-600'}`}
                        >
                          {billing.invoiceNo} {billing.isApproved && <img className='h-2 w-2 ml-1 mt-1' src='/images/tick.svg' alt="Approved" />}
                        </td>
                        <td className="px-2 text-xs py-2">
                          {new Date(billing.invoiceDate).toLocaleDateString()}
                        </td>

                        <td className="px-2 text-xs py-2">
                          {new Date(billing.expectedDeliveryDate).toLocaleDateString()}
                        </td>

                        <td className="px-2 text-xs py-2">
                          {billing.showroom}
                        </td>


                        <td className="px-2 text-xs py-2">
                          {billing.salesmanName}
                        </td>
                        <td className="px-2 text-xs py-2">
                          {billing.customerName}
                        </td>
                        <td className="px-2 text-xs py-2">
                          {billing.products.length}
                        </td>
                        <td className="px-2 text-xs py-2">
                          <div className="flex mt-2 text-xs space-x-1">
                            {userInfo.isAdmin && (
                              <button
                                onClick={() => navigate(`/bills/edit/${billing._id}`)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 font-bold py-1 rounded flex items-center"
                              >
                                <i className="fa fa-pen mr-1"></i> Edit
                              </button>
                            )}
                            {userInfo.isAdmin && (
                              <button
                                onClick={() => generatePDF(billing)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 font-bold py-1 rounded flex items-center"
                              >
                                <i className="fa fa-truck mr-1"></i> PDF
                              </button>
                            )}
                            <button
                              onClick={() => handleView(billing)}
                              className="bg-red-500 hover:bg-red-600 text-white px-2 font-bold py-1 rounded flex items-center"
                            >
                              <i className="fa fa-eye mr-1"></i> View
                            </button>
                            <button
                              onClick={() => handleRemove(billing._id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-2 font-bold py-1 rounded flex items-center"
                            >
                              <i className="fa fa-trash mr-1"></i> Delete
                            </button>
                            {userInfo.isAdmin && (
                              <>
                                <button
                                  onClick={() => printInvoice(billing)}
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 font-bold py-1 rounded flex items-center"
                                >
                                  <i className="fa fa-print mr-1"></i> Print
                                </button>
                                {!billing.isApproved && (
                                  <button
                                    onClick={() => handleApprove(billing)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-2 font-bold py-1 rounded flex items-center"
                                  >
                                    Approve
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
          </div>

          {/* Card view for small screens */}
          <div className="md:hidden">
          {paginatedBillings.map(renderCard)}
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 text-xs font-bold py-2 rounded-lg ${
                currentPage === 1
                  ? 'bg-red-200 text-red-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
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
                  ? 'bg-red-200 text-red-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Full-screen Modal for Viewing Billing Details */}
      {selectedBilling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white w-full h-full overflow-auto relative p-4 sm:p-8">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl"
              onClick={closeModal}
            >
              ×
            </button>
            <div className="p-6">
              <h2 className="text-lg font-bold text-red-600 mb-4 flex items-center space-x-2">
                <FaUser className="text-red-600" />
                <span>Invoice Details - {selectedBilling.invoiceNo}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="mb-1">
                    Salesman Name:{' '}
                    <span className="text-gray-700">{selectedBilling.salesmanName}</span>
                  </p>
                  <p className="mb-1">
                    Marketed By:{' '}
                    <span className="text-gray-700">{selectedBilling.marketedBy}</span>
                  </p>
                  <p className="mb-1 flex items-center">
                    <FaUser className="text-gray-400 mr-1" />
                    Customer Name: <span className="text-gray-700 ml-1">{selectedBilling.customerName}</span>
                  </p>
                  <p className="mb-1">
                    Customer Address:{' '}
                    <span className="text-gray-700">{selectedBilling.customerAddress}</span>
                  </p>
                  <p className="mb-1">
                    Customer Contact:{' '}
                    <span className="text-gray-700">{selectedBilling.customerContactNumber}</span>
                  </p>
                </div>
                <div>
                  <p className="mb-1">
                    Invoice Date:{' '}
                    <span className="text-gray-700">{new Date(selectedBilling.invoiceDate).toLocaleString()}</span>
                  </p>
                  <p className="mb-1">
                    Expected Delivery:{' '}
                    <span className="text-gray-700">{new Date(selectedBilling.expectedDeliveryDate).toLocaleString()}</span>
                  </p>
                  <p className="mb-1">
                    Delivery Status:{' '}
                    <span
                      className={`px-2 py-1 rounded text-white text-xs ${
                        selectedBilling.deliveryStatus === 'Delivered'
                          ? 'bg-green-500'
                          : selectedBilling.deliveryStatus === 'Partially Delivered'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                    >
                      {selectedBilling.deliveryStatus}
                    </span>
                  </p>
                  <p className="mb-1">
                    Payment Status:{' '}
                    <span
                      className={`px-2 py-1 rounded text-white text-xs ${
                        selectedBilling.paymentStatus === 'Paid'
                          ? 'bg-green-500'
                          : selectedBilling.paymentStatus === 'Partial'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                    >
                      {selectedBilling.paymentStatus}
                    </span>
                  </p>
                  <p className="mb-1">
                    Remark: <span className="text-gray-700">{selectedBilling.remark}</span>
                  </p>
                </div>
              </div>

              <hr className="my-4" />

              <h3 className="text-md font-bold text-red-600 mb-2">
                Products ({selectedBilling.products.length})
              </h3>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm text-gray-500">
                  <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                    <tr>
                      <th className="px-4 py-3">Sl</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Del.Qty</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBilling.products.map((product, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-4 text-xs font-medium text-gray-900 whitespace-nowrap">
                          {index + 1}
                        </td>
                        <td className="px-2 py-4 text-xs text-gray-900 flex items-center space-x-1">
                          <FaUser className="text-gray-400" />
                          <span>{product.name}</span>
                        </td>
                        <td className="px-2 py-4 text-xs">{product.item_id}</td>
                        <td className="px-2 py-4 text-xs">{product.quantity}</td>
                        <td className="px-2 py-4 text-xs">{product.deliveredQuantity}</td>
                        <td className="px-2 py-4 text-xs">
                          <span
                            className={`px-2 py-1 rounded text-white text-xs ${
                              product.deliveryStatus === 'Delivered'
                                ? 'bg-green-500'
                                : product.deliveryStatus === 'Partially Delivered'
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                          >
                            {product.deliveryStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right">
                <p className="text-sm mb-1">
                  Sub Total:{' '}
                  <span className="text-gray-600">
                    Rs. {((parseFloat(selectedBilling.grandTotal) / 1.18)).toFixed(2)}
                  </span>
                </p>
                <p className="text-sm mb-1">
                  GST (18%):{' '}
                  <span className="text-gray-600">
                    Rs. {(parseFloat(selectedBilling.grandTotal) - parseFloat(selectedBilling.grandTotal / 1.18)).toFixed(2)}
                  </span>
                </p>
                <p className="text-sm mb-1">
                  Discount:{' '}
                  <span className="text-gray-600">
                    Rs. {parseFloat(selectedBilling.discount).toFixed(2)}
                  </span>
                </p>
                <p className="text-md font-bold mb-1">
                  Grand Total:{' '}
                  <span className="text-gray-800">
                    Rs. {parseFloat(selectedBilling.grandTotal).toFixed(2)}
                  </span>
                </p>
                <p className="text-sm mb-1">
                  Amount Received:{' '}
                  <span className="text-green-500 font-bold">
                    Rs. {parseFloat(selectedBilling.billingAmountReceived).toFixed(2)}
                  </span>
                </p>
              </div>

              <hr className="my-4" />

              {/* Payments */}
              {selectedBilling.payments && selectedBilling.payments.length > 0 && (
                <>
                  <h3 className="text-md font-bold text-red-600 mb-2">
                    Payments ({selectedBilling.payments.length})
                  </h3>
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm text-gray-500">
                      <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                        <tr>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBilling.payments.map((pay, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="px-2 py-4 text-xs">Rs. {pay.amount}</td>
                            <td className="px-2 py-4 text-xs">{pay.method}</td>
                            <td className="px-2 py-4 text-xs">{pay.referenceId}</td>
                            <td className="px-2 py-4 text-xs">{new Date(pay.date).toLocaleString()}</td>
                            <td className="px-2 py-4 text-xs">{pay.remark}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Deliveries */}
              {selectedBilling.deliveries && selectedBilling.deliveries.length > 0 && (
                <>
                  <h3 className="text-md font-bold text-red-600 mb-2">
                    Deliveries ({selectedBilling.deliveries.length})
                  </h3>
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm text-gray-500">
                      <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                        <tr>
                          <th className="px-4 py-3">Delivery ID</th>
                          <th className="px-4 py-3">Driver Name</th>
                          <th className="px-4 py-3">Delivery Status</th>
                          <th className="px-4 py-3">Fuel Charge</th>
                          <th className="px-4 py-3">Other Expenses</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBilling.deliveries.map((d, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="px-2 py-4 text-xs">{d.deliveryId}</td>
                            <td className="px-2 py-4 text-xs">{d.driverName}</td>
                            <td className="px-2 py-4 text-xs">{d.deliveryStatus}</td>
                            <td className="px-2 py-4 text-xs">Rs. {d.fuelCharge}</td>
                            <td className="px-2 py-4 text-xs">
                              {d.otherExpenses && d.otherExpenses.length > 0 ? d.otherExpenses.map((oe, idx) => (
                                <div key={idx}>
                                  Amount: Rs. {oe.amount}, Remark: {oe.remark}
                                </div>
                              )) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BillingList;
