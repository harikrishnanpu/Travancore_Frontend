// DailyTransactions.js
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { useSelector } from 'react-redux';

const ErrorModal = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white rounded-lg p-4 shadow-lg relative w-11/12 max-w-sm">
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

const DailyTransactions = () => {
  const navigate = useNavigate();
  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  const [transactions, setTransactions] = useState([]);
  const [billings, setBillings] = useState([]);
  const [billingPayments, setBillingPayments] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [purchasePayments, setPurchasePayments] = useState([]);
  const [transportPayments, setTransportPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // If admin show from and to date, else single date
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [activeTab, setActiveTab] = useState('all');
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('in');

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

  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [sortOption, setSortOption] = useState('date_desc'); 
  // sortOption: date_desc, date_asc, amount_asc, amount_desc



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

      const { billingsRes: billingData, payments: paymentData, otherExpenses: expenseData } = billingRes.data;
      const customerPaymentsData = customerPayRes.data;

      // Mark sources for each transaction type for easy identification
      const dailyTransWithSource = dailyTransRes.data.map((t) => ({ ...t, source: 'daily' }));

      setTransactions(dailyTransWithSource);
      setBillings(billingData);
      setBillingPayments(paymentData);
      setCustomerPayments(customerPaymentsData.flatMap((customer) => {
        return (customer.payments || []).map((p, index) => ({
          ...p,
          source: 'customerPayment',
          _id: p._id || `customer-payment-${index}`,
        }));
      }));
      setOtherExpenses(expenseData.map((exp, index) => ({
        ...exp,
        source: 'expense',
        _id: exp._id || `expense-${index}`,
      })));
      setPurchasePayments(
        purchaseRes.data.flatMap((seller) =>
          (seller.payments || []).map((p, index) => ({
            ...p,
            source: 'purchasePayment',
            _id: p._id || `purchase-${seller.sellerId}-${index}`,
          }))
        )
      );
      setTransportPayments(
        transportRes.data.flatMap((transport) =>
          (transport.payments || []).map((p, index) => ({
            ...p,
            source: 'transportPayment',
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

    // Daily transactions (in/out/transfer)
    transactionsData.forEach((trans) => {
      const amount = parseFloat(trans.amount) || 0;
      if (trans.type === 'in') totalInAmount += amount;
      else if (trans.type === 'out') totalOutAmount += amount;
      // transfer doesn't affect totals
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
  };

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

  const handleTabChange = (tab) => setActiveTab(tab);

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

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Input validation
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
      // Handle adding new category if showAddCategory is true
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
          category: newCategoryName.trim(),
        });
      }

      const payload = {
        ...transactionData,
        type: modalType,
        userId: userInfo._id,
      };

      if (modalType === 'transfer') {
        await api.post('/api/daily/trans/transfer', payload);
      } else if (transactionData.category === 'Purchase Payment') {
        await api.post('/api/purchases/purchases/payments', payload);
      } else if (transactionData.category === 'Transport Payment') {
        await api.post('/api/transport/payments', payload);
      } else {
        await api.post('/api/daily/transactions', payload);
      }

      closeModal();
      fetchTransactions();
    } catch (err) {
      setError('Failed to add transaction.');
      console.error(err);
    }
  };


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
  

  const handleAddNewCategoryToggle = () => {
    setShowAddCategory(!showAddCategory);
    setNewCategoryName('');
  };

  const handleDeleteTransaction = async (id) => {
    // Only deleting daily transactions (source: 'daily')
    try {
      await api.delete(`/api/daily/transactions/${id}`);
      fetchTransactions();
    } catch (err) {
      setError('Failed to delete transaction.');
      console.error(err);
    }
  };

  const allTransactions = useMemo(() => {
    let filtered = [];

    // Filter main transactions based on activeTab
    let mainFiltered;
    if (activeTab === 'all') mainFiltered = [...transactions];
    else mainFiltered = transactions.filter((t) => t.type === activeTab);

    // Billing Payments (in)
    let billingPaymentsFormatted = [];
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

    // Customer Payments (in)
    let customerPaymentsFormatted = [];
    if (activeTab === 'all' || activeTab === 'in') {
      // Already marked in fetchTransactions, but we do it again for safety
      customerPaymentsFormatted = customerPayments.map((payment) => ({
        ...payment,
        type: 'in',
        category: payment.category || 'Customer Payment',
        method: payment.method || 'cash',
      }));
    }

    // Other Expenses (out)
    let expenses = [];
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

    // Purchase Payments (out)
    let pPayments = [];
    if (activeTab === 'all' || activeTab === 'out') {
      pPayments = purchasePayments.map((payment) => ({
        ...payment,
        type: 'out',
        paymentTo: payment.paidTo || 'Vendor',
        category: payment.category || 'Purchase Payment',
        method: payment.method || 'cash',
        remark: payment.remark || 'Payment towards purchase',
      }));
    }

    // Transport Payments (out)
    let tPayments = [];
    if (activeTab === 'all' || activeTab === 'out') {
      tPayments = transportPayments.map((payment) => ({
        ...payment,
        type: 'out',
        paymentTo: payment.paidTo || 'Transporter',
        category: payment.category || 'Transport Payment',
        method: payment.method || 'cash',
        remark: payment.remark || 'Payment towards transport',
      }));
    }

    filtered = [
      ...mainFiltered,
      ...billingPaymentsFormatted,
      ...customerPaymentsFormatted,
      ...expenses,
      ...pPayments,
      ...tPayments,
    ];

    // Filters: category, method, searchQuery
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

    // Sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const amountA = parseFloat(a.amount) || 0;
      const amountB = parseFloat(b.amount) || 0;

      switch (sortOption) {
        case 'date_desc':
          return dateB - dateA; 
        case 'date_asc':
          return dateA - dateB;
        case 'amount_asc':
          return amountA - amountB;
        case 'amount_desc':
          return amountB - amountA;
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

  return (
    <>
      <div className="flex items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 relative">
        <div onClick={() => navigate('/')} className="text-center cursor-pointer">
          <h2 className="text-md font-bold text-red-600">KK TRADING</h2>
          <p className="text-gray-400 text-xs font-bold">Daily Transactions and Accounts</p>
        </div>
        <i className="fa fa-list text-gray-500" />
      </div>

      {/* Top Filters */}
      <div className="flex items-center justify-between bg-white p-4 shadow-md gap-4 flex-wrap">
        <h2 className="text-sm font-bold text-gray-800">Daily Transactions</h2>
        {userInfo && userInfo.isAdmin ? (
          <div className="flex space-x-2 items-end">
            <div>
              <label className="text-xs font-bold mb-1 block">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs font-bold mb-1 block">Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setToDate(e.target.value);
              }}
              className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
            />
          </div>
        )}

        {/* Additional Filters */}
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-bold mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500 w-40"
            >
              <option value="">All</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
              <option value="Billing Payment">Billing Payment</option>
              <option value="Customer Payment">Customer Payment</option>
              <option value="Other Expense">Other Expense</option>
              <option value="Purchase Payment">Purchase Payment</option>
              <option value="Transport Payment">Transport Payment</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Method</label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500 w-40"
            >
              <option value="">All</option>
              {accounts.map((acc) => (
                <option key={acc.accountId} value={acc.accountId}>
                  {acc.accountName}
                </option>
              ))}
              <option value="cash">Cash</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Search</label>
            <input
              type="text"
              placeholder="Search remarks/source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500 w-40"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Sort By</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500 w-40"
            >
              <option value="date_desc">Date (Latest First)</option>
              <option value="date_asc">Date (Oldest First)</option>
              <option value="amount_asc">Amount (Low to High)</option>
              <option value="amount_desc">Amount (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && <ErrorModal message={error} onClose={() => setError('')} />}

      {/* Totals Section */}
      <div className="flex space-x-4 p-4">
        <div className="flex-1 bg-green-100 text-green-700 p-3 rounded-lg text-center">
          <p className="text-xs font-semibold">Total Payment In</p>
          <p className="text-md font-bold">₹ {totalIn.toFixed(2)}</p>
        </div>
        <div className="flex-1 bg-red-100 text-red-700 p-3 rounded-lg text-center">
          <p className="text-xs font-semibold">Total Payment Out</p>
          <p className="text-md font-bold">₹ {totalOut.toFixed(2)}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center p-2 bg-white shadow-md">
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
                {allTransactions.map((trans, index) => {
                  const dateObj = new Date(trans.date);
                  const isDaily = trans.source === 'daily'; // only daily transactions can be deleted
                  return (
                    <div
                      key={trans._id || `trans-${index}`}
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

      {/* Fixed Payment Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-2 flex justify-around border-t">
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
          <i className="fa fa-exchange" />
        </button>

        <button
          onClick={() => openModal('out')}
          className="flex font-bold items-center justify-center bg-red-500 text-white w-12 h-12 rounded-full shadow-lg hover:bg-red-600 transition"
          title="Add Payment Out"
        >
          -
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
              {modalType === 'in' && (
                <div className="mb-2">
                  <label className="block text-xs font-bold mb-1">Payment From</label>
                  <input
                    type="text"
                    value={transactionData.paymentFrom}
                    onChange={(e) =>
                      setTransactionData({ ...transactionData, paymentFrom: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
              )}
              {modalType === 'out' && (
                <div className="mb-2">
                  <label className="block text-xs font-bold mb-1">Payment To</label>
                  <input
                    type="text"
                    value={transactionData.paymentTo}
                    onChange={(e) =>
                      setTransactionData({ ...transactionData, paymentTo: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
              )}
              {modalType === 'transfer' && (
                <>
                  <div className="mb-2">
                    <label className="block text-xs font-bold mb-1">Payment From</label>
                    <select
                      value={transactionData.paymentFrom}
                      onChange={(e) =>
                        setTransactionData({ ...transactionData, paymentFrom: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts.map((account) => (
                        <option key={account.accountId} value={account.accountId}>
                          {account.accountName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-bold mb-1">Payment To</label>
                    <select
                      value={transactionData.paymentTo}
                      onChange={(e) =>
                        setTransactionData({ ...transactionData, paymentTo: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts.map((account) => (
                        <option key={account.accountId} value={account.accountId}>
                          {account.accountName}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="mb-2">
                <label className="block text-xs font-bold mb-1">Category</label>
                {!showAddCategory ? (
                  <select
  value={transactionData.category}
  onChange={(e) => {
    if (e.target.value === 'add_new_category') {
      setShowAddCategory(true); // Open modal for adding a new category
    } else {
      setTransactionData({ ...transactionData, category: e.target.value });
    }
  }}
  className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
  required
>
  <option value="">Select Category</option>
  {categories.map((cat) => (
    <option key={cat._id} value={cat.name}>
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
                    {purchasePayments.map((purchase) => (
                      <option key={purchase._id} value={purchase._id}>
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
                    {transportPayments.map((transport) => (
                      <option key={transport._id} value={transport._id}>
                        {transport.transportName} -{' '}
                        {new Date(transport.transportDate).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="mb-2">
                <label className="block text-xs font-bold mb-1">Amount</label>
                <input
                  type="number"
                  value={transactionData.amount}
                  onChange={(e) => setTransactionData({ ...transactionData, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="Enter amount in Rs."
                />
              </div>
              <div className="mb-2">
                <label className="block text-xs font-bold mb-1">Payment Method</label>
                <select
                  value={transactionData.method}
                  onChange={(e) => setTransactionData({ ...transactionData, method: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-1 text-xs focus:ring-red-500 focus:border-red-500"
                  required
                >
                  <option value="">Select Method</option>
                  {accounts.map((account) => (
                    <option key={account.accountId} value={account.accountId}>
                      {account.accountName}
                    </option>
                  ))}
                  <option value="cash">Cash</option>
                </select>
              </div>
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

      {/* CSS for modal animation */}
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
      `}</style>
    </>
  );
};

export default DailyTransactions;
