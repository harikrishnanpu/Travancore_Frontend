import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import BillingSuccess from '../components/billingsuccess';
import { useSelector } from 'react-redux';

// A simple modal for choosing the return type
function ChooseReturnTypeModal({ isOpen, onClose, onSelectReturnType }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96">
        <h2 className="text-lg font-bold text-center mb-4">Select Return Type</h2>
        <div className="flex flex-col space-y-4">
          <button
            onClick={() => {
              onSelectReturnType('bill');
              onClose();
            }}
            className="bg-red-600 text-white text-xs font-bold py-2 rounded"
          >
            Return Against Bill
          </button>
          <button
            onClick={() => {
              onSelectReturnType('purchase');
              onClose();
            }}
            className="bg-red-600 text-white text-xs font-bold py-2 rounded"
          >
            Return Against Purchase
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-800 font-bold py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReturnBillingScreen() {
  const navigate = useNavigate();

  // -- MODAL STATE --
  const [isModalOpen, setIsModalOpen] = useState(true); // Show modal on load
  const [returnType, setReturnType] = useState('');      // "bill" or "purchase"

  // -- COMMON STATE --
  const [returnNo, setReturnNo] = useState('');
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [products, setProducts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const [discount, setDiscount] = useState(0);
  const [perItemDiscount, setPerItemDiscount] = useState(0);

  // Updated totals: We'll calculate them per item
  const [returnAmount, setReturnAmount] = useState(0);  // Subtotal (sum of base prices)
  const [cgst, setCgst] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [totalTax, setTotalTax] = useState(0);
  const [netReturnAmount, setNetReturnAmount] = useState(0);

  const [isGstEnabled, setIsGstEnabled] = useState(true);
  const [success, setSuccess] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState('');
  const [lastBillId, setLastBillId] = useState(null);

  // For Bill Return
  const [selectedBillingNo, setSelectedBillingNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // For Purchase Return
  const [selectedPurchaseNo, setSelectedPurchaseNo] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');

  // Refs for Input Navigation
  const billingNoRef = useRef();
  const returnNoRef = useRef();
  const returnDateRef = useRef();
  const customerNameRef = useRef();
  const customerAddressRef = useRef();

  const purchaseNoRef = useRef();
  const sellerNameRef = useRef();
  const sellerAddressRef = useRef();

  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  // -- Fetch last Return ID on Mount --
  useEffect(() => {
    async function fetchLastReturn() {
      try {
        const { data } = await api.get('/api/returns/lastreturn/id');
        // Assuming data is like 'CN0001', increment the numerical part
        const numericalPart = parseInt(data.slice(2), 10) + 1;
        const nextReturnNo = `CN${numericalPart
          .toString()
          .padStart(data.length - 2, '0')}`;
        setReturnNo(nextReturnNo);
        setLastBillId(data);
      } catch (error) {
        console.error('Error fetching last return ID:', error);
        setError('Failed to fetch the last return ID.');
      }
    }
    fetchLastReturn();
  }, []);

  // Depending on returnType, watch for either Billing No or Purchase No changes
  useEffect(() => {
    if (returnType === 'bill') {
      if (selectedBillingNo) {
        fetchSuggestions(selectedBillingNo); // Billing suggestions
      } else {
        setSuggestions([]);
      }
    } else if (returnType === 'purchase') {
      if (selectedPurchaseNo) {
        fetchSuggestions(selectedPurchaseNo); // Purchase suggestions
      } else {
        setSuggestions([]);
      }
    }
  }, [selectedBillingNo, selectedPurchaseNo, returnType]);

  // Step-based focusing
  useEffect(() => {
    if (returnType === 'bill') {
      if (step === 0) {
        billingNoRef.current?.focus();
      } else if (step === 1) {
        returnNoRef.current?.focus();
      } else if (step === 2) {
        customerNameRef.current?.focus();
      } else if (step === 3) {
        customerAddressRef.current?.focus();
      }
    } else if (returnType === 'purchase') {
      if (step === 0) {
        purchaseNoRef.current?.focus();
      } else if (step === 1) {
        returnNoRef.current?.focus();
      } else if (step === 2) {
        sellerNameRef.current?.focus();
      } else if (step === 3) {
        sellerAddressRef.current?.focus();
      }
    }
  }, [step, returnType]);

  // -- Recalculate Return Amount and Taxes whenever products, GST Toggle, or returnType changes --
  useEffect(() => {
    // We'll sum up line by line using the product's actual gstRate (Billing) or gstPercent (Purchase)
    let subtotal = 0;
    let totalTaxCalc = 0;

    products.forEach((prod) => {
      const qty = Number(prod.quantity) || 0;
      const baseLine = prod.returnPrice * qty; // base line amount
      subtotal += baseLine;

      // For Bill => product.gstRate; For Purchase => product.gstPercent
      let gstRate = 0;
      if (returnType === 'bill' && prod.gstRate !== undefined) {
        gstRate = Number(prod.gstRate) || 0;
      } else if (returnType === 'purchase' && prod.gstPercent !== undefined) {
        gstRate = Number(prod.gstPercent) || 0;
      }

      // If "isGstEnabled" is false, we set gstRate = 0 effectively
      if (!isGstEnabled) {
        gstRate = 0;
      }

      const lineTax = baseLine * (gstRate / 100);
      totalTaxCalc += lineTax;
    });

    // Update state
    setReturnAmount(subtotal);    // This is the sum of all base lines
    setTotalTax(totalTaxCalc);    // This is sum of all line-level taxes

    // For simplicity, split half-and-half into CGST / SGST
    const halfTax = totalTaxCalc / 2;
    setCgst(halfTax);
    setSgst(halfTax);

    // netReturnAmount => if you want it to be "subtotal + totalTax"
    //   that's the final invoice total including GST
    // Or if you want it to be base only, do `subtotal`.
    // Let's assume "Net" means with GST:
    setNetReturnAmount(subtotal + totalTaxCalc);
  }, [products, isGstEnabled, returnType]);

  // -- Helper: Next / Previous Step --
  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  // -- Helper: For focusing next field on "Enter" Key --
  const changeRef = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextRef?.current?.focus();
    }
  };

  // -- 1) Fetch Suggestions depending on returnType --
  const fetchSuggestions = async (query) => {
    try {
      if (returnType === 'bill') {
        // For Billing
        const { data } = await api.get(
          `/api/billing/billing/suggestions?search=${query}`
        );
        setSuggestions(data);
      } else if (returnType === 'purchase') {
        // For Purchase
        const { data } = await api.get(
          `/api/purchases/purchase/suggestions?search=${query}`
        );
        setSuggestions(data);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Error fetching suggestions.');
    }
  };

  // -- 2) On suggestion selection (Enter Key, Arrow, or Click) --
  const handleSuggestionKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[selectedSuggestionIndex];
      if (returnType === 'bill') {
        setSelectedBillingNo(selected.invoiceNo);
        fetchDetails(selected._id);
      } else {
        setSelectedPurchaseNo(selected.purchaseId);
        fetchDetails(selected._id);
      }
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
    }
  };

  // -- 3) Fetch either Billing or Purchase Details depending on returnType --
  const fetchDetails = async (id) => {
    try {
      if (returnType === 'bill') {
        const { data } = await api.get(`/api/billing/${id}`);
        // For Bill:
        setCustomerName(data.customerName || '');
        setCustomerAddress(data.customerAddress || '');
        setDiscount(parseFloat(data.discount) || 0);

        // Distribute discount if needed
        const totalQtyProducts = data.products.reduce(
          (acc, product) => acc + parseFloat(product.quantity || 0),
          0
        );
        const calculatedPerItemDiscount =
          totalQtyProducts > 0
            ? (parseFloat(data.discount) || 0) / totalQtyProducts
            : 0;
        setPerItemDiscount(parseFloat(calculatedPerItemDiscount.toFixed(2)));

        // Prepare each product for the return
        const productsWithReturnPrice = data.products.map((product) => ({
          ...product,
          // We'll store 'gstRate' so we can do product-level GST
          gstRate: product.gstRate,
          initialQuantity: parseFloat(product.quantity) || 0,
          // Subtract the per-item discount if you want
          returnPrice: parseFloat(
            (
              parseFloat(product.sellingPriceinQty) - calculatedPerItemDiscount
            ).toFixed(2)
          ),
          quantity: 0, // Initially 0 for return
        }));
        setProducts(productsWithReturnPrice);
        setStep(1); // Move to next step
      } else {
        // For Purchase
        const { data } = await api.get(`/api/purchases/get/${id}`);
        setSellerName(data.sellerName || '');
        setSellerAddress(data.sellerAddress || '');
        const purchaseDiscount = 0; // or data.discount if you have it
        setDiscount(parseFloat(purchaseDiscount) || 0);

        // Distribute discount if needed
        const totalQtyItems = data.items.reduce(
          (acc, item) => acc + (parseFloat(item.quantity) || 0),
          0
        );
        const calculatedPerItemDiscount =
          totalQtyItems > 0 ? purchaseDiscount / totalQtyItems : 0;
        setPerItemDiscount(parseFloat(calculatedPerItemDiscount.toFixed(2)));

        const productsWithReturnPrice = data.items.map((item) => ({
          item_id: item.itemId,
          name: item.name,
          // We'll store 'gstPercent' so we can do product-level GST
          gstPercent: item.gstPercent,
          initialQuantity: parseFloat(item.quantity) || 0,
          returnPrice: parseFloat(
            (
              parseFloat(item.purchasePrice) - calculatedPerItemDiscount
            ).toFixed(2)
          ),
          quantity: 0,
        }));
        setProducts(productsWithReturnPrice);
        setStep(1);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
      setError('Error fetching details.');
    }
  };

  // -- 4) Handle Return Submission (Create Return) --
  const handleReturnSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const isBillReturn = returnType === 'bill';
    const isPurchaseReturn = returnType === 'purchase';

    if (!returnNo || !returnDate || products.length === 0) {
      alert('Please fill all required fields and add at least one product.');
      return;
    }
    // Additional validation for Bill Return
    if (
      isBillReturn &&
      (!selectedBillingNo || !customerName || !customerAddress)
    ) {
      alert('Please fill all required fields for a Bill Return.');
      return;
    }
    // Additional validation for Purchase Return
    if (
      isPurchaseReturn &&
      (!selectedPurchaseNo || !sellerName || !sellerAddress)
    ) {
      alert('Please fill all required fields for a Purchase Return.');
      return;
    }

    // Build the request body
    const requestBody = {
      returnNo,
      returnType,
      returnDate,
      discount,
      cgst,
      sgst,
      totalTax,
      returnAmount,
      netReturnAmount,
      products: products.map((p) => ({
        // Because billing vs. purchase might use different fields, we unify them:
        item_id: p.item_id || p.itemId || '',
        name: p.name,
        returnPrice: p.returnPrice,
        quantity: p.quantity,
      })),
    };

    if (isBillReturn) {
      requestBody.billingNo = selectedBillingNo;
      requestBody.customerName = customerName;
      requestBody.customerAddress = customerAddress;
    } else {
      requestBody.purchaseNo = selectedPurchaseNo;
      requestBody.sellerName = sellerName;
      requestBody.sellerAddress = sellerAddress;
    }

    try {
      const { data } = await api.post('/api/returns/create', requestBody);
      // data could be the generated returnNo or an object
      setReturnInvoice(data?.returnNo || data);

      // Reset Form
      setReturnNo('');
      setReturnDate(new Date().toISOString().substring(0, 10));
      setProducts([]);
      setDiscount(0);
      setPerItemDiscount(0);
      setIsGstEnabled(true);
      setStep(0);

      if (isBillReturn) {
        setSelectedBillingNo('');
        setCustomerName('');
        setCustomerAddress('');
      } else {
        setSelectedPurchaseNo('');
        setSellerName('');
        setSellerAddress('');
      }

      alert('Return data submitted successfully!');
      setSuccess(true);
    } catch (error) {
      console.error('Error submitting return data:', error);
      alert('There was an error submitting the return data. Please try again.');
    }
  };

  // -- 5) Handle Generate & Print (optional) --
  const handleGenerateAndPrint = async () => {
    // Validate similarly
    const isBillReturn = returnType === 'bill';
    const isPurchaseReturn = returnType === 'purchase';

    if (!returnNo || !returnDate || products.length === 0) {
      alert('Please fill all required fields and add at least one product.');
      return;
    }
    if (isBillReturn && (!selectedBillingNo || !customerName || !customerAddress)) {
      alert('Please fill all required fields for a Bill Return.');
      return;
    }
    if (isPurchaseReturn && (!selectedPurchaseNo || !sellerName || !sellerAddress)) {
      alert('Please fill all required fields for a Purchase Return.');
      return;
    }

    const requestBody = {
      returnNo,
      returnType,
      returnDate,
      discount,
      cgst,
      sgst,
      totalTax,
      returnAmount,
      netReturnAmount,
      products: products.map((p) => ({
        item_id: p.item_id || p.itemId || '',
        name: p.name,
        returnPrice: p.returnPrice,
        quantity: p.quantity,
      })),
    };

    if (isBillReturn) {
      requestBody.billingNo = selectedBillingNo;
      requestBody.customerName = customerName;
      requestBody.customerAddress = customerAddress;
    } else {
      requestBody.purchaseNo = selectedPurchaseNo;
      requestBody.sellerName = sellerName;
      requestBody.sellerAddress = sellerAddress;
    }

    try {
      // Generate Return Invoice HTML
      const response = await api.post(
        '/api/print/generate-return-invoice-html',
        requestBody,
        {
          responseType: 'blob',
        }
      );

      // Create a Blob from the response
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      alert('Return data submitted and invoice generated successfully!');
    } catch (error) {
      console.error('Error submitting return data or generating invoice:', error);
      alert('There was an error submitting the return data or generating the invoice. Please try again.');
    }
  };

  // -- Render --
  return (
    <div>
      {/* 1) Modal to choose return type */}
      <ChooseReturnTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectReturnType={(type) => setReturnType(type)}
      />

      {/* 2) Top Banner */}
      <div className="flex items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 relative">
        <div onClick={() => navigate('/')} className="text-center cursor-pointer">
          <h2 className="text-sm font-bold text-red-600">Travancore Backers</h2>
          <p className="text-gray-400 text-xs font-bold">
            {returnType === 'bill'
              ? 'Return Against Bill'
              : returnType === 'purchase'
              ? 'Return Against Purchase'
              : 'Return Screen'}
          </p>
        </div>
        <i className="fa fa-recycle text-gray-500 text-2xl" />
      </div>

      <div className="container mx-auto py-4">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
          {/* Submit / Print Buttons */}
          <div className="flex justify-end mb-4">
            <div className="text-right space-x-2">
              <button
                onClick={() => handleGenerateAndPrint()}
                className="bg-red-600 font-bold text-xs text-white py-2 px-3 rounded-md"
              >
                <i className="fa fa-print" />
              </button>
              <button
                onClick={handleReturnSubmit}
                className="bg-red-600 font-bold text-xs text-white py-2 px-3 rounded-md"
              >
                Submit Return
              </button>
              <p className="italic text-xs text-gray-400 mt-1">
                Please fill all required fields before submission
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          {success && (
            <BillingSuccess
              isAdmin={userInfo.isAdmin}
              estimationNo={returnInvoice}
            />
          )}

          {/* 3) Steps */}
          <div>
            {/* Step 0 => Enter Bill No or Purchase No */}
            {step === 0 && (
              <div className="space-y-1 mb-4">
                {returnType === 'bill' ? (
                  <>
                    <label className="text-sm font-semibold text-gray-800">
                      Select Billing No
                    </label>
                    <input
                      type="text"
                      ref={billingNoRef}
                      value={selectedBillingNo}
                      onChange={(e) => setSelectedBillingNo(e.target.value)}
                      onKeyDown={handleSuggestionKeyDown}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:border-red-200 focus:ring-red-500 text-xs"
                      placeholder="Enter or select Billing Invoice No"
                      autoComplete="off"
                    />
                  </>
                ) : (
                  <>
                    <label className="text-sm font-semibold text-gray-800">
                      Select Purchase No
                    </label>
                    <input
                      type="text"
                      ref={purchaseNoRef}
                      value={selectedPurchaseNo}
                      onChange={(e) => setSelectedPurchaseNo(e.target.value)}
                      onKeyDown={handleSuggestionKeyDown}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:border-red-200 focus:ring-red-500 text-xs"
                      placeholder="Enter or select Purchase Invoice No"
                      autoComplete="off"
                    />
                  </>
                )}
                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="mt-2 bg-white divide-y shadow-md rounded-md max-h-60 overflow-y-auto">
                    {suggestions.map((item, index) => {
                      // For Bill => item.invoiceNo
                      // For Purchase => item.purchaseId
                      const displayText =
                        returnType === 'bill' ? item.invoiceNo : item.purchaseId;
                      return (
                        <div
                          key={displayText}
                          onClick={() => {
                            if (returnType === 'bill') {
                              setSelectedBillingNo(displayText);
                            } else {
                              setSelectedPurchaseNo(displayText);
                            }
                            fetchDetails(item._id);
                            setSuggestions([]);
                            setSelectedSuggestionIndex(-1);
                          }}
                          className={`cursor-pointer flex justify-between p-4 hover:bg-gray-100 ${
                            index === selectedSuggestionIndex ? 'bg-gray-200' : ''
                          }`}
                        >
                          <span className="text-xs font-bold text-gray-500">
                            {displayText}
                          </span>
                          <i className="fa text-gray-300 px-2 fa-arrow-right" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Step 1 => Return Info */}
            {step === 1 && (
              <div className="space-y-4 mb-4">
                <div className="flex justify-between">
                  <h3 className="text-sm font-bold text-gray-500">
                    Return Information
                  </h3>
                  <p className="italic text-xs text-gray-500">
                    Last Return No: {lastBillId ? lastBillId : 'No Returns'}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-xs">Return No</label>
                    <input
                      type="text"
                      ref={returnNoRef}
                      value={returnNo}
                      onChange={(e) => setReturnNo(e.target.value)}
                      onKeyDown={(e) => changeRef(e, returnDateRef)}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:border-red-200 focus:ring-red-500 text-xs"
                      placeholder="Enter Return No"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs">Return Date</label>
                    <input
                      type="date"
                      ref={returnDateRef}
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          nextStep();
                        }
                      }}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:border-red-200 focus:ring-red-500 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 => Customer Info or Seller Info */}
            {step === 2 && (
              <div className="space-y-4 mb-4">
                {returnType === 'bill' ? (
                  <>
                    <h3 className="text-sm font-semibold text-gray-800">
                      Customer Information
                    </h3>
                    <div>
                      <label className="block text-gray-700 text-xs">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        ref={customerNameRef}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        onKeyDown={(e) => changeRef(e, customerAddressRef)}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:border-red-200 focus:ring-red-500 text-xs"
                        placeholder="Enter Customer Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs">
                        Customer Address
                      </label>
                      <textarea
                        ref={customerAddressRef}
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            nextStep();
                          }
                        }}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:border-red-200 focus:ring-red-500 text-xs"
                        placeholder="Enter Customer Address"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-gray-800">
                      Seller Information
                    </h3>
                    <div>
                      <label className="block text-gray-700 text-xs">
                        Seller Name
                      </label>
                      <input
                        type="text"
                        ref={sellerNameRef}
                        value={sellerName}
                        onChange={(e) => setSellerName(e.target.value)}
                        onKeyDown={(e) => changeRef(e, sellerAddressRef)}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:border-red-200 focus:ring-red-500 text-xs"
                        placeholder="Enter Seller Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs">
                        Seller Address
                      </label>
                      <textarea
                        ref={sellerAddressRef}
                        value={sellerAddress}
                        onChange={(e) => setSellerAddress(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            nextStep();
                          }
                        }}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:border-red-200 focus:ring-red-500 text-xs"
                        placeholder="Enter Seller Address"
                        required
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3 => Update Products */}
            {step === 3 && (
              <div className="space-y-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Update Products</h3>

                {/* GST Toggle */}
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="gstToggle"
                    checked={isGstEnabled}
                    onChange={(e) => setIsGstEnabled(e.target.checked)}
                    className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label
                    htmlFor="gstToggle"
                    className="ml-2 block text-xs text-gray-700"
                  >
                    Apply GST from each product
                  </label>
                </div>

                {/* Products Table */}
                {products.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto bg-white shadow-md rounded-md">
                      <thead>
                        <tr className="bg-gray-100 text-gray-600 text-sm leading-normal">
                          <th className="py-3 px-2 text-left">Item ID</th>
                          <th className="py-3 px-2 text-left">Name</th>
                          <th className="py-3 px-2 text-left">Return Price</th>
                          <th className="py-3 px-2 text-left">Quantity</th>
                          <th className="py-3 px-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-600 text-sm font-light">
                        {products.map((product, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-200 hover:bg-gray-100"
                          >
                            <td className="py-3 text-xs px-2">
                              {product.item_id || product.itemId}
                            </td>
                            <td className="py-3 text-xs px-2">{product.name}</td>
                            <td className="py-3 text-xs px-2">
                              ₹{product.returnPrice?.toFixed(2)}
                            </td>
                            <td className="py-3 text-xs px-2">
                              <input
                                type="number"
                                max={product.initialQuantity}
                                value={product.quantity}
                                onChange={(e) => {
                                  const val = e.target.value === ''
                                    ? ''
                                    : Number(e.target.value);
                                  const safeQty = Math.min(
                                    val,
                                    product.initialQuantity
                                  );
                                  const newProducts = [...products];
                                  newProducts[index].quantity = safeQty;
                                  setProducts(newProducts);
                                }}
                                className="w-20 px-2 py-1 border rounded-md focus:outline-none focus:border-red-200 focus:ring-red-500 text-xs"
                                min="0"
                                required
                              />
                            </td>
                            <td className="py-3 text-xs px-2">
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Are you sure you want to delete ${product.name} from the return?`
                                    )
                                  ) {
                                    setProducts(products.filter((_, i) => i !== index));
                                  }
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <i className="fa fa-trash" aria-hidden="true"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No products available for return.</p>
                )}

                {/* Return Summary */}
                {products.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <h4 className="text-xs font-semibold text-gray-700">
                      Return Summary
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <div className="flex text-xs justify-between">
                        <span>Subtotal (no tax):</span>
                        <span>₹{returnAmount.toFixed(2)}</span>
                      </div>
                      {isGstEnabled && (
                        <>
                          <div className="flex text-xs justify-between">
                            <span>Total GST:</span>
                            <span>₹{totalTax.toFixed(2)}</span>
                          </div>
                          <div className="flex text-xs justify-between ml-2">
                            <span className="italic">CGST (half):</span>
                            <span>₹{cgst.toFixed(2)}</span>
                          </div>
                          <div className="flex text-xs justify-between ml-2">
                            <span className="italic">SGST (half):</span>
                            <span>₹{sgst.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex text-sm justify-between font-bold sm:col-span-2">
                        <span>Net Return Amount (incl. tax):</span>
                        <span>₹{netReturnAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4) Step Navigation */}
          <div className="flex justify-between mb-8 mt-10">
            <button
              disabled={step === 0}
              onClick={prevStep}
              className={`${
                step === 0
                  ? 'bg-gray-300 text-gray-500 text-xs font-bold py-2 px-4 rounded-lg cursor-not-allowed'
                  : 'bg-red-500 text-xs text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600'
              }`}
            >
              Previous
            </button>
            <p className="font-bold text-center text-xs mt-2">
              Step {step + 1} of 4
            </p>
            <button
              disabled={
                // Step 0 => must have chosen Bill or Purchase No
                (step === 0 && returnType === 'bill' && !selectedBillingNo) ||
                (step === 0 && returnType === 'purchase' && !selectedPurchaseNo) ||
                // Step 1 => must have returnNo, returnDate
                (step === 1 && (!returnNo || !returnDate)) ||
                // Step 2 => must have (customerName & address) or (sellerName & address)
                (step === 2 &&
                  returnType === 'bill' &&
                  (!customerName || !customerAddress)) ||
                (step === 2 &&
                  returnType === 'purchase' &&
                  (!sellerName || !sellerAddress)) ||
                // Step 3 => final step; no next
                step === 3
              }
              onClick={nextStep}
              className={`${
                (step === 0 &&
                  ((returnType === 'bill' && !selectedBillingNo) ||
                  (returnType === 'purchase' && !selectedPurchaseNo))) ||
                (step === 1 && (!returnNo || !returnDate)) ||
                (step === 2 &&
                  returnType === 'bill' &&
                  (!customerName || !customerAddress)) ||
                (step === 2 &&
                  returnType === 'purchase' &&
                  (!sellerName || !sellerAddress)) ||
                step === 3
                  ? 'bg-gray-300 text-xs text-gray-500 font-bold py-2 px-4 rounded-lg cursor-not-allowed'
                  : 'bg-red-500 text-xs text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
