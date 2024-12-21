// DailyTransactions.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { useSelector } from 'react-redux';

const ErrorModal = ({ message, onClose }) => (
  <div className="fixed inset-0 flex items-center justify-center z-50">
    <div className="bg-white rounded-md p-4 shadow-lg relative w-11/12 max-w-sm">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
      >
        ×
      </button>
      <p className="text-sm text-gray-700">{message}</p>
    </div>
  </div>
);

const SuccessModal = ({ message, onClose }) => (
  <div className="fixed inset-0 flex items-start justify-center z-50">
    <div className="bg-green-500 text-white rounded-md p-4 shadow-lg relative w-11/12 max-w-sm mt-8 animate-slide-down">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-white hover:text-gray-100 text-xl"
      >
        ×
      </button>
      <p className="text-sm">{message}</p>
    </div>
  </div>
);

const DailyTransactions = () => {
  const navigate = useNavigate();
  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  // States for transactions from various sources
  const [transactions, setTransactions] = useState([]);
  const [billings, setBillings] = useState([]);
  const [billingPayments, setBillingPayments] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [purchasePayments, setPurchasePayments] = useState([]);
  const [transportPayments, setTransportPayments] = useState([]);

  // Categories & Accounts
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // Loading & Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Success modal states
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Date filters: if admin => (fromDate, toDate), else single date
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  // Active tab: all, in, out, transfer
  const [activeTab, setActiveTab] = useState('all');

  // Totals
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);
  const [totalTransfer, setTotalTransfer] = useState(0);


  // Add Transaction Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('in');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Check screen size on component mount
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false); // Close sidebar on mobile screens
    }
  }, [window.innerWidth]);


  const [transactionData, setTransactionData] = useState({
    date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16),
    amount: '',
    paymentFrom: '',
    paymentTo: '',
    category: '',
    method: '',
    remark: '',
    billId: '',
    purchaseId: '',
    transportId: '',
  });

  // For adding a new category
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Search & Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [sortOption, setSortOption] = useState('date_desc');

  // ----------------------------------
  // Fetch Categories
  // ----------------------------------
  const fetchCategories = async () => {
    try {
      const catRes = await api.get('/api/daily/transactions/categories');
      setCategories(catRes.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ----------------------------------
  // Success Modal Timeout
  // ----------------------------------
  useEffect(() => {
    let timer;
    if (isSuccessOpen) {
      timer = setTimeout(() => {
        setIsSuccessOpen(false);
        setSuccessMessage('');
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isSuccessOpen]);

  // ----------------------------------
  // Generate Report
  // ----------------------------------
  const handleGenerateReport = async () => {
    try {
      // Prepare the current filters and sorting options
      const reportParams = {
        fromDate,
        toDate,
        activeTab,
        filterCategory,
        filterMethod,
        searchQuery,
        sortOption,
      };

      // Prepare the data to send (allTransactions already reflects current filters/sorts)
      const reportData = allTransactions;

      // Send a POST request to the backend to generate the report
      const response = await api.post(
        '/api/print/daily/generate-report',
        { reportData, reportParams },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          responseType: 'text', // Expecting HTML content as text
        }
      );

      // Open a new popup window
      const reportWindow = window.open('', '_blank', 'width=1200,height=800');

      if (reportWindow) {
        // Write the received HTML content into the popup window
        reportWindow.document.write(response.data);
        reportWindow.document.close();
      } else {
        setError('Unable to open popup window. Please allow popups for this website.');
      }
    } catch (err) {
      setError('Failed to generate report.');
      console.error(err);
    }
  };

  // ----------------------------------
  // Fetch All Transactions
  // ----------------------------------
  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const [
        catRes,
        dailyTransRes,
        billingRes,
        customerPayRes,
        purchaseRes,
        transportRes,
      ] = await Promise.all([
        api.get('/api/daily/transactions/categories'),
        api.get('/api/daily/transactions', { params: { fromDate, toDate } }),
        api.get('/api/daily/allbill/payments', { params: { fromDate, toDate } }),
        api.get('/api/customer/daily/payments', { params: { fromDate, toDate } }),
        api.get('/api/seller/daily/payments', { params: { fromDate, toDate } }),
        api.get('/api/transportpayments/daily/payments', { params: { fromDate, toDate } }),
      ]);

      // Billing data
      const { billingsRes: billingData, payments: paymentData, otherExpenses: expenseData } =
        billingRes.data;

      // Customer payments
      const customerPaymentsData = customerPayRes.data;

      // Mark sources for each transaction type
      const dailyTransWithSource = dailyTransRes.data.map((t) => ({
        ...t,
        source: 'daily',
      }));

      setTransactions(dailyTransWithSource);
      setBillings(billingData);
      setBillingPayments(paymentData);
      setCustomerPayments(
        customerPaymentsData.flatMap((customer) =>
          (customer.payments || []).map((p, index) => ({
            ...p,
            source: 'customerPayment',
            paymentFrom: customer.customerName,
            // If _id doesn't exist, build a unique fallback
            _id: p._id || `customer-payment-${customer.customerId}-${index}`,
          }))
        )
      );
      setOtherExpenses(
        expenseData.map((exp, index) => ({
          ...exp,
          source: 'expense',
          _id: exp._id || `expense-${index}`,
        }))
      );
      setPurchasePayments(
        purchaseRes.data.flatMap((seller) =>
          (seller.payments || []).map((p, index) => ({
            ...p,
            source: 'purchasePayment',
            sellerName: seller.sellerName,
            _id: p._id || `purchase-${seller.sellerId}-${index}`,
          }))
        )
      );
      setTransportPayments(
        transportRes.data.flatMap((transport) =>
          (transport.payments || []).map((p, index) => ({
            ...p,
            source: 'transportPayment',
            transportName: transport.transportName,
            _id: p._id || `transport-${transport.transportId}-${index}`,
          }))
        )
      );
      setCategories(catRes.data);

      calculateTotals(
        dailyTransWithSource,
        paymentData,
        expenseData,
        customerPaymentsData.flatMap((customer) => customer.payments || []),
        purchaseRes.data.flatMap((seller) => seller.payments || []),
        transportRes.data.flatMap((transport) => transport.payments || [])
      );
    } catch (err) {
      setError('Failed to fetch transactions.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------
  // Calculate Totals
  // ----------------------------------
  const calculateTotals = (
    transactionsData,
    billingPaymentsData,
    expenseData,
    customerPaymentsData,
    purchasePaymentsData,
    transportPaymentsData
  ) => {
    let totalInAmount = 0;
    let totalOutAmount = 0;
    let totalTransferAmount = 0;

    // Daily transactions (in/out/transfer)
    transactionsData.forEach((trans) => {
      const amount = parseFloat(trans.amount) || 0;
      if (trans.type === 'in') totalInAmount += amount;
      else if (trans.type === 'out') totalOutAmount += amount;
      else if (trans.type === 'transfer') totalTransferAmount += amount;
      // transfer doesn't affect net total in/out
    });

    // Billing Payments (in)
    billingPaymentsData.forEach((payment) => {
      totalInAmount += parseFloat(payment.amount) || 0;
    });

    // Customer Payments (in)
    customerPaymentsData.forEach((payment) => {
      totalInAmount += parseFloat(payment.amount) || 0;
    });

    // Other Expenses (out)
    expenseData.forEach((expense) => {
      totalOutAmount += parseFloat(expense.amount) || 0;
    });

    // Purchase Payments (out)
    purchasePaymentsData.forEach((payment) => {
      totalOutAmount += parseFloat(payment.amount) || 0;
    });

    // Transport Payments (out)
    transportPaymentsData.forEach((payment) => {
      totalOutAmount += parseFloat(payment.amount) || 0;
    });

    setTotalIn(Number(totalInAmount.toFixed(2)));
    setTotalOut(Number(totalOutAmount.toFixed(2)));
    setTotalTransfer(Number(totalTransferAmount.toFixed(2)));
  };

  // ----------------------------------
  // On mount, fetch transactions & accounts
  // ----------------------------------
  useEffect(() => {
    fetchTransactions();
    const fetchAccounts = async () => {
      try {
        const accountsRes = await api.get('/api/accounts/allaccounts');
        setAccounts(accountsRes.data);
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
      }
    };
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  // ----------------------------------
  // Tab Handler
  // ----------------------------------
  const handleTabChange = (tab) => setActiveTab(tab);

  // ----------------------------------
  // Open/Close Add Transaction Modal
  // ----------------------------------
  const openModal = (type) => {
    setModalType(type);
    setTransactionData({
      date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
      amount: '',
      paymentFrom: '',
      paymentTo: '',
      category: '',
      method: '',
      remark: '',
      billId: '',
      purchaseId: '',
      transportId: '',
    });
    setNewCategoryName('');
    setShowAddCategory(false);
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError('');
  };

  // ----------------------------------
  // Add Transaction (Submit)
  // ----------------------------------
  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (isNaN(transactionData.amount) || parseFloat(transactionData.amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (modalType === 'in' && !transactionData.paymentFrom.trim()) {
      setError('Please enter a payment source.');
      return;
    }

    if (modalType === 'out' && !transactionData.paymentTo.trim()) {
      setError('Please enter a payment destination.');
      return;
    }

    if (modalType === 'transfer') {
      if (!transactionData.paymentFrom.trim() || !transactionData.paymentTo.trim()) {
        setError('Please select both payment source and destination.');
        return;
      }
      if (transactionData.paymentFrom.trim() === transactionData.paymentTo.trim()) {
        setError('Payment source and destination cannot be the same.');
        return;
      }
    }

    if (!transactionData.category.trim() && !newCategoryName.trim()) {
      setError('Please select or enter a category.');
      return;
    }

    if (!transactionData.method.trim()) {
      setError('Please select a payment method.');
      return;
    }

    try {
      // If adding a new category
      if (showAddCategory) {
        if (!newCategoryName.trim()) {
          setError('Please enter a new category name.');
          return;
        }
        const categoryRes = await api.post('/api/daily/transactions/categories', {
          name: newCategoryName.trim(),
        });
        setCategories([...categories, categoryRes.data]);
        setTransactionData({
          ...transactionData,
          category: categoryRes.data.name,
        });
      }

      const payload = {
        ...transactionData,
        type: modalType,
        userId: userInfo._id,
      };

      // Different endpoints if it's a transfer or specific categories
      if (modalType === 'transfer') {
        await api.post('/api/daily/trans/transfer', payload);
      } else if (transactionData.category === 'Purchase Payment') {
        // If user explicitly selects "Purchase Payment"
        await api.post('/api/purchases/purchases/payments', payload);
      } else if (transactionData.category === 'Transport Payment') {
        // If user explicitly selects "Transport Payment"
        await api.post('/api/transport/payments', payload);
      } else {
        // Regular daily transaction
        await api.post('/api/daily/transactions', payload);
      }

      // Show success modal
      setSuccessMessage('Transaction added successfully!');
      setIsSuccessOpen(true);

      // Close the Add Transaction modal
      closeModal();

      // Refresh
      fetchTransactions();
    } catch (err) {
      setError('Failed to add transaction.');
      console.error(err);
    }
  };

  // ----------------------------------
  // Add a New Category Directly
  // ----------------------------------
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setError('Category name cannot be empty.');
      return;
    }

    try {
      const response = await api.post('/api/daily/transactions/categories', {
        name: newCategoryName.trim(),
      });
      setCategories([...categories, response.data]); // Add new category to the list
      setTransactionData({ ...transactionData, category: response.data.name });
      setShowAddCategory(false);
      setNewCategoryName('');
      setError('');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError(err.response.data.message || 'Error adding category.');
      } else {
        setError('Server error. Please try again later.');
      }
    }
  };

  // Toggle showAddCategory
  const handleAddNewCategoryToggle = () => {
    setShowAddCategory(!showAddCategory);
    setNewCategoryName('');
  };

  // ----------------------------------
  // Delete Transaction (only from 'daily')
  // ----------------------------------
  const handleDeleteTransaction = async (id) => {
    try {
      await api.delete(`/api/daily/transactions/${id}`);
      fetchTransactions();
    } catch (err) {
      setError('Failed to delete transaction.');
      console.error(err);
    }
  };

  // ----------------------------------
  // Merge & Filter & Sort All Transactions
  // ----------------------------------
  const allTransactions = useMemo(() => {
    // 1) Filter daily transactions by tab
    let mainFiltered;
    if (activeTab === 'all') mainFiltered = [...transactions];
    else mainFiltered = transactions.filter((t) => t.type === activeTab);

    // 2) Build typed arrays from others if tab = all or matches type (in/out).
    let billingPaymentsFormatted = [];
    let customerPaymentsFormatted = [];
    let expenses = [];
    let pPayments = [];
    let tPayments = [];

    // Billing (always in)
    if (activeTab === 'all' || activeTab === 'in') {
      billingPaymentsFormatted = billingPayments.map((payment, index) => ({
        _id: payment._id || `billing-payment-${index}`,
        date: payment.date,
        amount: payment.amount,
        paymentFrom: payment.paymentFrom || 'Unknown Customer',
        category: 'Billing Payment',
        method: payment.method || 'cash',
        remark: payment.remark || 'Payment received',
        type: 'in',
        source: 'billingPayment',
      }));
    }

    // Customer payments (always in)
    if (activeTab === 'all' || activeTab === 'in') {
      customerPaymentsFormatted = customerPayments.map((payment) => ({
        ...payment,
        type: 'in',
        category: payment.category || 'Customer Payment',
        method: payment.method || 'cash',
      }));
    }

    // Other expenses (always out)
    if (activeTab === 'all' || activeTab === 'out') {
      expenses = otherExpenses.map((expense) => ({
        ...expense,
        type: 'out',
        paymentTo: 'Other Expense',
        category: 'Other Expense',
        method: expense.method || 'cash',
        remark: expense.remark || 'Additional expense',
      }));
    }

    // Purchase payments (always out)
    if (activeTab === 'all' || activeTab === 'out') {
      pPayments = purchasePayments.map((payment) => ({
        ...payment,
        type: 'out',
        paymentTo: payment.sellerName || 'Vendor',
        category: payment.category || 'Purchase Payment',
        method: payment.method || 'cash',
        remark: payment.remark || 'Payment towards purchase',
      }));
    }

    // Transport payments (always out)
    if (activeTab === 'all' || activeTab === 'out') {
      tPayments = transportPayments.map((payment) => ({
        ...payment,
        type: 'out',
        paymentTo: payment.transportName || 'Transporter',
        category: payment.category || 'Transport Payment',
        method: payment.method || 'cash',
        remark: payment.remark || 'Payment towards transport',
      }));
    }

    // 3) Combine all
    let combined = [
      ...mainFiltered,
      ...billingPaymentsFormatted,
      ...customerPaymentsFormatted,
      ...expenses,
      ...pPayments,
      ...tPayments,
    ];

    // 4) Remove duplicates based on _id
    const uniqueMap = new Map();
    combined.forEach((item) => {
      if (!uniqueMap.has(item._id)) {
        uniqueMap.set(item._id, item);
      }
    });

    let filtered = [...uniqueMap.values()];

    // 5) Apply additional filters (category, method, search)
    if (filterCategory) {
      filtered = filtered.filter(
        (t) => t.category && t.category.toLowerCase() === filterCategory.toLowerCase()
      );
    }
    if (filterMethod) {
      filtered = filtered.filter(
        (t) => t.method && t.method.toLowerCase() === filterMethod.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.paymentFrom && t.paymentFrom.toLowerCase().includes(q)) ||
          (t.paymentTo && t.paymentTo.toLowerCase().includes(q)) ||
          (t.remark && t.remark.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }

    // 6) Sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const amountA = parseFloat(a.amount) || 0;
      const amountB = parseFloat(b.amount) || 0;

      switch (sortOption) {
        case 'date_desc':
          return dateB - dateA; // latest first
        case 'date_asc':
          return dateA - dateB; // oldest first
        case 'amount_asc':
          return amountA - amountB; // low -> high
        case 'amount_desc':
          return amountB - amountA; // high -> low
        default:
          return dateB - dateA;
      }
    });

    return filtered;
  }, [
    transactions,
    billingPayments,
    customerPayments,
    otherExpenses,
    purchasePayments,
    transportPayments,
    activeTab,
    searchQuery,
    filterCategory,
    filterMethod,
    sortOption,
  ]);

  // ----------------------------------
  // Render
  // ----------------------------------
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 relative">
        <div onClick={() => navigate('/')} className="text-center cursor-pointer">
          <h2 className="text-md font-bold text-red-600">KK TRADING</h2>
          <p className="text-gray-400 text-xs font-bold">Daily Transactions and Accounts</p>
        </div>
        <button
  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
  className="lg:hidden top-4 left-4 z-50 p-2 rounded-md shadow-lg"
>
  <i className='fa fa-filter' />
</button>

      </div>

      <div className="flex lg:flex-row flex-col">
      {/* Top Filters */}
      <div
    className={`fixed inset-y-0 h-screen left-0 transform bg-white shadow-md w-64 z-40 transition-transform duration-300 ease-in-out 
      ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
      lg:translate-x-0 lg:static`}
>
  <div className="p-4">
    <h2 className="text-sm font-bold text-gray-800 mb-4">Filters</h2>

    {/* Filters Section */}
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-bold mb-1 block">From Date</label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500 w-full"
        />
      </div>
      <div>
        <label className="text-xs font-bold mb-1 block">To Date</label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500 w-full"
        />
      </div>
      <div>
        <label className="block text-xs font-bold mb-1">Category</label>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500 w-full"
        >
          <option value="">All</option>
          {categories.map((cat, index) => (
            <option key={index} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold mb-1">Method</label>
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500 w-full"
        >
          <option value="">All</option>
          {accounts.map((acc, index) => (
            <option key={index} value={acc.accountId}>
              {acc.accountName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold mb-1">Search</label>
        <input
          type="text"
          placeholder="Search remarks/source..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500 w-full"
        />
      </div>
      <div>
        <label className="block text-xs font-bold mb-1">Sort By</label>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500 w-full"
        >
          <option value="date_desc">Date (Latest First)</option>
          <option value="date_asc">Date (Oldest First)</option>
          <option value="amount_asc">Amount (Low to High)</option>
          <option value="amount_desc">Amount (High to Low)</option>
        </select>
      </div>
    </div>
  </div>
</div>



      {/* Error Modal */}
      {error && <ErrorModal message={error} onClose={() => setError('')} />}

      {/* Success Modal */}
      {isSuccessOpen && (
        <SuccessModal message={successMessage} onClose={() => setIsSuccessOpen(false)} />
      )}

<div className={`flex-1 p-4 transition-all duration-300`}>
      {/* Totals Section */}
      <div className="flex space-x-4 p-4 rounded-lg">
        <div className="flex-1 bg-green-100 text-green-700 p-3 rounded-lg text-center">
          <p className="text-xs font-semibold">Total Payment In</p>
          <p className="text-md font-bold">₹ {totalIn.toFixed(2)}</p>
        </div>
        <div className="flex-1 bg-red-100 text-red-700 p-3 rounded-lg text-center">
          <p className="text-xs font-semibold">Total Payment Out</p>
          <p className="text-md font-bold">₹ {totalOut.toFixed(2)}</p>
        </div>
        <div className="flex-1 bg-blue-100 text-blue-700 p-3 rounded-lg text-center">
    <p className="text-xs font-semibold">Total Transfers</p>
    <p className="text-md font-bold">₹ {totalTransfer.toFixed(2)}</p>
  </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center p-2 bg-white shadow-md rounded-lg">
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-full">
          <button
            onClick={() => handleTabChange('all')}
            className={`px-4 py-1 text-xs rounded-full font-semibold ${
              activeTab === 'all' ? 'bg-white text-red-600 shadow-md' : 'text-gray-600'
            }`}
          >
            All Payments
          </button>
          <button
            onClick={() => handleTabChange('in')}
            className={`px-4 py-1 text-xs rounded-full font-semibold ${
              activeTab === 'in' ? 'bg-white text-red-600 shadow-md' : 'text-gray-600'
            }`}
          >
            Payment In
          </button>
          <button
            onClick={() => handleTabChange('out')}
            className={`px-4 py-1 text-xs rounded-full font-semibold ${
              activeTab === 'out' ? 'bg-white text-red-600 shadow-md' : 'text-gray-600'
            }`}
          >
            Payment Out
          </button>
          <button
            onClick={() => handleTabChange('transfer')}
            className={`px-4 py-1 text-xs rounded-full font-semibold ${
              activeTab === 'transfer' ? 'bg-white text-red-600 shadow-md' : 'text-gray-600'
            }`}
          >
            Transfer
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="p-4 mb-20">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : (
          <>
            {allTransactions.length === 0 ? (
              <p className="text-center text-gray-500 text-xs">
                No transactions found for the selected criteria.
              </p>
            ) : (
              <div className="space-y-2">
                {allTransactions.map((trans) => {
                  const dateObj = new Date(trans.date);
                  const isDaily = trans.source === 'daily'; // only daily transactions can be deleted

                  return (
                    <div
                      key={trans._id}
                      className="flex justify-between items-center p-2 bg-white shadow-sm rounded-lg"
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-700">{trans.category}</p>
                        <p className="text-xs text-gray-500">
                          {trans.type === 'in'
                            ? `From: ${trans.paymentFrom}`
                            : trans.type === 'out'
                            ? `To: ${trans.paymentTo}`
                            : trans.type === 'transfer'
                            ? `Transfer: ${trans.paymentFrom} ➜ ${trans.paymentTo}`
                            : ''}
                        </p>
                        <p className="text-xs text-gray-500 italic">{trans.remark}</p>
                      </div>
                      <div className="text-right">
                        {trans.type === 'in' && (
                          <p className="text-sm font-bold text-green-600">
                            +₹{parseFloat(trans.amount).toFixed(2)}
                          </p>
                        )}
                        {trans.type === 'out' && (
                          <p className="text-sm font-bold text-red-600">
                            -₹{parseFloat(trans.amount).toFixed(2)}
                          </p>
                        )}
                        {trans.type === 'transfer' && (
                          <p className="text-sm font-bold text-blue-600">
                            ₹{parseFloat(trans.amount).toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {dateObj.toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {isDaily && (
                          <button
                            onClick={() => handleDeleteTransaction(trans._id)}
                            className="ml-3 text-red-500 hover:text-red-700 text-xs"
                            title="Delete Transaction"
                          >
                            <i className="fa fa-trash"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed action buttons (bottom) */}
      <div className="fixed bottom-0 left-0 z-50 shadow-inner right-0 bg-white p-2 flex justify-around border-t">
        <button
          onClick={() => openModal('in')}
          className="flex font-bold items-center justify-center bg-green-500 text-white w-12 h-12 rounded-full shadow-lg hover:bg-green-600 transition"
          title="Add Payment In"
        >
          +
        </button>

        <button
          onClick={() => openModal('transfer')}
          className="flex font-bold items-center justify-center bg-blue-500 text-white w-12 h-12 rounded-full shadow-lg hover:bg-blue-600 transition"
          title="Transfer Between Accounts"
        >
          <i className="fa fa-share" />
        </button>

        <button
          onClick={() => openModal('out')}
          className="flex font-bold items-center justify-center bg-red-500 text-white w-12 h-12 rounded-full shadow-lg hover:bg-red-600 transition"
          title="Add Payment Out"
        >
          -
        </button>

        {/* Generate Report Button */}
        <button
          onClick={handleGenerateReport}
          className="flex font-bold items-center justify-center bg-red-500 text-white w-12 h-12 rounded-full shadow-lg hover:bg-red-600 transition"
          title="Generate Report"
        >
          <i className="fa fa-file-pdf-o"></i>
        </button>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-end z-50">
          <div className="bg-white w-full rounded-t-lg p-4 relative shadow-lg animate-slide-up">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold">
                {modalType === 'in'
                  ? 'Add Payment In'
                  : modalType === 'out'
                  ? 'Add Payment Out'
                  : 'Transfer Between Accounts'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleTransactionSubmit}>
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <div className="mb-2">
                <label className="block text-xs font-bold mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={transactionData.date}
                  onChange={(e) =>
                    setTransactionData({ ...transactionData, date: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              {/* Payment From (for IN or TRANSFER) */}
              {(modalType === 'in' || modalType === 'transfer') && (
                <div className="mb-2">
                  <label className="block text-xs font-bold mb-1">Payment From</label>
                  {modalType === 'in' ? (
                    <input
                      type="text"
                      value={transactionData.paymentFrom}
                      onChange={(e) =>
                        setTransactionData({ ...transactionData, paymentFrom: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  ) : (
                    <select
                      value={transactionData.paymentFrom}
                      onChange={(e) =>
                        setTransactionData({ ...transactionData, paymentFrom: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts.map((account, index) => (
                        <option key={index} value={account.accountId}>
                          {account.accountName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Payment To (for OUT or TRANSFER) */}
              {(modalType === 'out' || modalType === 'transfer') && (
                <div className="mb-2">
                  <label className="block text-xs font-bold mb-1">Payment To</label>
                  {modalType === 'out' ? (
                    <input
                      type="text"
                      value={transactionData.paymentTo}
                      onChange={(e) =>
                        setTransactionData({ ...transactionData, paymentTo: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  ) : (
                    <select
                      value={transactionData.paymentTo}
                      onChange={(e) =>
                        setTransactionData({ ...transactionData, paymentTo: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts.map((account, index) => (
                        <option key={index} value={account.accountId}>
                          {account.accountName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Category */}
              <div className="mb-2">
                <label className="block text-xs font-bold mb-1">Category</label>
                {!showAddCategory ? (
                  <select
                    value={transactionData.category}
                    onChange={(e) => {
                      if (e.target.value === 'add_new_category') {
                        setShowAddCategory(true);
                      } else {
                        setTransactionData({ ...transactionData, category: e.target.value });
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat, index) => (
                      <option key={index} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    <option value="add_new_category">Add New Category</option>
                  </select>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter new category"
                      className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500 mb-2"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="bg-green-500 text-white px-3 py-1 rounded-md text-xs hover:bg-green-600 transition-colors duration-200"
                    >
                      Save Category
                    </button>
                  </div>
                )}
              </div>

              {/* Conditional extra selects for Purchase or Transport Payment */}
              {modalType === 'out' && transactionData.category === 'Purchase Payment' && (
                <div className="mb-2">
                  <label className="block text-xs font-bold mb-1">Purchase</label>
                  <select
                    value={transactionData.purchaseId || ''}
                    onChange={(e) =>
                      setTransactionData({ ...transactionData, purchaseId: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="">Select Purchase</option>
                    {purchasePayments.map((purchase, index) => (
                      <option key={index} value={purchase._id}>
                        {purchase.invoiceNo} - {purchase.sellerName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalType === 'out' && transactionData.category === 'Transport Payment' && (
                <div className="mb-2">
                  <label className="block text-xs font-bold mb-1">Transport</label>
                  <select
                    value={transactionData.transportId || ''}
                    onChange={(e) =>
                      setTransactionData({ ...transactionData, transportId: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="">Select Transport</option>
                    {transportPayments.map((transport, index) => (
                      <option key={index} value={transport._id}>
                        {transport.transportName} -{' '}
                        {new Date(transport.transportDate).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div className="mb-2">
                <label className="block text-xs font-bold mb-1">Amount</label>
                <input
                  type="number"
                  value={transactionData.amount}
                  onChange={(e) =>
                    setTransactionData({ ...transactionData, amount: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="Enter amount in Rs."
                />
              </div>

              {/* Payment Method */}
              <div className="mb-2">
                <label className="block text-xs font-bold mb-1">Payment Method</label>
                <select
                  value={transactionData.method}
                  onChange={(e) => setTransactionData({ ...transactionData, method: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                  required
                >
                  <option value="">Select Method</option>
                  {accounts.map((account, index) => (
                    <option key={index} value={account.accountId}>
                      {account.accountName}
                    </option>
                  ))}
                  <option value="cash">Cash</option>
                </select>
              </div>

              {/* Remark */}
              <div className="mb-2">
                <label className="block text-xs font-bold mb-1">Remark</label>
                <textarea
                  value={transactionData.remark}
                  onChange={(e) => setTransactionData({ ...transactionData, remark: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                  rows="2"
                  placeholder="Optional remarks"
                ></textarea>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md mr-2 text-xs hover:bg-gray-300 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-500 text-white px-3 py-1 rounded-md text-xs hover:bg-red-600 transition-colors duration-200"
                >
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
      </div>

      {/* Tailwind Animations */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0%);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0%);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default DailyTransactions;
