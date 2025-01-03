import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import LowStockPreview from "../components/lowStockPreview";
import api from "./api";
import Loading from "../components/loading";
import DeliverySuccess from "../components/deliverySuccess";
import DeliveredProducts from "../components/deliveredProductscomponent";

const DriverBillingPage = () => {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [assignedBills, setAssignedBills] = useState([]);
  const [driverName, setDriverName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deliveryStarted, setDeliveryStarted] = useState(false);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [searchInvoiceNo, setSearchInvoiceNo] = useState("");
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [deliveredModal, setShowDeliveredModal] = useState(false);
  const [currentDelivered, setCurrentDelivered] = useState({ invoiceNo: "", deliveryId: "" });
  const [accounts, setAccounts] = useState([]);

  const navigate = useNavigate();
  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  // Load assigned bills and driverName from local storage on component mount
  useEffect(() => {
    const storedAssignedBills = localStorage.getItem("assignedBills");
    const storedDeliveryStarted = localStorage.getItem("deliveryStarted");
    const storedDriverName = localStorage.getItem("driverName");

    if (storedAssignedBills) {
      setAssignedBills(JSON.parse(storedAssignedBills));
    }

    if (storedDeliveryStarted === "true") {
      setDeliveryStarted(true);
    }

    if (storedDriverName) {
      setDriverName(storedDriverName);
    }
  }, []);

  // Fetch payment accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      setIsLoading(true);
      try {
        const response = await api.get("/api/accounts/allaccounts");
        setAccounts(response.data);
      } catch (err) {
        setError("Failed to fetch payment accounts.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  // Update local storage whenever assignedBills, deliveryStarted, or driverName change
  useEffect(() => {
    localStorage.setItem("assignedBills", JSON.stringify(assignedBills));
    localStorage.setItem("deliveryStarted", deliveryStarted.toString());
    localStorage.setItem("driverName", driverName);
  }, [assignedBills, deliveryStarted, driverName]);

  // Fetch suggestions based on invoiceNo input
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (invoiceNo) {
        try {
          const response = await api.get(
            `/api/billing/billing/driver/suggestions?search=${invoiceNo}`
          );
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

  // Fetch deliveries for the driver
  useEffect(() => {
    const fetchMyDeliveries = async () => {
      if (!driverName || !userInfo?._id) return;
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.append("driverName", driverName);
        if (searchInvoiceNo) {
          params.append("invoiceNo", searchInvoiceNo);
        }
        params.append("userId", userInfo._id);

        const url = `/api/billing/deliveries/all?${params.toString()}`;
        const response = await api.get(url);
        setMyDeliveries(response.data);
      } catch (error) {
        console.error("Error fetching deliveries:", error);
        setError("Failed to fetch deliveries. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyDeliveries();
  }, [driverName, searchInvoiceNo, userInfo?._id]);

  const handleAssignBill = async (id) => {
    if (!invoiceNo) {
      setError("Please enter an invoice number.");
      return;
    }
    try {
      setIsLoading(true);
      const response = await api.get(`/api/billing/${id}`);
      const billingData = response.data;

      // Check if the bill is already assigned
      const isAlreadyAssigned = assignedBills.some(
        (bill) => bill.invoiceNo === billingData.invoiceNo
      );

      if (!isAlreadyAssigned) {
        // Initialize deliveredProducts with default values based on ordered quantity
        const deliveredProducts = billingData.products.map((product) => {
          const previousDeliveredQuantity = product.deliveredQuantity || 0;
          const pendingQuantity = product.quantity - previousDeliveredQuantity;
          return {
            item_id: product.item_id,
            deliveredQuantity: pendingQuantity,
            isDelivered: false,
            isPartiallyDelivered: false,
            pendingQuantity,
            name: product.name,
            quantity: product.quantity,
          };
        });

        const getPaymentMethod = accounts.map((acc) => acc.accountId);

        setAssignedBills((prevBills) => [
          ...prevBills,
          {
            ...billingData,
            newPaymentStatus: billingData.paymentStatus,
            remainingAmount:
              billingData.grandTotal -
              (billingData.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0),
            receivedAmount:
              billingData.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0,
            deliveredProducts,
            paymentAmount: null,
            paymentMethod: getPaymentMethod[0] || "",
            kmTravelled: "",
            startingKm: "",
            endKm: "",
            fuelCharge: "",
            otherExpenses: [{ amount: 0, remark: "", isNew: true }],
            totalOtherExpenses: 0,
            showDetails: true,
            activeSection: "Billing Details",
            deliveryId: "",
            showModal: false,
            modalStep: 1,
            method: "",
          },
        ]);
        setError("");
      } else {
        setError("This invoice is already assigned.");
      }

      setInvoiceNo("");
    } catch (error) {
      setError("Error fetching billing details. Please check the invoice number.");
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = (callback) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (callback) callback(location);
      },
      (error) => {
        console.error("Error fetching location:", error);
      }
    );
  };

  const handleStartDelivery = async () => {
    if (assignedBills.length === 0) {
      setError("No bills assigned to start delivery.");
      return;
    }

    setError("");
    setDeliveryStarted(true);

    getCurrentLocation(async (startLocation) => {
      if (startLocation) {
        for (let i = 0; i < assignedBills.length; i++) {
          const bill = assignedBills[i];
          try {
            const deliveryId = `${userInfo._id}-${bill.invoiceNo}-${Date.now()}`;

            await api.post("/api/users/billing/start-delivery", {
              userId: userInfo._id,
              driverName,
              invoiceNo: bill.invoiceNo,
              startLocation: [startLocation.longitude, startLocation.latitude],
              deliveryId,
            });

            setAssignedBills((prevBills) => {
              const updatedBills = [...prevBills];
              updatedBills[i].deliveryId = deliveryId;
              return updatedBills;
            });
          } catch (error) {
            console.error(`Error starting delivery for invoice ${bill.invoiceNo}:`, error);
            alert(`Error starting delivery for invoice ${bill.invoiceNo}.`);
          }
        }
      }
    });
  };

  const handleSuggestionClick = (suggestion) => {
    setSuggestions([]);
    handleAssignBill(suggestion._id);
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

  const handleDeliveredQuantityChange = (billIndex, productId, totalDelivered) => {
    const parsedQuantity = parseInt(totalDelivered, 10) || 0;
    setAssignedBills((prevBills) => {
      const updatedBills = [...prevBills];
      const bill = updatedBills[billIndex];
      const productIndex = bill.deliveredProducts.findIndex((p) => p.item_id === productId);
      if (productIndex >= 0) {
        const deliveredProduct = bill.deliveredProducts[productIndex];
        const newDeliveredQuantity = Math.min(parsedQuantity, deliveredProduct.quantity);
        deliveredProduct.deliveredQuantity = newDeliveredQuantity;

        if (newDeliveredQuantity === deliveredProduct.quantity) {
          deliveredProduct.isDelivered = true;
          deliveredProduct.isPartiallyDelivered = false;
        } else if (newDeliveredQuantity > 0) {
          deliveredProduct.isDelivered = false;
          deliveredProduct.isPartiallyDelivered = true;
        } else {
          deliveredProduct.isDelivered = false;
          deliveredProduct.isPartiallyDelivered = false;
        }
      }
      return updatedBills;
    });
  };

  const handlePaymentSubmit = async (billIndex) => {
    const bill = assignedBills[billIndex];
    if (!bill.paymentAmount || bill.paymentAmount <= 0 || !bill.paymentMethod) {
      setError("Please enter a valid payment amount and method.");
      return;
    }

    try {
      await api.post("/api/users/billing/update-payment", {
        invoiceNo: bill.invoiceNo,
        paymentAmount: bill.paymentAmount,
        paymentMethod: bill.paymentMethod,
        userId: userInfo._id,
      });

      const response = await api.get(`/api/billing/${bill._id}`);
      const updatedBillData = response.data;

      const getPaymentMethod = accounts.map((acc) => acc.accountId);

      setAssignedBills((prevBills) => {
        const updatedBills = [...prevBills];
        const updatedIndex = updatedBills.findIndex((b) => b.invoiceNo === bill.invoiceNo);
        if (updatedIndex !== -1) {
          updatedBills[updatedIndex] = {
            ...updatedBills[updatedIndex],
            ...updatedBillData,
            newPaymentStatus: updatedBillData.paymentStatus,
            remainingAmount:
              updatedBillData.grandTotal -
              (updatedBillData.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0),
            receivedAmount:
              updatedBillData.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0,
            paymentAmount: 0,
            paymentMethod: getPaymentMethod[0] || "",
          };
        }
        return updatedBills;
      });

      setError("");
      setShowSuccessModal(true);
    } catch (error) {
      setError("Error updating payment status.");
    }
  };

  const handleDelivered = (billIndex) => {
    setAssignedBills((prevBills) => {
      const updatedBills = [...prevBills];
      updatedBills[billIndex].showModal = true;
      updatedBills[billIndex].modalStep = 1;
      return updatedBills;
    });
  };

  const handleNext = (billIndex) => {
    setAssignedBills((prevBills) => {
      const updatedBills = [...prevBills];
      updatedBills[billIndex].modalStep = 2;
      return updatedBills;
    });
  };

  const handleSubmit = async (billIndex) => {
    setIsLoading(true);
    const bill = assignedBills[billIndex];
    setAssignedBills((prevBills) => {
      const updatedBills = [...prevBills];
      updatedBills[billIndex].showModal = false;
      return updatedBills;
    });

    try {
      await getCurrentLocation(async (endLocation) => {
        if (endLocation) {
          const deliveredProducts = bill.deliveredProducts.map((dp) => ({
            item_id: dp.item_id,
            deliveredQuantity: dp.deliveredQuantity,
          }));

          // Filter only new or edited expenses
          const updatedOtherExpenses = bill.otherExpenses
            .filter((exp) => exp.isNew || exp.isEdited || (exp.amount > 0 && exp.remark))
            .map((exp) => ({
              id: exp._id || null,
              amount: parseFloat(exp.amount) || 0,
              remark: exp.remark || "",
            }));

          const payload = {
            userId: userInfo._id,
            invoiceNo: bill.invoiceNo,
            driverName,
            endLocation: [endLocation.longitude, endLocation.latitude],
            deliveredProducts,
            kmTravelled: parseFloat(bill.kmTravelled) || 0,
            startingKm: parseFloat(bill.startingKm) || 0,
            endKm: parseFloat(bill.endKm) || 0,
            deliveryId: bill.deliveryId,
            fuelCharge: parseFloat(bill.fuelCharge) || 0,
            otherExpenses: updatedOtherExpenses,
            method: bill.method || "",
          };

          await api.post("/api/users/billing/end-delivery", payload);

          setCurrentDelivered({ invoiceNo: bill.invoiceNo, deliveryId: bill.deliveryId });

          setAssignedBills((prevBills) => {
            const updatedBills = [...prevBills];
            updatedBills.splice(billIndex, 1);
            return updatedBills;
          });

          if (assignedBills.length === 1) {
            setDeliveryStarted(false);
          }

          setShowDeliveredModal(true);
          setTimeout(() => setShowSuccessModal(false), 3000);
        }
      });
    } catch (error) {
      console.error("Error updating delivery status:", error);
      setError("Error updating delivery status.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtherExpensesChange = (billIndex, index, field, value) => {
    setAssignedBills((prevBills) => {
      const updatedBills = [...prevBills];
      const updatedExpenses = [...updatedBills[billIndex].otherExpenses];
      updatedExpenses[index][field] = field === "amount" ? parseFloat(value) || 0 : value;
      updatedExpenses[index].isEdited = true; // Mark as edited
      updatedBills[billIndex].otherExpenses = updatedExpenses;
      return updatedBills;
    });
  };

  const handleAddExpense = (billIndex) => {
    setAssignedBills((prevBills) => {
      const updatedBills = [...prevBills];
      updatedBills[billIndex].otherExpenses.push({ amount: 0, remark: "", isNew: true });
      return updatedBills;
    });
  };

  const handleCancel = (billIndex) => {
    try {
      // Simply remove the bill from assignedBills
      setAssignedBills((prevBills) => {
        const updatedBills = [...prevBills];
        updatedBills.splice(billIndex, 1);
        return updatedBills;
      });

      if (assignedBills.length === 1) {
        setDeliveryStarted(false);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred");
    }
  };

  const handleUpdateDelivery = async () => {
    try {
      // Filter new or edited expenses
      const filteredExpenses = selectedDelivery.otherExpenses.filter(
        (exp) => exp.isNew || exp.isEdited || (exp.amount > 0 && exp.remark)
      );

      const updatedOtherExpenses = filteredExpenses.map((exp) => ({
        id: exp._id || null,
        amount: parseFloat(exp.amount) || 0,
        remark: exp.remark || "",
      }));

      const deliveredProducts = selectedDelivery.productsDelivered.map((dp) => ({
        item_id: dp.item_id,
        deliveredQuantity: dp.deliveredQuantity || 0,
      }));

      const payload = {
        deliveryId: selectedDelivery.deliveryId,
        startingKm: parseFloat(selectedDelivery.startingKm) || 0,
        endKm: parseFloat(selectedDelivery.endKm) || 0,
        fuelCharge: parseFloat(selectedDelivery.fuelCharge) || 0,
        method: selectedDelivery.method || "",
        updatedOtherExpenses,
        deliveredProducts,
      };

      const response = await api.put("/api/billing/update-delivery/update", payload);

      if (response.status === 200) {
        alert("Successfully updated");
        setShowDeliveryModal(false);
        setSelectedDelivery(null);

        // Refresh the deliveries list
        const params = new URLSearchParams();
        params.append("driverName", driverName);
        if (searchInvoiceNo) {
          params.append("invoiceNo", searchInvoiceNo);
        }
        if (userInfo?._id) {
          params.append("userId", userInfo._id);
        }
        const url = `/api/billing/deliveries/all?${params.toString()}`;
        const updatedDeliveries = await api.get(url);
        setMyDeliveries(updatedDeliveries.data);
      } else {
        alert("Update failed: " + response.data.message);
      }
    } catch (error) {
      console.error("Error updating delivery:", error);
      alert("Error updating delivery: " + error.message);
    }
  };

  const handleDeleteDelivery = async (deliveryId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this delivery? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.delete(`/api/billing/deliveries/${deliveryId}`);

      if (response.status === 200) {
        alert("Delivery deleted successfully.");
        // Refresh the deliveries list
        const params = new URLSearchParams();
        params.append("driverName", driverName);
        if (searchInvoiceNo) {
          params.append("invoiceNo", searchInvoiceNo);
        }
        if (userInfo?._id) {
          params.append("userId", userInfo._id);
        }
        const url = `/api/billing/deliveries/all?${params.toString()}`;
        const updatedDeliveries = await api.get(url);
        setMyDeliveries(updatedDeliveries.data);
      } else {
        alert("Failed to delete delivery: " + response.data.message);
      }
    } catch (error) {
      console.error("Error deleting delivery:", error);
      alert("Error deleting delivery. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {isLoading && <Loading />}

      {/* Header */}
      <div className="flex max-w-4xl mx-auto items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 mt-6 relative">
        <div onClick={() => navigate("/")} className="text-center cursor-pointer">
          <h2 className="text-md font-bold text-red-600">Travancore Backers</h2>
          <p className="text-gray-400 text-xs font-bold">Delivery & Payment Updation</p>
        </div>
        <i className="fa fa-truck text-gray-500" />
      </div>

      {!deliveryStarted && (
        <div className="flex justify-center gap-8 mb-4">
          <button
            className={`font-bold text-xs focus:outline-none relative pb-2 transition-all duration-300 ${
              activeSection === "home" ? "text-red-600 border-b-2 border-red-600" : "text-gray-600"
            }`}
            onClick={() => setActiveSection("home")}
          >
            Home
            {activeSection === "home" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 transition-all duration-300"></span>
            )}
          </button>
          <button
            className={`font-bold text-xs focus:outline-none relative pb-2 transition-all duration-300 ${
              activeSection === "my" ? "text-red-600 border-b-2 border-red-600" : "text-gray-600"
            }`}
            onClick={() => setActiveSection("my")}
          >
            My Deliveries
            {activeSection === "my" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 transition-all duration-300"></span>
            )}
          </button>
          <button
            className={`font-bold text-xs focus:outline-none relative pb-2 transition-all duration-300 ${
              activeSection === "assign" ? "text-red-600 border-b-2 border-red-600" : "text-gray-600"
            }`}
            onClick={() => setActiveSection("assign")}
          >
            Start Delivery
            {activeSection === "assign" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 transition-all duration-300"></span>
            )}
          </button>
        </div>
      )}

      <div className="flex flex-col justify-center items-center px-2">
        <div className="bg-white shadow-xl rounded-lg w-full max-w-4xl p-6">
          {activeSection === "home" && !deliveryStarted && (
            <div className="my-deliveries-section mt-8 text-center">
              <p className="text-xs font-bold text-gray-600 mb-4">Quick Access</p>
              <button
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 mt-4 rounded w-full"
                onClick={() => setActiveSection("my")}
              >
                My Deliveries
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 mt-4 rounded w-full"
                onClick={() => setActiveSection("assign")}
              >
                Start Delivery
              </button>
            </div>
          )}

          {activeSection === "assign" && !deliveryStarted && (
            <>
              <div className="mb-6">
                <label className="font-bold text-xs text-gray-500">Driver Name</label>
                <input
                  type="text"
                  placeholder="Enter Driver Name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:border-red-200 focus:ring-red-500 text-xs"
                />
                <div className="relative w-full mt-4">
                  <label className="font-bold text-xs text-gray-500">Invoice No.</label>
                  <input
                    type="text"
                    placeholder="Enter Invoice Number"
                    value={invoiceNo}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:border-red-200 focus:ring-red-500 text-xs"
                    readOnly={driverName.length === 0}
                  />
                  <i
                    onClick={() => setInvoiceNo(" ")}
                    className="fa fa-angle-down absolute right-3 bottom-3 text-gray-400 cursor-pointer"
                  ></i>
                </div>
              </div>

              {suggestions.length > 0 && (
                <ul className="bg-white divide-y shadow-lg rounded-md overflow-hidden mb-4 border border-gray-300 max-h-48 overflow-y-auto">
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

              {error && <p className="text-red-500 text-center mt-4">{error}</p>}

              {assignedBills.length > 0 && (
                <div className="assigned-bills-preview mb-6">
                  <h3 className="font-bold text-gray-600 mb-4 text-xs">Assigned Bills</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assignedBills.map((bill, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg shadow">
                        <h4 className="font-bold text-gray-800 mb-2 text-xs">
                          Invoice No: {bill.invoiceNo}
                        </h4>
                        <p className="text-xs text-gray-600">Customer: {bill.customerName}</p>
                        <p className="text-xs text-gray-600">Address: {bill.customerAddress}</p>
                        <p className="text-xs font-bold text-gray-600">
                          Net Amount: ₹ {bill.grandTotal}
                        </p>
                        <p className="text-xs text-gray-600">
                          Products: {bill.deliveredProducts?.length}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 mt-4 rounded w-full"
                onClick={handleStartDelivery}
                disabled={assignedBills.length === 0}
              >
                Start Delivery
              </button>
            </>
          )}

          {deliveryStarted && assignedBills.length > 0 && (
            <div>
              <p className="font-bold text-sm mb-10 text-gray-600">Assigned Invoices</p>
              {assignedBills.map((bill, billIndex) => (
                <div key={bill.invoiceNo} className="mb-8 border-t-2 border-red-300 pt-4">
                  <h5 className="text-md font-bold tracking-tight text-gray-600">
                    Invoice No: {bill.invoiceNo}
                  </h5>
                  <div className="flex justify-center gap-8 mt-4">
                    <button
                      className={`font-bold text-xs focus:outline-none relative pb-2 transition-all duration-300 ${
                        bill.activeSection === "Billing Details"
                          ? "text-red-600 border-b-2 border-red-600"
                          : "text-gray-600"
                      }`}
                      onClick={() =>
                        setAssignedBills((prevBills) => {
                          const updatedBills = [...prevBills];
                          updatedBills[billIndex].activeSection = "Billing Details";
                          return updatedBills;
                        })
                      }
                    >
                      Billing Details
                      {bill.activeSection === "Billing Details" && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></span>
                      )}
                    </button>

                    <button
                      className={`font-bold text-xs focus:outline-none relative pb-2 transition-all duration-300 ${
                        bill.activeSection === "Payment Section"
                          ? "text-red-600 border-b-2 border-red-600"
                          : "text-gray-600"
                      }`}
                      onClick={() =>
                        setAssignedBills((prevBills) => {
                          const updatedBills = [...prevBills];
                          updatedBills[billIndex].activeSection = "Payment Section";
                          return updatedBills;
                        })
                      }
                    >
                      Payment Section
                      {bill.activeSection === "Payment Section" && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></span>
                      )}
                    </button>
                  </div>

                  {bill.showDetails && (
                    <div>
                      {bill.activeSection === "Billing Details" && (
                        <div>
                          <div className="mt-4 space-y-1 text-xs text-gray-600">
                            <div className="flex justify-between">
                              <p className="font-bold">Customer: {bill.customerName}</p>
                              <p>Address: {bill.customerAddress}</p>
                            </div>
                            <div className="flex justify-between">
                              <p>Salesman: {bill.salesmanName}</p>
                              <p>
                                Invoice Date: {new Date(bill.invoiceDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex justify-between">
                              <p>
                                Expected Delivery:{" "}
                                {new Date(bill.expectedDeliveryDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex justify-between font-bold text-gray-600">
                              <p>Bill Amount: ₹ {bill.grandTotal}</p>
                              <p>Discount: ₹ {bill.discount}</p>
                            </div>
                            <div className="flex justify-between">
                              <p className="text-green-600">
                                Received Amount: ₹ {bill.receivedAmount}
                              </p>
                              <p className="font-bold text-red-600">
                                Remaining Amount: ₹ {bill.remainingAmount}
                              </p>
                            </div>
                            <div className="flex justify-between font-bold">
                              <p className="text-gray-600">Payment Status: {bill.paymentStatus}</p>
                              <p className="text-gray-600">Delivery Status: Transit-In</p>
                            </div>
                          </div>

                          <div className="mt-6">
                            <div className="hidden md:block overflow-x-auto">
                              <table className="w-full text-xs text-left text-gray-700">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Qty. Ordered</th>
                                    <th className="px-4 py-3">Qty. Pending</th>
                                    <th className="px-4 py-3">Qty. Delivered</th>
                                    <th className="px-4 py-3">Delivered</th>
                                    <th className="px-4 py-3">Partially Delivered</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bill.deliveredProducts.map((dp, index) => {
                                    const shortName =
                                      dp.name.length > 20 ? dp.name.slice(0, 15) + "..." : dp.name;
                                    return (
                                      <tr key={index} className="bg-white border-b">
                                        <th scope="row" className="px-4 py-4 font-bold text-sm text-gray-600">
                                          {shortName}
                                        </th>
                                        <td className="px-4 py-4">{dp.item_id}</td>
                                        <td className="px-4 py-4">{dp.quantity}</td>
                                        <td className="px-4 py-4">{dp.pendingQuantity}</td>
                                        <td className="px-4 py-4">
                                          <input
                                            type="number"
                                            min="0"
                                            max={dp.pendingQuantity}
                                            value={dp.deliveredQuantity}
                                            onChange={(e) =>
                                              handleDeliveredQuantityChange(
                                                billIndex,
                                                dp.item_id,
                                                e.target.value
                                              )
                                            }
                                            className="w-16 p-1 border border-gray-300 rounded"
                                          />
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                          <i
                                            className={`fa ${
                                              dp.isDelivered
                                                ? "fa-check text-red-500"
                                                : "fa-times text-red-500"
                                            }`}
                                          ></i>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                          <i
                                            className={`fa ${
                                              dp.isPartiallyDelivered
                                                ? "fa-check text-yellow-500"
                                                : "fa-times text-red-500"
                                            }`}
                                          ></i>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile layout */}
                            <div className="md:hidden space-y-4">
                              {assignedBills.map((ab, bIndex) =>
                                ab.deliveredProducts.map((dp) => (
                                  <DeliveredProducts
                                    key={dp.item_id}
                                    dp={dp}
                                    billIndex={bIndex}
                                    handleDeliveredQuantityChange={handleDeliveredQuantityChange}
                                  />
                                ))
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between mt-6 gap-4">
                            <button
                              className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-1 rounded-lg w-full"
                              onClick={() => handleDelivered(billIndex)}
                            >
                              Continue
                            </button>
                            <button
                              className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold text-xs px-4 py-1 rounded-lg w-full"
                              onClick={() => handleCancel(billIndex)}
                            >
                              Cancel Delivery
                            </button>
                          </div>

                          {bill.showModal && (
                            <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50 overflow-auto">
                              <div className="bg-white animate-slide-up top-1/4 rounded-lg w-full max-w-xl shadow-lg p-6 relative">
                                <button
                                  className="absolute font-bold top-4 right-4 text-gray-600 hover:text-gray-600"
                                  onClick={() =>
                                    setAssignedBills((prevBills) => {
                                      const updatedBills = [...prevBills];
                                      updatedBills[billIndex].showModal = false;
                                      return updatedBills;
                                    })
                                  }
                                >
                                  &times;
                                </button>

                                {bill.modalStep === 1 && (
                                  <>
                                    <h5 className="mb-4 text-sm font-bold text-gray-600">
                                      Delivery Summary
                                    </h5>
                                    <div className="text-xs text-gray-600 space-y-2">
                                      <p>
                                        <span className="font-bold">Invoice Number:</span>{" "}
                                        {bill.invoiceNo}
                                      </p>
                                      <p>
                                        <span className="font-bold">Customer:</span> {bill.customerName}
                                      </p>
                                      <p>
                                        <span className="font-bold">Address:</span> {bill.customerAddress}
                                      </p>
                                      <p>
                                        <span className="font-bold">Expected Delivery Date:</span>{" "}
                                        {new Date(bill.expectedDeliveryDate).toLocaleDateString()}
                                      </p>
                                      <p>
                                        <span className="font-bold">Bill Amount:</span> ₹ {bill.grandTotal}
                                      </p>
                                      <p>
                                        <span className="font-bold">Received Amount:</span> ₹{" "}
                                        {bill.receivedAmount}
                                      </p>
                                      <p>
                                        <span className="font-bold">Remaining Balance:</span> ₹{" "}
                                        {bill.remainingAmount}
                                      </p>
                                    </div>

                                    <div className="mt-4">
                                      <h6 className="font-bold text-sm text-gray-700">
                                        Delivered Products: {bill.deliveredProducts?.length}
                                      </h6>
                                      <ul className="list-disc list-inside text-xs text-gray-700 mt-2 space-y-1">
                                        {bill.deliveredProducts.map((dp) => {
                                          const productName =
                                            dp.name.length > 30
                                              ? dp.name.slice(0, 30) + ".."
                                              : dp.name;
                                          if (dp.deliveredQuantity > 0) {
                                            return (
                                              <li
                                                className="bg-gray-100 p-2 rounded-lg"
                                                key={dp.item_id}
                                              >
                                                <div className="flex justify-between">
                                                  <p className="font-bold">{dp.item_id}</p>
                                                  <p className="font-bold">{productName}</p>
                                                </div>
                                                <p className="font-bold">
                                                  Delivered Quantity: {dp.deliveredQuantity}
                                                </p>
                                              </li>
                                            );
                                          }
                                          return null;
                                        })}
                                      </ul>
                                    </div>

                                    <div className="flex justify-center mt-6">
                                      <button
                                        className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-6 py-2 rounded-lg"
                                        onClick={() => handleNext(billIndex)}
                                      >
                                        Next
                                      </button>
                                    </div>
                                  </>
                                )}

                                {bill.modalStep === 2 && (
                                  <>
                                    <h5 className="mb-4 text-sm font-bold text-red-500">
                                      Additional Details
                                    </h5>
                                    <div className="flex flex-col gap-4">
                                      <div>
                                        <label className="block text-xs text-gray-400">Starting KM</label>
                                        <input
                                          type="number"
                                          value={bill.startingKm}
                                          onChange={(e) =>
                                            setAssignedBills((prevBills) => {
                                              const updatedBills = [...prevBills];
                                              const val = parseFloat(e.target.value) || 0;
                                              updatedBills[billIndex].startingKm = val;
                                              updatedBills[billIndex].kmTravelled =
                                                (parseFloat(updatedBills[billIndex].endKm) || 0) - val;
                                              return updatedBills;
                                            })
                                          }
                                          className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-xs text-gray-400">Ending KM</label>
                                        <input
                                          type="number"
                                          value={bill.endKm}
                                          onChange={(e) =>
                                            setAssignedBills((prevBills) => {
                                              const updatedBills = [...prevBills];
                                              const newEndKm = parseFloat(e.target.value) || 0;
                                              updatedBills[billIndex].endKm = newEndKm;
                                              updatedBills[billIndex].kmTravelled =
                                                newEndKm - (parseFloat(updatedBills[billIndex].startingKm) || 0);
                                              updatedBills[billIndex].fuelCharge = (
                                                ((parseFloat(updatedBills[billIndex].kmTravelled) || 0) /
                                                  10) *
                                                96
                                              ).toFixed(2);
                                              return updatedBills;
                                            })
                                          }
                                          className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-xs font-bold text-gray-400">
                                          Distance Travelled (km)
                                        </label>
                                        <input
                                          type="number"
                                          value={bill.kmTravelled}
                                          readOnly
                                          className="w-full border bg-gray-100 border-gray-300 px-3 py-2 rounded-md text-xs"
                                        />
                                      </div>

                                      <div>
                                        <label className="block text-xs font-bold text-gray-400">Fuel Charge</label>
                                        <input
                                          type="number"
                                          value={bill.fuelCharge}
                                          onChange={(e) =>
                                            setAssignedBills((prevBills) => {
                                              const updatedBills = [...prevBills];
                                              updatedBills[billIndex].fuelCharge = parseFloat(e.target.value) || 0;
                                              return updatedBills;
                                            })
                                          }
                                          className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                                        />
                                      </div>

                                      <div className="mt-4">
                                        <h6 className="text-xs font-bold text-gray-500 mb-1">
                                          Add Other Expenses
                                        </h6>
                                        {bill.otherExpenses.map((expense, idx) => (
                                          <div key={idx} className="flex gap-2 mb-2">
                                            <input
                                              type="number"
                                              value={expense.amount}
                                              onChange={(e) =>
                                                handleOtherExpensesChange(billIndex, idx, "amount", e.target.value)
                                              }
                                              placeholder="Amount"
                                              className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                                            />
                                            <input
                                              type="text"
                                              value={expense.remark}
                                              onChange={(e) =>
                                                handleOtherExpensesChange(billIndex, idx, "remark", e.target.value)
                                              }
                                              placeholder="Remark"
                                              className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                                            />
                                          </div>
                                        ))}
                                        <button
                                          onClick={() => handleAddExpense(billIndex)}
                                          className="text-xs font-bold text-blue-500 hover:text-blue-700 mt-2"
                                        >
                                          + Add Expense
                                        </button>
                                      </div>

                                      <div>
                                        <label className="block text-xs font-bold text-gray-400">
                                          Expense Payment Method
                                        </label>
                                        <select
                                          value={bill.method || ""}
                                          onChange={(e) =>
                                            setAssignedBills((prevBills) => {
                                              const updatedBills = [...prevBills];
                                              updatedBills[billIndex].method = e.target.value;
                                              return updatedBills;
                                            })
                                          }
                                          className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                                        >
                                          <option value="">Select method</option>
                                          {accounts.map((acc) => (
                                            <option key={acc.accountId} value={acc.accountId}>
                                              {acc.accountName}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    <div className="flex justify-right mt-6 gap-4">
                                      <button
                                        className="bg-gray-400 hover:bg-gray-500 text-white font-bold text-xs px-4 py-2 rounded-lg w-1/2"
                                        onClick={() =>
                                          setAssignedBills((prevBills) => {
                                            const updatedBills = [...prevBills];
                                            updatedBills[billIndex].modalStep = 1;
                                            return updatedBills;
                                          })
                                        }
                                      >
                                        Back
                                      </button>
                                      <button
                                        className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-lg w-full"
                                        onClick={() => handleSubmit(billIndex)}
                                      >
                                        Submit
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {bill.activeSection === "Payment Section" && (
                        <div className="mt-6 pt-4 border-t">
                          <div className="flex justify-between mb-6 border-b pb-5">
                            <p
                              className={`${
                                bill.newPaymentStatus === "Paid"
                                  ? "bg-red-200"
                                  : bill.newPaymentStatus === "Partial"
                                  ? "bg-yellow-200"
                                  : "bg-red-200"
                              } text-center mt-auto py-4 font-bold text-xs rounded-lg px-10`}
                            >
                              <span
                                className={`${
                                  bill.newPaymentStatus === "Paid"
                                    ? "text-red-500"
                                    : bill.newPaymentStatus === "Partial"
                                    ? "text-yellow-500"
                                    : "text-red-800"
                                } animate-pulse font-bold text-sm`}
                              >
                                {bill.newPaymentStatus}
                              </span>
                            </p>
                            <div className="text-right">
                              <button
                                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-3 rounded-lg"
                                onClick={() => handlePaymentSubmit(billIndex)}
                              >
                                Submit Payment
                              </button>
                              <p className="italic text-gray-400 text-xs mt-1">
                                Ensure all fields are filled before submission
                              </p>
                            </div>
                          </div>
                          <h3 className="text-md font-bold text-gray-600 mb-2">Add Payment</h3>
                          <div className="flex flex-col gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">
                                Payment Amount
                              </label>
                              <input
                                type="number"
                                value={bill.paymentAmount || ""}
                                onChange={(e) =>
                                  setAssignedBills((prevBills) => {
                                    const updatedBills = [...prevBills];
                                    updatedBills[billIndex].paymentAmount = Math.min(
                                      Number(e.target.value) || 0,
                                      bill.remainingAmount
                                    );
                                    return updatedBills;
                                  })
                                }
                                className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">
                                Payment Method
                              </label>
                              <select
                                value={bill.paymentMethod || ""}
                                onChange={(e) =>
                                  setAssignedBills((prevBills) => {
                                    const updatedBills = [...prevBills];
                                    updatedBills[billIndex].paymentMethod = e.target.value;
                                    return updatedBills;
                                  })
                                }
                                className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                              >
                                {accounts.map((acc) => (
                                  <option key={acc.accountId} value={acc.accountId}>
                                    {acc.accountName}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">
                                Remaining Amount
                              </label>
                              <p className="font-bold text-gray-600">₹ {bill.remainingAmount}</p>
                            </div>
                            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showSuccessModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white text-center p-6 rounded-lg shadow-lg">
                <h3 className="text-md font-bold text-gray-500">Operation Successful</h3>
                <p className="text-xs italic text-gray-400 mt-1 mb-5">
                  Successfully updated the billing information.
                </p>
                <button
                  className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-lg"
                  onClick={() => setShowSuccessModal(false)}
                >
                  <i className="fa fa-check" />
                </button>
              </div>
            </div>
          )}

          {deliveredModal && (
            <DeliverySuccess
              invoiceNo={currentDelivered?.invoiceNo}
              deliveryNo={currentDelivered?.deliveryId}
              setDeliveryModal={setShowDeliveredModal}
            />
          )}

          {activeSection === "home" && !deliveryStarted && <LowStockPreview driverPage={true} />}

          {activeSection === "my" && (
            <div className="my-deliveries-section mt-8">
              <h2 className="text-xl font-bold text-gray-600 mb-4">My Deliveries</h2>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search by Invoice Number"
                  value={searchInvoiceNo}
                  onChange={(e) => setSearchInvoiceNo(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-red-300 focus:ring-red-300 text-xs"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myDeliveries.map((delivery) => (
                  <div
                    onClick={() => {
                      setSelectedDelivery(delivery);
                      setShowDeliveryModal(true);
                    }}
                    key={delivery.deliveryId}
                    className="bg-white cursor-pointer shadow-md rounded-lg p-4 relative"
                  >
                    <button
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDelivery(delivery.deliveryId);
                      }}
                      title="Delete Delivery"
                    >
                      <i className="fa fa-trash"></i>
                    </button>
                    <h3 className="text-md font-bold text-gray-600">Invoice No: {delivery.invoiceNo}</h3>
                    <p className="text-xs text-gray-500">Customer: {delivery.customerName}</p>
                    <p className="text-xs text-gray-500">Billing Amount: ₹ {delivery.grandTotal}</p>
                    <p className="text-xs text-gray-500">Payment Status: {delivery.paymentStatus}</p>
                    <p className="text-xs text-gray-500">Delivery Status: {delivery.deliveryStatus}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showDeliveryModal && selectedDelivery && (
            <div className="fixed animate-slide-up overflow-auto inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white top-1/4 rounded-lg w-full max-w-lg shadow-lg p-6 relative">
                <button
                  className="absolute top-4 right-4 text-gray-600 hover:text-gray-600"
                  onClick={() => {
                    setShowDeliveryModal(false);
                    setSelectedDelivery(null);
                  }}
                >
                  &times;
                </button>

                <h5 className="mb-4 text-sm font-bold text-gray-600">
                  Edit Delivery Details - Invoice No: {selectedDelivery.invoiceNo}
                </h5>
                <div className="text-xs text-gray-600 space-y-2">
                  <p>
                    <span className="font-bold">Customer:</span> {selectedDelivery.customerName}
                  </p>
                  <p>
                    <span className="font-bold">Address:</span> {selectedDelivery.customerAddress}
                  </p>
                  <p>
                    <span className="font-bold">Billing Amount:</span> ₹ {selectedDelivery.grandTotal}
                  </p>
                  <p>
                    <span className="font-bold">Payment Status:</span> {selectedDelivery.paymentStatus}
                  </p>
                  <p>
                    <span className="font-bold">Delivery Status:</span> {selectedDelivery.deliveryStatus}
                  </p>
                </div>

                <div className="flex flex-col gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400">Starting KM</label>
                    <input
                      type="number"
                      value={selectedDelivery.startingKm || 0}
                      onChange={(e) =>
                        setSelectedDelivery((prev) => ({
                          ...prev,
                          startingKm: parseFloat(e.target.value) || 0,
                          kmTravelled:
                            (parseFloat(prev.endKm) || 0) - (parseFloat(e.target.value) || 0),
                        }))
                      }
                      className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400">Ending KM</label>
                    <input
                      type="number"
                      value={selectedDelivery.endKm || 0}
                      onChange={(e) =>
                        setSelectedDelivery((prev) => {
                          const newEndKm = parseFloat(e.target.value) || 0;
                          const distance = newEndKm - (parseFloat(prev.startingKm) || 0);
                          return {
                            ...prev,
                            endKm: newEndKm,
                            kmTravelled: distance,
                            fuelCharge: ((distance / 10) * 96).toFixed(2),
                          };
                        })
                      }
                      className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400">
                      Distance Travelled (km)
                    </label>
                    <input
                      type="number"
                      value={selectedDelivery.kmTravelled || 0}
                      readOnly
                      className="w-full border-gray-300 px-3 py-2 mt-1 rounded-md bg-gray-100 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400">Fuel Charge</label>
                    <input
                      type="number"
                      value={selectedDelivery.fuelCharge || 0}
                      onChange={(e) =>
                        setSelectedDelivery((prev) => ({
                          ...prev,
                          fuelCharge: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                    />
                  </div>

                  <div className="mt-4">
                    <h6 className="text-xs font-bold text-gray-500 mb-1">Other Expenses</h6>
                    {selectedDelivery.otherExpenses.map((expense, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="number"
                          value={expense.amount || 0}
                          onChange={(e) => {
                            const updatedExpenses = [...selectedDelivery.otherExpenses];
                            updatedExpenses[index] = {
                              ...updatedExpenses[index],
                              amount: parseFloat(e.target.value) || 0,
                              isEdited: true,
                            };
                            setSelectedDelivery((prev) => ({
                              ...prev,
                              otherExpenses: updatedExpenses,
                            }));
                          }}
                          placeholder="Amount"
                          className="w-1/2 p-2 border border-gray-300 rounded-md text-xs"
                        />
                        <input
                          type="text"
                          value={expense.remark || ""}
                          onChange={(e) => {
                            const updatedExpenses = [...selectedDelivery.otherExpenses];
                            updatedExpenses[index] = {
                              ...updatedExpenses[index],
                              remark: e.target.value,
                              isEdited: true,
                            };
                            setSelectedDelivery((prev) => ({
                              ...prev,
                              otherExpenses: updatedExpenses,
                            }));
                          }}
                          placeholder="Remark"
                          className="w-1/2 p-2 border border-gray-300 rounded-md text-xs"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setSelectedDelivery((prev) => ({
                          ...prev,
                          otherExpenses: [...prev.otherExpenses, { amount: 0, remark: "", isNew: true }],
                        }));
                      }}
                      className="text-xs font-bold text-blue-500 hover:text-blue-700 mt-2"
                    >
                      + Add Expense
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Expense Payment Method
                    </label>
                    <select
                      value={selectedDelivery.method || ""}
                      onChange={(e) =>
                        setSelectedDelivery((prev) => ({
                          ...prev,
                          method: e.target.value,
                        }))
                      }
                      className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                    >
                      <option value="">Select Method</option>
                      {accounts.map((acc) => (
                        <option key={acc.accountId} value={acc.accountId}>
                          {acc.accountName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <h6 className="font-bold text-gray-700">Delivered Products:</h6>
                  <div className="space-y-4 mt-2">
                    {selectedDelivery.productsDelivered.map((dp, index) => (
                      <div key={dp.item_id} className="border-b pb-2">
                        <p className="text-xs font-bold">Item ID: {dp.item_id}</p>
                        <label className="block text-xs font-bold text-gray-400 mt-2">
                          Delivered Quantity
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={dp.deliveredQuantity || 0}
                          onChange={(e) => {
                            const updated = [...selectedDelivery.productsDelivered];
                            updated[index].deliveredQuantity = parseFloat(e.target.value) || 0;
                            updated[index].isEdited = true;
                            setSelectedDelivery((prev) => ({ ...prev, productsDelivered: updated }));
                          }}
                          className="w-full border border-gray-300 px-3 py-1 rounded-md text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end mt-6 gap-4">
                  <button
                    className="bg-gray-400 hover:bg-gray-500 text-white font-bold text-xs px-4 py-2 rounded-lg"
                    onClick={() => {
                      setShowDeliveryModal(false);
                      setSelectedDelivery(null);
                    }}
                  >
                    Close
                  </button>
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-lg"
                    onClick={handleUpdateDelivery}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverBillingPage;
