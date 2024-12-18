// src/components/SupplierAccountList.js

import React, { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import api from "./api"; // Ensure this is correctly set up to handle API requests
import { useSelector } from "react-redux";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const SupplierAccountList = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Main filters/search/sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [billAmountMin, setBillAmountMin] = useState("");
  const [billAmountMax, setBillAmountMax] = useState("");
  const [pendingAmountMin, setPendingAmountMin] = useState("");
  const [pendingAmountMax, setPendingAmountMax] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  // Modal for selecting accounts to calculate totals
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectedForTotals, setSelectedForTotals] = useState({});

  // View Modal Filters and Sorting (for Bills and Payments)
  const [billSearchQuery, setBillSearchQuery] = useState("");
  const [billDateFrom, setBillDateFrom] = useState("");
  const [billDateTo, setBillDateTo] = useState("");
  const [billAmountFilterMin, setBillAmountFilterMin] = useState("");
  const [billAmountFilterMax, setBillAmountFilterMax] = useState("");
  const [billDeliveryStatus, setBillDeliveryStatus] = useState("");
  const [billSortConfig, setBillSortConfig] = useState({ key: "", direction: "asc" });

  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [paymentDateFrom, setPaymentDateFrom] = useState("");
  const [paymentDateTo, setPaymentDateTo] = useState("");
  const [paymentAmountMin, setPaymentAmountMin] = useState("");
  const [paymentAmountMax, setPaymentAmountMax] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [paymentSortConfig, setPaymentSortConfig] = useState({ key: "", direction: "asc" });

  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  // Fetch Accounts
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/seller/allaccounts");
      setAccounts(response.data);
      setFilteredAccounts(response.data);
      const initialSelection = {};
      response.data.forEach((acc) => {
        initialSelection[acc._id] = true;
      });
      setSelectedForTotals(initialSelection);
    } catch (err) {
      setError("Failed to fetch supplier accounts.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Main filtering and sorting logic
  useEffect(() => {
    let temp = [...accounts];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      temp = temp.filter(
        (acc) =>
          acc.sellerId.toLowerCase().includes(q) ||
          acc.sellerName.toLowerCase().includes(q)
      );
    }

    // Date Range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      temp = temp.filter((acc) => new Date(acc.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      temp = temp.filter((acc) => new Date(acc.createdAt) <= toDate);
    }

    // Payment Status
    if (paymentStatusFilter) {
      if (paymentStatusFilter === "Paid") {
        temp = temp.filter((acc) => acc.pendingAmount === 0);
      } else if (paymentStatusFilter === "Pending") {
        temp = temp.filter((acc) => acc.pendingAmount > 0);
      }
    }

    // Bill Amount Range
    if (billAmountMin !== "") {
      temp = temp.filter((acc) => acc.totalBillAmount >= parseFloat(billAmountMin));
    }
    if (billAmountMax !== "") {
      temp = temp.filter((acc) => acc.totalBillAmount <= parseFloat(billAmountMax));
    }

    // Pending Amount Range
    if (pendingAmountMin !== "") {
      temp = temp.filter((acc) => acc.pendingAmount >= parseFloat(pendingAmountMin));
    }
    if (pendingAmountMax !== "") {
      temp = temp.filter((acc) => acc.pendingAmount <= parseFloat(pendingAmountMax));
    }

    // Sorting
    if (sortConfig.key !== "") {
      temp.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (sortConfig.key === "createdAt") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredAccounts(temp);
    setCurrentPage(1);
  }, [
    accounts,
    searchQuery,
    dateFrom,
    dateTo,
    paymentStatusFilter,
    billAmountMin,
    billAmountMax,
    pendingAmountMin,
    pendingAmountMax,
    sortConfig,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
  const paginateAccounts = () => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAccounts.slice(start, start + itemsPerPage);
  };
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // PDF Generation
  const generatePDF = (account) => {
    setPdfLoading(true);
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Supplier Account Statement", 14, 22);
    doc.setFontSize(12);
    doc.text(`Account ID: ${account.sellerId}`, 14, 32);
    doc.text(`Supplier Name: ${account.sellerName}`, 14, 40);
    doc.text(`Supplier Address: ${account.sellerAddress}`, 14, 48);
    doc.text(`Total Bill Amount: ₹${account.totalBillAmount.toFixed(2)}`, 14, 56);
    doc.text(`Paid Amount: ₹${account.paidAmount.toFixed(2)}`, 14, 64);
    doc.text(`Pending Amount: ₹${account.pendingAmount.toFixed(2)}`, 14, 72);
    doc.text(`Created At: ${new Date(account.createdAt).toLocaleDateString()}`, 14, 80);

    // Bills
    doc.setFontSize(14);
    doc.text("Bills", 14, 94);
    const billsData = account.bills.map((bill, index) => [
      index + 1,
      bill.invoiceNo,
      `₹${bill.billAmount.toFixed(2)}`,
      new Date(bill.invoiceDate).toLocaleDateString(),
    ]);

    doc.autoTable({
      startY: 98,
      head: [["#", "Invoice No.", "Bill Amount", "Invoice Date"]],
      body: billsData,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 0, 0] }
    });

    // Payments
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text("Payments", 14, finalY);
    const paymentsData = account.payments.map((payment, index) => [
      index + 1,
      `₹${payment.amount.toFixed(2)}`,
      payment.submittedBy,
      payment.remark || "-",
      new Date(payment.date).toLocaleDateString(),
      payment.method,
    ]);

    doc.autoTable({
      startY: finalY + 5,
      head: [["#", "Amount", "Submitted By", "Remark", "Date", "Method"]],
      body: paymentsData,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 0, 0] },
    });

    // Save PDF
    doc.save(`Supplier_Account_${account.sellerId}.pdf`);
    setPdfLoading(false);
  };

  // Handle Removing an Account
  const handleRemove = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this supplier account?")
    ) {
      try {
        await api.delete(`/api/seller/${id}/delete`);
        alert("Supplier account deleted successfully.");
        setAccounts(accounts.filter((account) => account._id !== id));
      } catch (error) {
        setError("Error occurred while deleting the account.");
        console.error(error);
      }
    }
  };

  // Handle Viewing Account Details
  const handleView = (account) => {
    // Reset view modal filters
    setBillSearchQuery("");
    setBillDateFrom("");
    setBillDateTo("");
    setBillAmountFilterMin("");
    setBillAmountFilterMax("");
    setBillDeliveryStatus("");
    setBillSortConfig({ key: "", direction: "asc" });

    setPaymentSearchQuery("");
    setPaymentDateFrom("");
    setPaymentDateTo("");
    setPaymentAmountMin("");
    setPaymentAmountMax("");
    setPaymentMethodFilter("");
    setPaymentSortConfig({ key: "", direction: "asc" });

    setSelectedAccount(account);
  };

  const closeModal = () => {
    setSelectedAccount(null);
  };

  // Skeleton Loading
  const renderSkeleton = () => {
    const skeletonRows = Array.from({ length: itemsPerPage }, (_, index) => index);
    return (
      <table className="w-full text-sm text-gray-500 bg-white shadow-md rounded-lg overflow-hidden">
        <thead className="bg-gray-200">
          <tr className="divide-y text-xs">
            <th className="px-4 py-2 text-left">Supplier ID</th>
            <th className="px-2 py-2">Supplier Name</th>
            <th className="px-2 py-2">Address</th>
            <th className="px-2 py-2">Total Bill</th>
            <th className="px-2 py-2">Paid Amount</th>
            <th className="px-2 py-2">Pending Amount</th>
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
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Totals Based on Selected Accounts
  const visibleSelectedAccounts = accounts.filter((acc) => selectedForTotals[acc._id]);
  const totalBillSelected = useMemo(
    () => visibleSelectedAccounts.reduce((sum, acc) => sum + acc.totalBillAmount, 0),
    [visibleSelectedAccounts]
  );
  const totalPaidSelected = useMemo(
    () => visibleSelectedAccounts.reduce((sum, acc) => sum + acc.paidAmount, 0),
    [visibleSelectedAccounts]
  );
  const totalPendingSelected = useMemo(
    () => visibleSelectedAccounts.reduce((sum, acc) => sum + acc.pendingAmount, 0),
    [visibleSelectedAccounts]
  );

  // Selection Modal Handlers
  const toggleSelection = (id) => {
    setSelectedForTotals((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filters for Bills and Payments in View Modal
  const filteredBills = useMemo(() => {
    if (!selectedAccount) return [];
    let temp = [...selectedAccount.bills];

    if (billSearchQuery.trim()) {
      const q = billSearchQuery.toLowerCase();
      temp = temp.filter((b) => b.invoiceNo.toLowerCase().includes(q));
    }

    if (billDateFrom) {
      const from = new Date(billDateFrom);
      temp = temp.filter((b) => new Date(b.invoiceDate) >= from);
    }
    if (billDateTo) {
      const to = new Date(billDateTo);
      temp = temp.filter((b) => new Date(b.invoiceDate) <= to);
    }

    if (billAmountFilterMin !== "") {
      temp = temp.filter((b) => b.billAmount >= parseFloat(billAmountFilterMin));
    }
    if (billAmountFilterMax !== "") {
      temp = temp.filter((b) => b.billAmount <= parseFloat(billAmountFilterMax));
    }

    if (billDeliveryStatus) {
      temp = temp.filter((b) => b.deliveryStatus === billDeliveryStatus);
    }

    if (billSortConfig.key !== "") {
      temp.sort((a, b) => {
        let aValue = a[billSortConfig.key];
        let bValue = b[billSortConfig.key];

        if (billSortConfig.key === "invoiceDate") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return billSortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return billSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return temp;
  }, [
    selectedAccount,
    billSearchQuery,
    billDateFrom,
    billDateTo,
    billAmountFilterMin,
    billAmountFilterMax,
    billDeliveryStatus,
    billSortConfig,
  ]);

  const filteredPayments = useMemo(() => {
    if (!selectedAccount) return [];
    let temp = [...selectedAccount.payments];

    if (paymentSearchQuery.trim()) {
      const q = paymentSearchQuery.toLowerCase();
      temp = temp.filter(
        (p) =>
          p.submittedBy.toLowerCase().includes(q) ||
          p.method.toLowerCase().includes(q) ||
          p.referenceId.toLowerCase().includes(q)
      );
    }

    if (paymentDateFrom) {
      const from = new Date(paymentDateFrom);
      temp = temp.filter((p) => new Date(p.date) >= from);
    }
    if (paymentDateTo) {
      const to = new Date(paymentDateTo);
      temp = temp.filter((p) => new Date(p.date) <= to);
    }

    if (paymentAmountMin !== "") {
      temp = temp.filter((p) => p.amount >= parseFloat(paymentAmountMin));
    }
    if (paymentAmountMax !== "") {
      temp = temp.filter((p) => p.amount <= parseFloat(paymentAmountMax));
    }

    if (paymentMethodFilter) {
      temp = temp.filter((p) => p.method.toLowerCase() === paymentMethodFilter.toLowerCase());
    }

    if (paymentSortConfig.key !== "") {
      temp.sort((a, b) => {
        let aValue = a[paymentSortConfig.key];
        let bValue = b[paymentSortConfig.key];

        if (paymentSortConfig.key === "date") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return paymentSortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return paymentSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return temp;
  }, [
    selectedAccount,
    paymentSearchQuery,
    paymentDateFrom,
    paymentDateTo,
    paymentAmountMin,
    paymentAmountMax,
    paymentMethodFilter,
    paymentSortConfig,
  ]);

  const handleBillSort = (key) => {
    let direction = "asc";
    if (billSortConfig.key === key && billSortConfig.direction === "asc") {
      direction = "desc";
    }
    setBillSortConfig({ key, direction });
  };

  const handlePaymentSort = (key) => {
    let direction = "asc";
    if (paymentSortConfig.key === key && paymentSortConfig.direction === "asc") {
      direction = "desc";
    }
    setPaymentSortConfig({ key, direction });
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4">
        <div onClick={() => navigate("/")} className="text-center cursor-pointer">
          <h2 className="text-md font-bold text-red-600">KK TRADING</h2>
          <p className="text-gray-400 text-sm font-bold">
            All Supplier Accounts Information and Transactions
          </p>
        </div>
        <i className="fa fa-list text-gray-500" />
      </div>

      {/* PDF Loading Spinner */}
      {pdfLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="flex flex-col items-center">
            <i className="fa fa-spinner fa-spin text-white text-4xl mb-4"></i>
            <p className="text-white text-sm">Generating PDF...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-center mb-4 text-sm">{error}</p>
      )}

      {/* Filters and Searches */}
      <div className="bg-white p-4 shadow-md rounded-lg mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* Column 1: Search & Date Range */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold">Search</label>
            <input
              type="text"
              placeholder="Supplier ID or Name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border px-2 py-1 text-sm rounded w-full"
            />
            <label className="text-sm font-semibold">Created At</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border px-2 py-1 text-sm rounded w-full"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border px-2 py-1 text-sm rounded w-full"
              />
            </div>
          </div>

          {/* Column 2: Payment Status & Bill Amount */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold">Payment Status</label>
            <select
              className="border px-2 py-1 text-sm rounded w-full"
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
            <label className="text-sm font-semibold">Bill Amount (₹)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={billAmountMin}
                onChange={(e) => setBillAmountMin(e.target.value)}
                className="border px-2 py-1 text-sm rounded w-full"
                min="0"
              />
              <input
                type="number"
                placeholder="Max"
                value={billAmountMax}
                onChange={(e) => setBillAmountMax(e.target.value)}
                className="border px-2 py-1 text-sm rounded w-full"
                min="0"
              />
            </div>
          </div>

          {/* Column 3: Pending Amount */}
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-semibold">Pending Amount (₹)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={pendingAmountMin}
                onChange={(e) => setPendingAmountMin(e.target.value)}
                className="border px-2 py-1 text-sm rounded w-full"
                min="0"
              />
              <input
                type="number"
                placeholder="Max"
                value={pendingAmountMax}
                onChange={(e) => setPendingAmountMax(e.target.value)}
                className="border px-2 py-1 text-sm rounded w-full"
                min="0"
              />
            </div>
          </div>

          {/* Column 4: Select Accounts for Totals */}
          <div className="flex flex-col justify-end">
            <button
              onClick={() => setIsSelectionModalOpen(true)}
              className="bg-red-500 text-white px-2 py-1 text-sm font-semibold rounded hover:bg-red-600 flex items-center"
            >
              <i className="fa fa-check-square mr-1"></i> Select Accounts for Totals
            </button>
          </div>

        </div>
      </div>

      {/* Totals */}
      <div className="flex flex-col md:flex-row justify-between bg-white shadow-md rounded-lg p-4 mb-4 text-sm">
        <div className="flex items-center space-x-4 mb-2 md:mb-0">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 font-semibold">Total Billed:</span>
            <span className="text-gray-700">₹{totalBillSelected.toFixed(2)}</span>
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

      {/* Loading or Accounts Table */}
      {loading ? (
        renderSkeleton()
      ) : (
        <>
          {/* Accounts Table */}
          {filteredAccounts.length === 0 ? (
            <p className="text-center text-gray-500 text-sm">
              No supplier accounts available.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-500 bg-white shadow-md rounded-lg overflow-hidden">
                  <thead className="bg-red-600 text-sm text-white">
                    <tr className="divide-y">
                      <th
                        className="px-4 py-2 text-left cursor-pointer select-none"
                        onClick={() => handleSort("sellerId")}
                      >
                        Supplier ID
                        {sortConfig.key === "sellerId" && (
                          <i className={`fa fa-sort-${sortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-2 py-2 cursor-pointer select-none"
                        onClick={() => handleSort("sellerName")}
                      >
                        Supplier Name
                        {sortConfig.key === "sellerName" && (
                          <i className={`fa fa-sort-${sortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-2 py-2 cursor-pointer select-none"
                        onClick={() => handleSort("sellerAddress")}
                      >
                        Address
                        {sortConfig.key === "sellerAddress" && (
                          <i className={`fa fa-sort-${sortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-2 py-2 cursor-pointer select-none"
                        onClick={() => handleSort("totalBillAmount")}
                      >
                        Total Bill (₹)
                        {sortConfig.key === "totalBillAmount" && (
                          <i className={`fa fa-sort-${sortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-2 py-2 cursor-pointer select-none"
                        onClick={() => handleSort("paidAmount")}
                      >
                        Paid Amount (₹)
                        {sortConfig.key === "paidAmount" && (
                          <i className={`fa fa-sort-${sortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-2 py-2 cursor-pointer select-none"
                        onClick={() => handleSort("pendingAmount")}
                      >
                        Pending Amount (₹)
                        {sortConfig.key === "pendingAmount" && (
                          <i className={`fa fa-sort-${sortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-2 py-2 cursor-pointer select-none"
                        onClick={() => handleSort("createdAt")}
                      >
                        Created At
                        {sortConfig.key === "createdAt" && (
                          <i className={`fa fa-sort-${sortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th className="px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginateAccounts().map((account) => (
                      <tr
                        key={account._id}
                        className="hover:bg-gray-100 divide-y divide-x"
                      >
                        <td
                          onClick={() => navigate(`/seller/edit/${account._id}`)}
                          className="px-4 py-2 text-xs font-bold text-red-600 cursor-pointer"
                        >
                          {account.sellerId}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {account.sellerName}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {account.sellerAddress}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          ₹{account.totalBillAmount.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          ₹{account.paidAmount.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          ₹{account.pendingAmount.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          {new Date(account.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleView(account)}
                              className="bg-red-500 text-white px-2 py-1 text-sm font-semibold rounded hover:bg-red-600 flex items-center"
                            >
                              <i className="fa fa-eye mr-1"></i> View
                            </button>
                            <button
                              onClick={() => generatePDF(account)}
                              className="bg-red-500 text-white px-2 py-1 text-sm font-semibold rounded hover:bg-red-600 flex items-center"
                            >
                              <i className="fa fa-file-pdf-o mr-1"></i> Download
                            </button>
                            <button
                              onClick={() => handleRemove(account._id)}
                              className="bg-red-500 text-white px-2 py-1 text-sm font-semibold rounded hover:bg-red-600 flex items-center"
                            >
                              <i className="fa fa-trash mr-1"></i> Delete
                            </button>
                            <button
                              onClick={() => navigate(`/seller/edit/${account._id}`)}
                              className="bg-red-500 text-white px-2 py-1 text-sm font-semibold rounded hover:bg-red-600 flex items-center"
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
                  className={`px-4 text-sm font-bold py-2 rounded-lg ${
                    currentPage === 1
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 text-sm font-bold py-2 rounded-lg ${
                    currentPage === totalPages
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-red-500 text-white hover:bg-red-600"
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
            <h2 className="text-md font-semibold text-red-600 mb-4">Select Accounts for Totals</h2>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {accounts.map((acc) => (
                <div key={acc._id} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={!!selectedForTotals[acc._id]}
                    onChange={() => toggleSelection(acc._id)}
                    className="mr-2"
                  />
                  <span>{acc.sellerId} - {acc.sellerName}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setIsSelectionModalOpen(false)}
              className="bg-red-500 text-white px-3 py-1 text-sm font-semibold rounded hover:bg-red-600 mt-4"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* View Modal (Fullscreen) */}
      {selectedAccount && (
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
              <h2 className="text-md font-semibold text-red-600 mb-4">
                Transactions for Supplier ID: {selectedAccount.sellerId}
              </h2>

              {/* Account Summary */}
              <div className="mb-4 text-sm">
                <p>
                  <span className="font-semibold">Supplier Name:</span> {selectedAccount.sellerName}
                </p>
                <p>
                  <span className="font-semibold">Supplier Address:</span> {selectedAccount.sellerAddress}
                </p>
                <p>
                  <span className="font-semibold">Total Bill Amount:</span> ₹{selectedAccount.totalBillAmount.toFixed(2)}
                </p>
                <p>
                  <span className="font-semibold">Paid Amount:</span> <span className="text-green-600">₹{selectedAccount.paidAmount.toFixed(2)}</span>
                </p>
                <p>
                  <span className="font-semibold">Pending Amount:</span> <span className="text-red-600">₹{selectedAccount.pendingAmount.toFixed(2)}</span>
                </p>
                <p>
                  <span className="font-semibold">Created At:</span> {new Date(selectedAccount.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Bills Filters */}
              <h3 className="text-sm font-semibold text-red-600 mb-2">Bills</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Search Invoice No."
                  value={billSearchQuery}
                  onChange={(e) => setBillSearchQuery(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                />
                <input
                  type="date"
                  placeholder="Date From"
                  value={billDateFrom}
                  onChange={(e) => setBillDateFrom(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                />
                <input
                  type="date"
                  placeholder="Date To"
                  value={billDateTo}
                  onChange={(e) => setBillDateTo(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                />
                <input
                  type="number"
                  placeholder="Bill Min (₹)"
                  value={billAmountFilterMin}
                  onChange={(e) => setBillAmountFilterMin(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Bill Max (₹)"
                  value={billAmountFilterMax}
                  onChange={(e) => setBillAmountFilterMax(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                  min="0"
                />
                <select
                  value={billDeliveryStatus}
                  onChange={(e) => setBillDeliveryStatus(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                >
                  <option value="">All Status</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="min-w-full text-sm text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handleBillSort("invoiceNo")}
                      >
                        Invoice No.
                        {billSortConfig.key === "invoiceNo" && (
                          <i className={`fa fa-sort-${billSortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handleBillSort("billAmount")}
                      >
                        Bill Amount (₹)
                        {billSortConfig.key === "billAmount" && (
                          <i className={`fa fa-sort-${billSortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handleBillSort("invoiceDate")}
                      >
                        Invoice Date
                        {billSortConfig.key === "invoiceDate" && (
                          <i className={`fa fa-sort-${billSortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handleBillSort("deliveryStatus")}
                      >
                        Delivery Status
                        {billSortConfig.key === "deliveryStatus" && (
                          <i className={`fa fa-sort-${billSortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.length > 0 ? (
                      filteredBills.map((bill, index) => (
                        <tr
                          key={index}
                          className="bg-white border-b hover:bg-gray-100"
                        >
                          <td className="px-4 py-2 text-xs">{index + 1}</td>
                          <td className="px-4 py-2 text-xs">
                            {bill.invoiceNo}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            ₹{bill.billAmount.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {new Date(bill.invoiceDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-2 text-sm text-center text-gray-500">
                          No bills match the criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Payments Filters */}
              <h3 className="text-sm font-semibold text-red-600 mb-2">Payments</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Search by Submitted By/Method/Ref ID"
                  value={paymentSearchQuery}
                  onChange={(e) => setPaymentSearchQuery(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                />
                <input
                  type="date"
                  placeholder="Date From"
                  value={paymentDateFrom}
                  onChange={(e) => setPaymentDateFrom(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                />
                <input
                  type="date"
                  placeholder="Date To"
                  value={paymentDateTo}
                  onChange={(e) => setPaymentDateTo(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                />
                <input
                  type="number"
                  placeholder="Amount Min (₹)"
                  value={paymentAmountMin}
                  onChange={(e) => setPaymentAmountMin(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Amount Max (₹)"
                  value={paymentAmountMax}
                  onChange={(e) => setPaymentAmountMax(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                  min="0"
                />
                <input
                  type="text"
                  placeholder="Method"
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="border px-2 py-1 text-sm rounded"
                />
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="min-w-full text-sm text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handlePaymentSort("amount")}
                      >
                        Amount (₹)
                        {paymentSortConfig.key === "amount" && (
                          <i className={`fa fa-sort-${paymentSortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handlePaymentSort("submittedBy")}
                      >
                        Submitted By
                        {paymentSortConfig.key === "submittedBy" && (
                          <i className={`fa fa-sort-${paymentSortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th className="px-4 py-2">Remark</th>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handlePaymentSort("date")}
                      >
                        Date
                        {paymentSortConfig.key === "date" && (
                          <i className={`fa fa-sort-${paymentSortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                      <th
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => handlePaymentSort("method")}
                      >
                        Method
                        {paymentSortConfig.key === "method" && (
                          <i className={`fa fa-sort-${paymentSortConfig.direction === "asc" ? "asc" : "desc"} ml-1`}></i>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length > 0 ? (
                      filteredPayments.map((payment, index) => (
                        <tr
                          key={index}
                          className="bg-white border-b hover:bg-gray-100"
                        >
                          <td className={`px-4 py-2 text-xs ${payment.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ₹{payment.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {payment.submittedBy}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {payment.remark || "-"}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {new Date(payment.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {payment.method}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-2 text-sm text-center text-gray-500">
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

export default SupplierAccountList;
