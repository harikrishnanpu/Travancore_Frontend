import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPurchase } from "../actions/productActions"; // Adjust if needed
import { useNavigate } from "react-router-dom";
import api from "./api";
import ErrorModal from "../components/ErrorModal";
import BillingSuccess from "../components/billingsuccess";

export default function PurchasePage() {
  const [currentStep, setCurrentStep] = useState(1);

  // Seller (Supplier) Information
  const [sellerId, setSellerId] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [sellerGst, setSellerGst] = useState("");
  const [sellerSuggestions, setSellerSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Purchase Information
  const [lastBillId, setLastBillId] = useState("");
  const [purchaseId, setPurchaseId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [billingDate, setBillingDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [invoiceDate, setInvoiceDate] = useState("");

  // Items
  const [items, setItems] = useState([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [lastItemId, setLastItemId] = useState("");

  // Fields for a new item
  const [itemId, setItemId] = useState("");
  const [mrp, setMrp] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemBrand, setItemBrand] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemPurchaseUnit, setItemPurchaseUnit] = useState(""); // e.g., BOX, PACK
  const [itemSellingUnit, setItemSellingUnit] = useState("");  // e.g., PCS, KG
  const [psRatio, setPsRatio] = useState("");                  // Pack Size Ratio
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemPurchasePrice, setItemPurchasePrice] = useState("");
  const [itemGstPercent, setItemGstPercent] = useState("");    // e.g., 5, 12, 18
  const [itemExpiry, setItemExpiry] = useState("");            // item expiry date

  // Categories and Transport Companies
  const [categories, setCategories] = useState([]);
  const [transportCompanies, setTransportCompanies] = useState([]);

  // Transportation and Other Expense
  const [transportCompany, setTransportCompany] = useState("");
  const [transportGst, setTransportGst] = useState("");
  const [transportAmount, setTransportAmount] = useState("");
  const [transportBillId, setTransportBillId] = useState("");
  const [transportRemark, setTransportRemark] = useState("");
  const [otherExpense, setOtherExpense] = useState("");
  const [logicField, setLogicField] = useState(""); // "logic" field as requested

  // For success screen
  const [success, setSuccess] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState("");

  // Other States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  // Refs for input fields to enable Enter navigation
  const sellerNameRef = useRef();
  const sellerIdRef = useRef();
  const invoiceNoRef = useRef();
  const purchaseIdRef = useRef();
  const sellerAddressRef = useRef();
  const sellerGstRef = useRef();
  const billingDateRef = useRef();
  const invoiceDateRef = useRef();

  const itemIdRef = useRef();
  const itemNameRef = useRef();
  const itemBrandRef = useRef();
  const itemCategoryRef = useRef();
  const itemPurchaseUnitRef = useRef();
  const itemSellingUnitRef = useRef();
  const psRatioRef = useRef();
  const itemQuantityRef = useRef();
  const itemPurchasePriceRef = useRef();
  const itemGstPercentRef = useRef();
  const itemExpiryRef = useRef();
  const mrpRef = useRef();

  const transportCompanyRef = useRef();
  const transportAmountRef = useRef();
  const transportRemarkRef = useRef();
  const otherExpenseRef = useRef();

  // Effect to auto-hide messages after 3 seconds
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage("");
        setError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  // Fetch Last Bill ID on Mount
  useEffect(() => {
    const fetchLastBill = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/purchases/lastOrder/id");
        const response = await api.get("/api/products/lastadded/id");

        // Example: "TC100" => parse + increment
        const nextPurchaseId = data
          ? "TC" + (parseInt(data.replace("TC", ""), 10) + 1)
          : "TC1";

        setLastBillId(data || "TC0");
        setPurchaseId(nextPurchaseId);

        if (response.data) {
          setLastItemId(response.data);
        }
      } catch (error) {
        console.error("Error fetching last bill:", error);
        setError("Failed to fetch last billing information.");
        setShowErrorModal(true);
      } finally {
        setLoading(false);
      }
    };
    fetchLastBill();
  }, []);

  // Focus on the first input of each step
  useEffect(() => {
    if (currentStep === 1) {
      purchaseIdRef.current?.focus();
    } else if (currentStep === 2) {
      sellerAddressRef.current?.focus();
    } else if (currentStep === 3) {
      itemIdRef.current?.focus();
    } else if (currentStep === 4) {
      otherExpenseRef.current?.focus();
    }
  }, [currentStep]);

  // Fetch categories and transport companies on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await api.get("/api/billing/purchases/categories");
        setCategories(data.categories || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setError("Failed to fetch categories.");
        setShowErrorModal(true);
      }
    };

    const fetchTransportCompanies = async () => {
      try {
        const { data } = await api.get(
          "/api/purchases/get-all/transportCompany"
        );
        setTransportCompanies(data.transportCompanies || data || []);
      } catch (error) {
        console.error("Error fetching transport companies:", error);
        setError("Failed to fetch transport companies.");
        setShowErrorModal(true);
      }
    };

    fetchCategories();
    fetchTransportCompanies();
  }, []);

  // Handle Seller Name change with suggestions
  const handleSellerNameChange = async (e) => {
    const value = e.target.value;
    setSellerName(value);
    if (value.trim() === "") {
      setSellerSuggestions([]);
      setSellerId("");
      return;
    }
    try {
      const { data } = await api.get(
        `/api/billing/purchases/suggestions?q=${value}`
      );
      setSellerSuggestions(data.suggestions);
    } catch (err) {
      setError("Error fetching seller suggestions");
      setShowErrorModal(true);
    }
  };

  // Generate a new seller ID (if no suggestion is chosen)
  const generateSellerId = async () => {
    try {
      // Example generation:
      const lastId = "TCSELLER" + Date.now().toString();
      setSellerId(lastId);
      setMessage("New Seller ID generated.");
    } catch (err) {
      setError("Error generating seller ID");
      setShowErrorModal(true);
    }
  };

  // Handle selecting a seller from suggestions
  const handleSelectSeller = (seller) => {
    setSellerName(seller.sellerName);
    setSellerId(seller.sellerId);
    setSellerAddress(seller.sellerAddress || "");
    setSellerGst(seller.sellerGst || "");
    setSellerSuggestions([]);
    setSelectedSuggestionIndex(-1);
    invoiceNoRef.current?.focus();
  };

  // Step 3: Searching for an existing item by ID
  const handleSearchItem = async () => {
    if (itemId.trim() === "") {
      setError("Please enter an Item ID to search.");
      setShowErrorModal(true);
      return;
    }
    try {
      setItemLoading(true);
      const { data } = await api.get(`/api/products/itemId/${itemId}`);
      if (data) {
        setItemId(data.item_id);
        setItemName(data.name);
        setItemBrand(data.brand);
        setItemCategory(data.category);
        setItemPurchaseUnit(data.purchaseUnit || "");
        setItemSellingUnit(data.sellingUnit || "");
        setPsRatio(data.psRatio || "");
        setItemPurchasePrice(data.purchasePrice || "");
        setItemGstPercent(data.gstPercent || "");
        setMrp(data.mrp || "");
        setItemQuantity("");
        setItemExpiry(data.expiryDate ? data.expiryDate.substring(0, 10) : "");
        itemNameRef.current?.focus();
      } else {
        setError("Item not found.");
        setShowErrorModal(true);
        clearItemFields();
      }
    } catch (err) {
      setError("Error fetching item details.");
      setShowErrorModal(true);
      clearItemFields();
      setItemId(itemId);
    } finally {
      setItemLoading(false);
    }
  };

  // Clear item fields
  const clearItemFields = () => {
    setItemId("");
    setItemName("");
    setItemBrand("");
    setItemCategory("");
    setItemPurchaseUnit("");
    setItemSellingUnit("");
    setPsRatio("");
    setItemQuantity("");
    setItemPurchasePrice("");
    setItemGstPercent("");
    setItemExpiry("");
    setMrp("");
  };

  // Add category
  const addCategory = () => {
    const newCategory = prompt("Enter new category:");
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setMessage(`Category "${newCategory}" added successfully!`);
      setItemCategory(newCategory);
    }
  };

  // Step 3: Add item to the "items" list
  const addItem = () => {
    // Validate required fields
    if (
      !itemId ||
      !itemName ||
      !itemBrand ||
      !itemCategory ||
      !itemPurchaseUnit ||
      !itemSellingUnit ||
      !psRatio ||
      itemQuantity === "" ||
      itemPurchasePrice === "" ||
      itemGstPercent === "" ||
      mrp === ""
    ) {
      setError("Please fill in all required fields before adding an item.");
      setShowErrorModal(true);
      return;
    }

    const parsedQuantity = parseFloat(itemQuantity);
    const parsedPrice = parseFloat(itemPurchasePrice);
    const parsedGst = parseFloat(itemGstPercent);
    const parsedPsRatio = parseFloat(psRatio);

    if (
      isNaN(parsedQuantity) ||
      parsedQuantity <= 0 ||
      isNaN(parsedPrice) ||
      parsedPrice < 0 ||
      isNaN(parsedGst) ||
      parsedGst < 0 ||
      isNaN(parsedPsRatio) ||
      parsedPsRatio <= 0
    ) {
      setError(
        "Invalid numeric values for Quantity, Price, GST, or Pack Size Ratio."
      );
      setShowErrorModal(true);
      return;
    }

    // Prevent duplicates
    if (items.some((item) => item.itemId === itemId)) {
      setError("This item ID is already added. Please adjust the quantity instead.");
      setShowErrorModal(true);
      return;
    }

    // Calculate quantityInNumbers
    const quantityInNumbers =
      itemPurchaseUnit.toUpperCase() === "BOX" ||
      itemPurchaseUnit.toUpperCase() === "PACK"
        ? parsedQuantity * parsedPsRatio
        : parsedQuantity;

    const newItem = {
      itemId,
      name: itemName,
      brand: itemBrand,
      category: itemCategory,
      purchaseUnit: itemPurchaseUnit,
      sellingUnit: itemSellingUnit,
      psRatio: parsedPsRatio,
      quantity: parsedQuantity,
      quantityInNumbers,
      purchasePrice: parsedPrice,
      gstPercent: parsedGst,
      expiryDate: itemExpiry,
      mrp: mrp,
    };
    setItems([newItem, ...items]);
    clearItemFields();
    setMessage("Item added successfully!");
    itemIdRef.current?.focus();
  };

  // Remove item
  const removeItem = (index) => {
    if (window.confirm("Are you sure you want to remove this item?")) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      setMessage("Item removed successfully!");
    }
  };

  // Handle item edits (quantity, price, GST, etc.)
  const handleItemFieldChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;

    // Recalculate quantityInNumbers if quantity, purchaseUnit, or psRatio changes
    if (field === "quantity" || field === "purchaseUnit" || field === "psRatio") {
      const currentItem = updatedItems[index];
      const quantity = parseFloat(currentItem.quantity) || 0;
      const ratio = parseFloat(currentItem.psRatio) || 1;
      const purchaseUnit = currentItem.purchaseUnit.toUpperCase();

      updatedItems[index].quantityInNumbers =
        purchaseUnit === "BOX" || purchaseUnit === "PACK"
          ? quantity * ratio
          : quantity;
    }

    setItems(updatedItems);
  };

  // Single function to handle transport company selection
  const handleTransportNameChange = async (e) => {
    try {
      setTransportCompany(e.target.value);
      // If we have a known company, fetch its GST if available
      if (e.target.value && e.target.value !== "add-custom") {
        const { data } = await api.get(
          `/api/transportpayments/name/${e.target.value}`
        );
        if (data.transportGst) {
          setTransportGst(data.transportGst);
        }
      } else {
        setTransportGst("");
      }
    } catch (err) {
      console.error("Error fetching transporter details:", err);
      setTransportGst("");
    }
  };

  // Calculate Totals
  const calculateTotals = () => {
    let netItemTotal = 0; // sum of quantity * purchasePrice
    let totalGstAmount = 0; // sum of item-level GST

    items.forEach((item) => {
      const subTotal = item.quantity * item.purchasePrice;
      const gstValue = (subTotal * item.gstPercent) / 100;
      netItemTotal += subTotal;
      totalGstAmount += gstValue;
    });

    const transportCost = parseFloat(transportAmount || 0);
    const otherCost = parseFloat(otherExpense || 0);

    const purchaseTotal = netItemTotal + totalGstAmount;
    const grandTotal = purchaseTotal + transportCost + otherCost;

    return {
      netItemTotal,
      totalGstAmount,
      transportCost,
      otherCost,
      purchaseTotal,
      grandTotal,
    };
  };

  const {
    netItemTotal,
    totalGstAmount,
    transportCost,
    otherCost,
    purchaseTotal,
    grandTotal,
  } = calculateTotals();

  // Submit (Create) Purchase
  const submitHandler = async () => {
    setError("");
    if (!sellerName || !invoiceNo || items.length === 0) {
      setError("Please fill all required fields and add at least one item.");
      setShowErrorModal(true);
      return;
    }

    // Conditionally build transportationDetails only if a transport company name is provided
    let transportationDetails = null;
    if (transportCompany.trim()) {
      transportationDetails = {
        general: {
          transportCompanyName: transportCompany,
          transportGst,
          transportationCharges: parseFloat(transportAmount) || 0,
          billId: transportBillId,
          remark: transportRemark,
          billingDate: billingDate,
          invoiceNo: invoiceNo,
          transportType: "general",
        },
      };
    }

    // Prepare the data payload
    const purchaseData = {
      sellerId,
      sellerName,
      sellerAddress,
      sellerGst,
      invoiceNo,
      purchaseId,
      billingDate,
      invoiceDate,
      items: items.map((it) => ({
        itemId: it.itemId,
        name: it.name,
        brand: it.brand,
        category: it.category,
        purchaseUnit: it.purchaseUnit,
        sellingUnit: it.sellingUnit,
        psRatio: it.psRatio,
        quantity: it.quantity,
        quantityInNumbers: it.quantityInNumbers,
        purchasePrice: it.purchasePrice,
        gstPercent: it.gstPercent,
        expiryDate: it.expiryDate,
        mrp: it.mrp,
      })),
      totals: {
        netItemTotal,
        totalGstAmount,
        transportCost,
        otherCost,
        purchaseTotal,
        grandTotal,
      },
      transportationDetails,
      logicField,
    };

    try {
      setLoading(true);
      // Dispatch your create purchase Redux action or direct API
      const returnData = await dispatch(createPurchase(purchaseData));

      setReturnInvoice(returnData);
      alert("Purchase submitted successfully!");

      // Reset
      setCurrentStep(1);
      setSellerId("");
      setSellerName("");
      setSellerAddress("");
      setSellerGst("");
      setInvoiceNo("");
      setPurchaseId("");
      setBillingDate(new Date().toISOString().substring(0, 10));
      setInvoiceDate("");
      setItems([]);
      setTransportCompany("");
      setTransportAmount("");
      setTransportGst("");
      setTransportBillId("");
      setTransportRemark("");
      setOtherExpense("");
      setLogicField("");
      setSuccess(true);
    } catch (error) {
      console.error("Error submitting purchase:", error);
      setError("Error submitting purchase. Please try again.");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key navigation
  const changeRef = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef?.current?.focus();
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Loading Indicator */}
      {(loading || itemLoading) && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-md shadow-md">
            <p className="text-sm font-bold">Loading...</p>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <ErrorModal message={error} onClose={() => setShowErrorModal(false)} />
      )}

      {/* Success Modal */}
      {success && (
        <BillingSuccess
          isAdmin={userInfo?.isAdmin}
          estimationNo={returnInvoice}
          onClose={() => setSuccess(false)}
        />
      )}

      {/* Top Banner */}
      <div
        className="flex items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 cursor-pointer"
        onClick={() => navigate("/")}
      >
        <div className="text-center">
          <h2 className="text-md font-bold text-red-600">Travancore Backers</h2>
          <p className="text-gray-400 text-xs font-bold">
            Bakery Purchase Billing
          </p>
        </div>
        <i className="fa fa-shopping-cart text-gray-500 text-xl"></i>
      </div>

      {/* Main Content */}
      <div
        className={`mx-auto mt-8 p-6 bg-white shadow-md rounded-md ${
          currentStep !== 3 ? "max-w-3xl" : ""
        }`}
      >
        {/* Step Navigation */}
        <div className="flex justify-between mb-5">
          <div className="text-left">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="mt-2 py-2 px-4 text-xs font-bold rounded-md bg-red-500 hover:bg-red-600 text-white"
              >
                Back
              </button>
            )}
          </div>
          <div className="text-right">
            {currentStep === 4 ? (
              <button
                onClick={submitHandler}
                className="py-2 font-bold px-4 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs"
              >
                Submit
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="mt-6 text-xs py-2 px-4 bg-red-600 text-white font-bold rounded-md hover:bg-red-700"
              >
                Next
              </button>
            )}
            <p className="text-xs mt-1 text-gray-400">
              Please fill all fields before proceeding
            </p>
          </div>
        </div>

        {/* Step 4 summary at top */}
        {currentStep === 4 && (
          <div className="bg-gray-100 p-4 space-y-2 rounded-lg shadow-inner mb-4">
            <div className="flex justify-between">
              <p className="text-xs font-bold">Net Item Total:</p>
              <p className="text-xs">₹{netItemTotal.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-xs font-bold">Total GST (All Items):</p>
              <p className="text-xs">₹{totalGstAmount.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-xs">Transport Charges:</p>
              <p className="text-xs">₹{transportCost.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-xs">Other Expenses:</p>
              <p className="text-xs">₹{otherCost.toFixed(2)}</p>
            </div>
            <div className="flex justify-between mt-2">
              <p className="text-sm font-bold">Grand Total:</p>
              <p className="text-sm font-bold">₹{grandTotal.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Supplier Info */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              Supplier Information
            </h2>
            <div className="mt-4 space-y-4">
              {/* Purchase ID */}
              <div className="flex flex-col">
                <label className="text-xs flex justify-between mb-1 text-gray-700">
                  Purchase ID{" "}
                  <p className="text-xs italic text-gray-400">
                    Last Billed: {lastBillId || "TC0"}
                  </p>
                </label>
                <input
                  type="text"
                  placeholder="Purchase ID"
                  value={purchaseId}
                  ref={purchaseIdRef}
                  onChange={(e) => setPurchaseId(e.target.value)}
                  onKeyDown={(e) => changeRef(e, sellerNameRef)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                  required
                />
              </div>

              {/* Supplier Name */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs text-gray-700">
                  Supplier Name
                </label>
                <input
                  type="text"
                  ref={sellerNameRef}
                  value={sellerName}
                  placeholder="Enter Supplier Name"
                  onChange={handleSellerNameChange}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelectedSuggestionIndex((prevIndex) =>
                        prevIndex < sellerSuggestions.length - 1
                          ? prevIndex + 1
                          : prevIndex
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelectedSuggestionIndex((prevIndex) =>
                        prevIndex > 0 ? prevIndex - 1 : prevIndex
                      );
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (
                        selectedSuggestionIndex >= 0 &&
                        selectedSuggestionIndex < sellerSuggestions.length
                      ) {
                        const selectedSeller =
                          sellerSuggestions[selectedSuggestionIndex];
                        handleSelectSeller(selectedSeller);
                        setSelectedSuggestionIndex(-1);
                      } else {
                        // If no suggestion selected, generate a fresh ID
                        generateSellerId();
                        invoiceNoRef.current?.focus();
                      }
                    }
                  }}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                  required
                />
                {/* Suggestions */}
                {sellerSuggestions.length > 0 && (
                  <ul className="border border-gray-300 divide-y mt-1 rounded-md shadow-md max-h-40 overflow-y-auto bg-white">
                    {sellerSuggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        className={`p-2 text-xs cursor-pointer hover:bg-gray-100 ${
                          index === selectedSuggestionIndex
                            ? "bg-gray-200"
                            : ""
                        }`}
                        onClick={() => {
                          handleSelectSeller(suggestion);
                          setSelectedSuggestionIndex(-1);
                        }}
                      >
                        {suggestion.sellerName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Supplier ID */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs text-gray-700">Supplier ID</label>
                <input
                  type="text"
                  ref={sellerIdRef}
                  value={sellerId}
                  placeholder="Supplier ID"
                  onChange={(e) => setSellerId(e.target.value)}
                  onKeyDown={(e) => changeRef(e, invoiceNoRef)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md bg-gray-100 focus:outline-none text-xs"
                  readOnly
                />
              </div>

              {/* Invoice No */}
              <div className="flex flex-col">
                <label className="mb-1 text-xs text-gray-700">Invoice No.</label>
                <input
                  type="text"
                  ref={invoiceNoRef}
                  value={invoiceNo}
                  placeholder="Enter invoice number"
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setCurrentStep(2);
                  }}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Supplier Address / Dates */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {/* Address */}
            <div className="flex flex-col">
              <label className="text-xs mb-1 text-gray-700">
                Supplier Address
              </label>
              <input
                type="text"
                ref={sellerAddressRef}
                placeholder="Supplier Address"
                value={sellerAddress}
                onKeyDown={(e) => changeRef(e, sellerGstRef)}
                onChange={(e) => setSellerAddress(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                required
              />
            </div>

            {/* GSTIN */}
            <div className="flex flex-col">
              <label className="text-xs mb-1 text-gray-700">Supplier GSTIN</label>
              <input
                type="text"
                placeholder="Supplier GST"
                ref={sellerGstRef}
                value={sellerGst}
                onKeyDown={(e) => changeRef(e, billingDateRef)}
                onChange={(e) => setSellerGst(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                required
              />
            </div>

            {/* Billing Date */}
            <div className="flex flex-col">
              <label className="text-xs mb-1 text-gray-700">Billing Date</label>
              <input
                type="date"
                value={billingDate}
                ref={billingDateRef}
                onKeyDown={(e) => changeRef(e, invoiceDateRef)}
                onChange={(e) => setBillingDate(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
              />
            </div>

            {/* Invoice Date */}
            <div className="flex flex-col">
              <label className="text-xs mb-1 text-gray-700">Invoice Date</label>
              <input
                type="date"
                ref={invoiceDateRef}
                value={invoiceDate}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setCurrentStep(3);
                }}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Add Items */}
        {currentStep === 3 && (
          <div className="flex flex-col min-h-screen">
            {items.length === 0 && (
              <p className="text-sm font-bold text-center text-gray-300">
                No Products Added
              </p>
            )}
            {/* Items List/Table */}
            <div className="flex-1 overflow-auto p-4">
              {items.length > 0 && (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <table className="min-w-full table-auto bg-white shadow-md rounded-md">
                      <thead>
                        <tr className="bg-red-500 text-white text-xs">
                          <th className="px-2 py-2 text-left">Item ID</th>
                          <th className="px-2 py-2 text-left">Name</th>
                          <th className="px-2 py-2 text-left">Brand</th>
                          <th className="px-2 py-2 text-left">Category</th>
                          <th className="px-2 py-2 text-left">Purchase Unit</th>
                          <th className="px-2 py-2 text-left">Selling Unit</th>
                          <th className="px-2 py-2 text-left">PS Ratio</th>
                          <th className="px-2 py-2 text-left">Qty</th>
                          <th className="px-2 py-2 text-left">Qty in Numbers</th>
                          <th className="px-2 py-2 text-left">P.Price</th>
                          <th className="px-2 py-2 text-left">M.R.P</th>
                          <th className="px-2 py-2 text-left">GST %</th>
                          <th className="px-2 py-2 text-left">Expiry</th>
                          <th className="px-2 py-2 text-left">Subtotal</th>
                          <th className="px-2 py-2 text-left">GST Amt</th>
                          <th className="px-2 py-2 text-left">Total</th>
                          <th className="px-2 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-600 text-xs">
                        {items.map((item, index) => {
                          const subTotal = item.quantity * item.purchasePrice;
                          const gstValue = (subTotal * item.gstPercent) / 100;
                          const lineTotal = subTotal + gstValue;

                          return (
                            <tr
                              key={index}
                              className={`border-b hover:bg-gray-100 ${
                                index % 2 === 0 ? "bg-gray-50" : "bg-white"
                              }`}
                            >
                              <td className="px-2 py-2">{item.itemId}</td>
                              <td className="px-2 py-2">{item.name}</td>
                              <td className="px-2 py-2">{item.brand}</td>
                              <td className="px-2 py-2">{item.category}</td>
                              <td className="px-2 py-2">{item.purchaseUnit}</td>
                              <td className="px-2 py-2">{item.sellingUnit}</td>
                              <td className="px-2 py-2">{item.psRatio}</td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  min="1"
                                  step="0.01"
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      index,
                                      "quantity",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-14 border border-gray-300 px-1 py-1 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                                />
                              </td>
                              <td className="px-2 py-2">
                                {item.quantityInNumbers.toFixed(2)}
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  value={item.purchasePrice}
                                  min="0"
                                  step="0.01"
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      index,
                                      "purchasePrice",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-16 border border-gray-300 px-1 py-1 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                                />
                              </td>
                              <td className="px-2 py-2">{item.mrp}</td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  value={item.gstPercent}
                                  min="0"
                                  step="0.01"
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      index,
                                      "gstPercent",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-14 border border-gray-300 px-1 py-1 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="date"
                                  value={item.expiryDate}
                                  onChange={(e) =>
                                    handleItemFieldChange(
                                      index,
                                      "expiryDate",
                                      e.target.value
                                    )
                                  }
                                  className="border border-gray-300 px-1 py-1 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                                />
                              </td>
                              <td className="px-2 py-2">
                                ₹{subTotal.toFixed(2)}
                              </td>
                              <td className="px-2 py-2">
                                ₹{gstValue.toFixed(2)}
                              </td>
                              <td className="px-2 py-2">
                                ₹{lineTotal.toFixed(2)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  <i className="fa fa-trash" aria-hidden="true"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="block md:hidden">
                    <div className="space-y-4">
                      {items.map((item, index) => {
                        const subTotal = item.quantity * item.purchasePrice;
                        const gstValue = (subTotal * item.gstPercent) / 100;
                        const lineTotal = subTotal + gstValue;

                        return (
                          <div
                            key={index}
                            className="bg-white shadow-lg rounded-lg p-4 border"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-xs font-bold">
                                {item.name} - {item.itemId}
                              </p>
                              <button
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                <i className="fa fa-trash" aria-hidden="true"></i>
                              </button>
                            </div>
                            <p className="text-xs">Brand: {item.brand}</p>
                            <p className="text-xs">Category: {item.category}</p>
                            <p className="text-xs">
                              Purchase Unit: {item.purchaseUnit}
                            </p>
                            <p className="text-xs">
                              Selling Unit: {item.sellingUnit}
                            </p>
                            <p className="text-xs">PS Ratio: {item.psRatio}</p>

                            <div className="flex items-center text-xs mt-1">
                              <label className="w-24">Qty:</label>
                              <input
                                type="number"
                                value={item.quantity}
                                min="1"
                                step="0.01"
                                onChange={(e) =>
                                  handleItemFieldChange(
                                    index,
                                    "quantity",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="border border-gray-300 px-1 py-1 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs w-16"
                              />
                            </div>
                            <div className="flex items-center text-xs mt-1">
                              <label className="w-24">Qty in Numbers:</label>
                              <input
                                type="number"
                                value={item.quantityInNumbers.toFixed(2)}
                                disabled
                                className="border border-gray-300 px-1 py-1 rounded-md bg-gray-100 text-xs w-16"
                              />
                            </div>
                            <div className="flex items-center text-xs mt-1">
                              <label className="w-24">Price:</label>
                              <input
                                type="number"
                                value={item.purchasePrice}
                                min="0"
                                step="0.01"
                                onChange={(e) =>
                                  handleItemFieldChange(
                                    index,
                                    "purchasePrice",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="border border-gray-300 px-1 py-1 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs w-20"
                              />
                            </div>
                            <div className="flex items-center text-xs mt-1">
                              <label className="w-24">GST %:</label>
                              <input
                                type="number"
                                value={item.gstPercent}
                                min="0"
                                step="0.01"
                                onChange={(e) =>
                                  handleItemFieldChange(
                                    index,
                                    "gstPercent",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="border border-gray-300 px-1 py-1 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs w-16"
                              />
                            </div>
                            <div className="flex items-center text-xs mt-1">
                              <label className="w-24">Expiry:</label>
                              <input
                                type="date"
                                value={item.expiryDate}
                                onChange={(e) =>
                                  handleItemFieldChange(
                                    index,
                                    "expiryDate",
                                    e.target.value
                                  )
                                }
                                className="border border-gray-300 px-1 py-1 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs w-32"
                              />
                            </div>
                            <p className="text-xs mt-1">
                              Subtotal: ₹{subTotal.toFixed(2)}
                            </p>
                            <p className="text-xs">GST: ₹{gstValue.toFixed(2)}</p>
                            <p className="text-xs font-bold">
                              Total: ₹{lineTotal.toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Input Section to Add Item */}
            <div className="p-4 md:fixed bottom-0 left-0 right-0 bg-white shadow-inner">
              <div className="md:flex justify-between space-x-2">
                {/* Left inputs */}
                <div className="flex-1">
                  <div className="space-y-4">
                    {/* Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      {/* Item ID */}
                      <div className="flex flex-col">
                        <label className="mb-1 flex items-center text-xs text-gray-700">
                          <span>Item ID</span>
                          <span className="italic ml-auto text-gray-300">
                            Last Item: {lastItemId || "Not found"}
                          </span>
                        </label>
                        <input
                          type="text"
                          ref={itemIdRef}
                          value={itemId}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearchItem();
                          }}
                          onChange={(e) => setItemId(e.target.value)}
                          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                          required
                        />
                      </div>
                      {/* Item Name */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-700 mb-1">
                          Item Name
                        </label>
                        <input
                          type="text"
                          placeholder="Enter Item Name"
                          ref={itemNameRef}
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          onKeyDown={(e) => changeRef(e, itemBrandRef)}
                          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                          required
                        />
                      </div>
                      {/* Item Brand */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-700 mb-1">
                          Item Brand
                        </label>
                        <input
                          type="text"
                          placeholder="Enter Item Brand"
                          ref={itemBrandRef}
                          value={itemBrand}
                          onChange={(e) => setItemBrand(e.target.value)}
                          onKeyDown={(e) => changeRef(e, itemCategoryRef)}
                          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                          required
                        />
                      </div>
                      {/* Category */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-700 mb-1">
                          Category
                        </label>
                        <div className="flex items-center space-x-1">
                          <select
                            value={itemCategory}
                            ref={itemCategoryRef}
                            onChange={(e) => setItemCategory(e.target.value)}
                            onKeyDown={(e) => changeRef(e, itemPurchaseUnitRef)}
                            className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                            required
                          >
                            <option value="" disabled>
                              Select Category
                            </option>
                            {categories.map((cat, idx) => (
                              <option key={idx} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={addCategory}
                            className="text-red-500 text-xs hover:text-red-700"
                            title="Add new category"
                          >
                            <i className="fa fa-plus-circle"></i>
                          </button>
                        </div>
                      </div>
                      {/* Purchase Unit */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-700 mb-1">
                          Purchase Unit
                        </label>
                        <select
                          value={itemPurchaseUnit}
                          onChange={(e) => setItemPurchaseUnit(e.target.value)}
                          ref={itemPurchaseUnitRef}
                          onKeyDown={(e) => changeRef(e, itemSellingUnitRef)}
                          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                          required
                        >
                          <option value="" disabled>
                            Select Purchase Unit
                          </option>
                          <option value="BOX">BOX</option>
                          <option value="PACK">PACK</option>
                          <option value="PCS">PCS</option>
                          <option value="KG">KG</option>
                        </select>
                      </div>
                      {/* Selling Unit */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-700 mb-1">
                          Selling Unit
                        </label>
                        <select
                          value={itemSellingUnit}
                          onChange={(e) => setItemSellingUnit(e.target.value)}
                          ref={itemSellingUnitRef}
                          onKeyDown={(e) => changeRef(e, psRatioRef)}
                          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                          required
                        >
                          <option value="" disabled>
                            Select Selling Unit
                          </option>
                          <option value="PCS">PCS</option>
                          <option value="KG">KG</option>
                          <option value="LTR">LTR</option>
                          <option value="GM">GM</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      {/* PS Ratio */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-700 mb-1">
                          PS Ratio
                        </label>
                        <input
                          type="number"
                          placeholder="e.g., 10"
                          ref={psRatioRef}
                          value={psRatio}
                          onChange={(e) => setPsRatio(e.target.value)}
                          onKeyDown={(e) => changeRef(e, itemQuantityRef)}
                          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                          min="1"
                          step="1"
                          required
                        />
                      </div>
                      {/* Quantity */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          placeholder="Enter Quantity"
                          value={itemQuantity}
                          ref={itemQuantityRef}
                          onChange={(e) => setItemQuantity(e.target.value)}
                          onKeyDown={(e) => changeRef(e, itemPurchasePriceRef)}
                          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                          min="1"
                          step="0.01"
                          required
                        />
                      </div>
                      {/* Purchase Price */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-700 mb-1">
                          Purchase Price
                        </label>
                        <input
                          type="number"
                          placeholder="Purchase Price"
                          value={itemPurchasePrice}
                          ref={itemPurchasePriceRef}
                          onChange={(e) => setItemPurchasePrice(e.target.value)}
                          onKeyDown={(e) => changeRef(e, mrpRef)}
                          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      {/* M.R.P */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-700 mb-1">M.R.P</label>
                        <input
                          type="number"
                          placeholder="M.R Price"
                          value={mrp}
                          ref={mrpRef}
                          onChange={(e) => setMrp(e.target.value)}
                          onKeyDown={(e) => changeRef(e, itemGstPercentRef)}
                          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      {/* GST % */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-700 mb-1">
                          GST (%)
                        </label>
                        <input
                          type="number"
                          placeholder="GST %"
                          value={itemGstPercent}
                          ref={itemGstPercentRef}
                          onChange={(e) => setItemGstPercent(e.target.value)}
                          onKeyDown={(e) => changeRef(e, itemExpiryRef)}
                          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      {/* Expiry Date */}
                      <div className="flex flex-col">
                        <label className="text-xs text-gray-700 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={itemExpiry}
                          ref={itemExpiryRef}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addItem();
                          }}
                          onChange={(e) => setItemExpiry(e.target.value)}
                          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side summary + Add button (visible on large screens) */}
                <div className="hidden lg:block w-44">
                  <div className="bg-gray-100 p-6 h-full rounded-lg shadow-inner">
                    <div>
                      <div className="flex justify-between">
                        <p className="text-sm font-bold">Items:</p>
                        <p className="text-sm">{items.length}</p>
                      </div>
                    </div>
                    <div className="flex my-2 mx-auto text-center">
                      <button
                        type="button"
                        onClick={addItem}
                        className="bg-red-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-600 text-xs w-full md:w-auto"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline summary (also in step 3) */}
                <div className="bg-gray-100 p-4 space-y-2 rounded-lg shadow-inner mb-4">
                  <div className="flex justify-between">
                    <p className="text-xs font-bold">Net Item Total:</p>
                    <p className="text-xs">₹{netItemTotal.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-xs font-bold">Total GST (All Items):</p>
                    <p className="text-xs">₹{totalGstAmount.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-xs">Transport Charges:</p>
                    <p className="text-xs">₹{transportCost.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-xs">Other Expenses:</p>
                    <p className="text-xs">₹{otherCost.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-sm font-bold">Grand Total:</p>
                    <p className="text-sm font-bold">₹{grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Single Transportation & Other Expenses */}
        {currentStep === 4 && (
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-2">
              Other Expenses & Transport
            </h2>
            <div className="space-y-4">
              {/* Other Expense */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-700 mb-1">Other Expense</label>
                <input
                  type="number"
                  placeholder="Any additional expense"
                  ref={otherExpenseRef}
                  value={otherExpense}
                  onChange={(e) => setOtherExpense(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Transport Details (optional) */}
              <div>
                <h3 className="text-xs font-bold text-gray-800 mb-1">
                  Transport Details (Optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-700 mb-1">Company</label>
                    <select
                      value={transportCompany}
                      ref={transportCompanyRef}
                      onChange={(e) => {
                        if (e.target.value === "add-custom") {
                          const custom = prompt("Enter custom company name:");
                          if (custom) {
                            setTransportCompanies((prev) => [...prev, custom]);
                            setTransportCompany(custom);
                          }
                        } else {
                          setTransportCompany(e.target.value);
                        }
                        handleTransportNameChange(e);
                      }}
                      className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                    >
                      <option value="">No Transport</option>
                      {transportCompanies.map((t, i) => (
                        <option key={i} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="add-custom" className="text-red-500">
                        + Add Custom
                      </option>
                    </select>
                  </div>
                  {/* Transport Amount */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-700 mb-1">
                      Transport Amount
                    </label>
                    <input
                      type="number"
                      placeholder="Transport Cost with GST"
                      value={transportAmount}
                      ref={transportAmountRef}
                      onChange={(e) => setTransportAmount(e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  {/* GSTIN */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-700 mb-1">GSTIN</label>
                    <input
                      type="text"
                      placeholder="Transporter GSTIN"
                      value={transportGst}
                      onChange={(e) => setTransportGst(e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                    />
                  </div>
                  {/* Bill ID */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-700 mb-1">Bill ID</label>
                    <input
                      type="text"
                      placeholder="Transport Bill ID"
                      value={transportBillId}
                      onChange={(e) => setTransportBillId(e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                    />
                  </div>
                  {/* Remark */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-700 mb-1">Remark</label>
                    <input
                      type="text"
                      placeholder="Any remark"
                      value={transportRemark}
                      ref={transportRemarkRef}
                      onChange={(e) => setTransportRemark(e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Optional logic field */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-700 mb-1">Logic Field</label>
                <input
                  type="text"
                  placeholder="Any extra note"
                  value={logicField}
                  onChange={(e) => setLogicField(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                />
              </div>

              {/* Final Recap */}
              <div className="mt-4 bg-gray-100 space-y-2 p-4 rounded-lg shadow-inner">
                <h3 className="text-sm font-bold text-red-700 mb-2">
                  Overall Summary
                </h3>
                <div className="flex justify-between">
                  <p className="text-xs">Net Item Total:</p>
                  <p className="text-xs">₹{netItemTotal.toFixed(2)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-xs">Total GST:</p>
                  <p className="text-xs">₹{totalGstAmount.toFixed(2)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-xs">Transport Charges:</p>
                  <p className="text-xs">₹{transportCost.toFixed(2)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-xs">Other Expenses:</p>
                  <p className="text-xs">₹{otherExpense || "0"}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-xs font-bold">Purchase Total:</p>
                  <p className="text-xs font-bold">
                    ₹{purchaseTotal.toFixed(2)}
                  </p>
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-sm font-bold">Grand Total:</p>
                  <p className="text-sm font-bold">₹{grandTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Summary (Mobile) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-inner p-4 md:hidden">
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-xs">Net Item Total:</p>
              <p className="text-xs">₹{netItemTotal.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-xs">Total GST:</p>
              <p className="text-xs">₹{totalGstAmount.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-xs">Transport Charges:</p>
              <p className="text-xs">₹{transportCost.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-xs">Other Expenses:</p>
              <p className="text-xs">₹{otherCost.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-xs font-bold">Purchase Total:</p>
              <p className="text-xs font-bold">₹{purchaseTotal.toFixed(2)}</p>
            </div>
            <div className="flex justify-between mt-2">
              <p className="text-sm font-bold">Grand Total:</p>
              <p className="text-sm font-bold">₹{grandTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
