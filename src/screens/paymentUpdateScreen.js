import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import { useSelector } from "react-redux";

const EmployeePaymentExpensePage = () => {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [billingDetails, setBillingDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState([{ amount: 0, remark: "" }]); 
  const [activeSection, setActiveSection] = useState("Billing Details");
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [accounts,setAccounts] = useState([]);
  const [paymentDateTime, setPaymentDateTime] = useState(() => {
    // Default to current local datetime in input's value format (YYYY-MM-DDTHH:MM)
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });

  const navigate = useNavigate();
  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  useEffect(()=>{
    const fetchAccounts = async () => {
      setIsLoading(true); 
      try {
        const response = await api.get('/api/accounts/allaccounts');
        const getPaymentMethod = response.data.map((acc) => acc.accountId);

        if (getPaymentMethod.length > 0) {
          const firstAccountId = getPaymentMethod[0];
          setPaymentMethod(firstAccountId);
        } else {
          setPaymentMethod(null);
        }

        setAccounts(response.data);
      } catch (err) {
        setError('Failed to fetch payment accounts.'); 
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts()
  },[])

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (invoiceNo.trim()) {
        try {
          const response = await api.get(`/api/billing/billing/suggestions?search=${invoiceNo.trim()}`);
          setSuggestions(response.data);
        } catch (error) {
          console.error("Error fetching suggestions:", error);
        }
      } else {
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [invoiceNo]);

  const handleFetchBilling = async (id) => {
    if (!invoiceNo) {
      setError("Please enter an invoice number.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.get(`/api/billing/${id}`);
      setBillingDetails(response.data);
      setRemainingAmount(
        (response.data.grandTotal) -
        (response.data.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0)
      );
      setError("");
    } catch (error) {
      console.error("Error fetching billing data:", error);
      setError("Error fetching billing data. Please check the invoice number.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!billingDetails) return;
    if (!paymentAmount || !paymentMethod) {
      setError("Please enter a valid payment amount and method.");
      return;
    }

    const parsedDate = new Date(paymentDateTime);
    if (isNaN(parsedDate.getTime())) {
      setError("Please select a valid payment date and time.");
      return;
    }

    setIsLoading(true);
    try {
      const updatedPaymentStatus =
        paymentAmount >= billingDetails.grandTotal
          ? "Paid"
          : paymentAmount > 0
          ? "Partial"
          : "Pending";

      await api.post("/api/users/billing/update-payment", {
        invoiceNo: billingDetails.invoiceNo,
        paymentAmount,
        paymentMethod,
        paymentStatus: updatedPaymentStatus,
        userId: userInfo._id,
        date: parsedDate, // send the selected date/time
      });
      await handleFetchBilling(billingDetails._id);
      setPaymentAmount("");
      setPaymentMethod(accounts.length > 0 ? accounts[0].accountId : "");
      setError("");
      setShowSuccessModal(true);
      setActiveSection("Billing Details");
    } catch (error) {
      console.error("Error adding payment:", error);
      setError("Error adding payment.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpenses = async () => {
    if (!billingDetails) return;

    // Validate otherExpenses
    const validOtherExpenses = Array.isArray(otherExpenses)
      ? otherExpenses.filter(expense => expense.amount > 0 && expense.remark)
      : [];

    if (validOtherExpenses.length === 0) {
      setError("Please enter at least one expense with an amount and remark.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post(`/api/billing/billing/${billingDetails._id}/addExpenses`, {
        otherExpenses: validOtherExpenses,
        userId: userInfo._id,
        paymentMethod,
      });

      await handleFetchBilling(billingDetails._id);

      setOtherExpenses([{ amount: 0, remark: "" }]); 
      setError("");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error adding expenses:", error);
      setError("Error adding expenses.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtherExpensesChange = (index, field, value) => {
    const updatedExpenses = [...otherExpenses];
    updatedExpenses[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setOtherExpenses(updatedExpenses);
  };

  const handleAddExpense = () => {
    setOtherExpenses([...otherExpenses, { amount: 0, remark: "" }]);
  };

  const handleSuggestionClick = (suggestion) => {
    setInvoiceNo(suggestion.invoiceNo);
    setSuggestions([]);
    handleFetchBilling(suggestion._id);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      setSelectedSuggestionIndex((prevIndex) =>
        prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      setSelectedSuggestionIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
      handleSuggestionClick(suggestions[selectedSuggestionIndex]);
    }
  };

  return (
    <div className="p-3 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex max-w-4xl mx-auto items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 relative">
        <div onClick={() => navigate('/')} className="text-center cursor-pointer">
          <h2 className="text-md font-bold text-red-600">KK TRADING</h2>
          <p className="text-gray-400 text-xs font-bold">Employee Payment & Expense Updation</p>
        </div>
        <i className="fa fa-money-check-alt text-gray-500 text-xl" />
      </div>

      {/* Integrated Navigation */}
      <div className="flex justify-center gap-8 mb-6">
        {["Billing Details", "Payment Section", "Expense Section", "Previous Payments"].map((section) => (
          <button
            key={section}
            className={`font-bold text-xs focus:outline-none relative pb-2 transition-all duration-300 ${
              activeSection === section ? "text-red-600 border-b-2 border-red-600" : "text-gray-600"
            }`}
            onClick={() => setActiveSection(section)}
          >
            {section}
            {activeSection === section && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 transition-all duration-300"></span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col justify-center items-center">
        <div className="bg-white shadow-xl rounded-lg w-full max-w-2xl p-4">
          {!billingDetails && (
            <div className="mb-4">
              <div className="relative w-full">
                <label className="font-bold text-xs text-gray-500">Invoice No.</label>
                <input
                  type="text"
                  placeholder="Enter Invoice Number"
                  value={invoiceNo}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-red-200 focus:ring-red-500 text-xs"
                />
                <i onClick={() => setInvoiceNo(' ')} className="fa fa-chevron-down absolute cursor-pointer right-3 bottom-3 text-gray-400"></i>
              </div>
            </div>
          )}

          {!billingDetails && suggestions.length > 0 && (
            <ul className="bg-white divide-y shadow-lg rounded-md overflow-hidden mb-4 border border-gray-300">
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion._id}
                  className={`p-4 cursor-pointer hover:bg-gray-100 flex justify-between ${
                    index === selectedSuggestionIndex ? "bg-gray-200" : ""
                  }`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <span className="font-bold text-xs text-gray-500">{suggestion.invoiceNo}</span>
                  <i className="fa fa-arrow-right text-gray-300" />
                </li>
              ))}
            </ul>
          )}

          {error && <p className="text-red-500 text-center mt-4 text-xs">{error}</p>}

          {billingDetails && (
            <div>
              {activeSection === "Billing Details" && (
                <div>
                  {/* Billing Details Section */}
                  <div className="mt-4 border-b pb-4 flex justify-between items-center relative">
                    <h5 className="mb-2 text-2xl ml-2 font-bold tracking-tight text-gray-900">
                      {billingDetails.invoiceNo}
                    </h5>

                    {/* Payment Status Badge */}
                    <p
                      className={`mt-auto mr-2 mb-auto py-2 w-40 text-center ml-auto rounded-full text-xs font-bold shadow-md transition-all duration-300 ease-in-out transform ${
                        billingDetails.paymentStatus === "Paid"
                          ? "text-green-600 bg-green-200 hover:bg-green-300 hover:scale-105"
                          : billingDetails.paymentStatus === "Partial"
                          ? "text-yellow-600 bg-yellow-200 hover:bg-yellow-300 hover:scale-105"
                          : "text-red-600 bg-red-200 hover:bg-red-300 hover:scale-105"
                      }`}
                    >
                      Payment: {billingDetails.paymentStatus}
                    </p>
                  </div>

                  <div className="flex-col pt-3">
                    <p className="mt-1 text-xs truncate font-bold text-gray-600">
                      Customer: {billingDetails.customerName}
                    </p>
                    <p className="mt-1 text-xs truncate font-normal text-gray-700">
                      Exp. Delivery Date: {new Date(billingDetails.expectedDeliveryDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex justify-between">
                    <p className="mt-1 text-xs text-gray-600">
                      Customer Address: <span className="font-bold text-gray-500">{billingDetails.customerAddress}</span>
                    </p>
                  </div>

                  <div className="mt-4 bg-gray-50 p-3 mb-4 rounded-lg">
                    <div className="flex text-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-600">
                          Grand Total:
                        </span>
                        <span className="text-sm font-bold text-gray-800">
                          {billingDetails.grandTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-600">
                          Received:
                        </span>
                        <span className="text-sm font-bold text-green-600">
                          {billingDetails.billingAmountReceived.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-600">
                          Remaining:
                        </span>
                        <span className="text-sm font-bold text-red-600">
                          {remainingAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expense Summary Section */}
                  <div className="border-t border-gray-200"></div>
                  <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                    <div className="flex text-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-600">
                          Other Exp:
                        </span>
                        <span className="text-sm font-bold text-gray-600">
                          {billingDetails.otherExpenses?.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary Section */}
                  <div className="mt-4 border-t space-y-2 border-gray-200 pt-4">
                    <h4 className="text-md font-bold text-gray-700">Payment Summary</h4>

                    <p className="text-xs mt-2 text-gray-500 font-semibold">
                      Total Payments In:{" "}
                      {billingDetails.payments?.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2)}
                    </p>

                    <p className="text-xs mt-1 text-gray-500 font-semibold">
                      Net Balance (In - Expenses):{" "}
                      {(
                        billingDetails.payments?.reduce((sum, payment) => sum + payment.amount, 0) -
                        (billingDetails.otherExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Section */}
              {activeSection === "Payment Section" && (
                <div className="mt-6 pt-4">
                  <h3 className="text-md font-bold text-gray-600 mb-2">Add Payment</h3>
                  <div className="flex flex-col gap-4">

                    <p className="mt-1 text-xs font-medium text-gray-600">
                      Remaining Amount: <span className="font-bold text-red-500">{remainingAmount.toFixed(2)}</span>
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Payment Amount</label>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Math.min(Number(e.target.value), remainingAmount))}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.accountId} value={acc.accountId}>
                            {acc.accountName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Payment Date & Time</label>
                      <input
                        type="datetime-local"
                        value={paymentDateTime}
                        onChange={(e) => setPaymentDateTime(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                      />
                    </div>

                    <button
                      className="bg-red-500 text-white font-bold text-xs px-4 py-3 rounded-lg mt-4 hover:bg-red-600 transition"
                      onClick={handleAddPayment}
                      disabled={isLoading}
                    >
                      Submit Payment
                    </button>
                    {error && <p className="text-red-500 text-center mt-4 text-xs">{error}</p>}
                  </div>
                </div>
              )}

              {/* Expense Section */}
              {activeSection === "Expense Section" && (
                <div className="mt-6 pt-4">
                  <h3 className="text-md font-bold text-gray-600 mb-2">Add Expenses</h3>
                  <div className="flex flex-col gap-4">

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.accountId} value={acc.accountId}>
                            {acc.accountName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-xs font-bold text-gray-500 mb-1">Add Other Expenses</h3>
                      {otherExpenses?.map((expense, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <input
                            type="number"
                            value={expense.amount}
                            onChange={(e) => handleOtherExpensesChange(index, "amount", e.target.value)}
                            placeholder="Amount"
                            className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                          />
                          <input
                            type="text"
                            value={expense.remark}
                            onChange={(e) => handleOtherExpensesChange(index, "remark", e.target.value)}
                            placeholder="Remark"
                            className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                          />
                        </div>
                      ))}
                      <button
                        onClick={handleAddExpense}
                        className="text-xs font-bold text-blue-500 hover:text-blue-700 mt-2"
                      >
                        + Add Expense
                      </button>
                    </div>
                    <button
                      className="bg-red-500 text-white font-bold text-xs px-4 py-3 rounded-lg mt-4 hover:bg-red-600 transition"
                      onClick={handleAddExpenses}
                      disabled={isLoading}
                    >
                      Submit Expenses
                    </button>
                    {error && <p className="text-red-500 text-center mt-4 text-xs">{error}</p>}
                  </div>
                </div>
              )}

              {/* Previous Payments Section */}
              {activeSection === "Previous Payments" && (
                <div className="mt-6">
                  <h3 className="text-md font-bold text-gray-600 mb-2">Previous Payments</h3>
                  
                  {/* List of payments */}
                  <ul className="divide-y divide-gray-200 mb-4">
                    {billingDetails.payments?.map((payment, index) => (
                      <li key={index} className="py-2 text-xs">
                        <p className="text-sm text-gray-700 font-semibold">
                          {payment.method}: {payment.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.date).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>

                  {/* Other Expenses */}
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-gray-600 mb-2">Other Expenses</h4>
                    <ul className="divide-y divide-gray-200 text-xs">
                      {billingDetails.otherExpenses?.map((expense, index) => (
                        <li key={index} className="py-2">
                          <p className="text-sm text-gray-700 font-semibold">
                            {expense.amount.toFixed(2)} - {expense.remark}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(expense.date).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Total Other Expenses */}
                  <div className="mt-4 border-t border-gray-200 pt-4 text-xs">
                    <p className="text-sm text-gray-800 font-semibold">
                      Total Other Expenses:{" "}
                      {billingDetails.otherExpenses?.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {showSuccessModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white text-center p-6 rounded-lg shadow-lg">
                <h3 className="text-md font-bold text-gray-500">Update Successful</h3>
                <p className="text-xs italic text-gray-400 mt-1 mb-5">Successfully updated the billing information.</p>
                <button
                  className="bg-green-500 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-green-600 transition"
                  onClick={() => setShowSuccessModal(false)}
                >
                  <i className="fa fa-check" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeePaymentExpensePage;
