// src/screens/EditBillScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SuccessModal from '../components/SccessModal';       // Make sure the import path is correct
import SummaryModal from '../components/SummaryModal';       // Make sure the import path is correct
import OutOfStockModal from '../components/itemAddingModal'; // Make sure the import path is correct
import api from './api';                                     // Make sure the import path is correct
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios'; // If you need Axios
import { useSelector } from 'react-redux';

export default function EditBillScreen() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Redux user info
  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  // ----------------------
  // Billing Info States
  // ----------------------
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [salesmanName, setSalesmanName] = useState('');
  const [salesmanPhoneNumber, setSalesmanPhoneNumber] = useState('');
  const [marketedBy, setMarketedBy] = useState('');

  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('Pending');
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');

  const [showroom, setshowRoom] = useState('');

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerContactNumber, setCustomerContactNumber] = useState('');
  const [customerId, setCustomerId] = useState('');

  // Payment
  const [discount, setDiscount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [receivedDate, setReceivedDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [unloading, setUnloading] = useState(0);
  const [transportation, setTransportation] = useState(0);
  const [handlingCharge, setHandlingCharge] = useState(0);
  const [remark, setRemark] = useState('');
  const [grandTotal, setGrandTotal] = useState(0);

  // ----------------------
  // Product Info States
  // ----------------------
  const [itemId, setItemId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Single unit only => default is “psc”
  const [unit] = useState('psc');

  // Product array
  const [products, setProducts] = useState([]);

  // Product selection
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState('');
  const [fetchQuantity, setFetchQuantity] = useState(0); // stock
  const [gstRate, setGstRate] = useState(0);             // GST Rate (%)
  const [expiryDate, setExpiryDate] = useState('');       // Expiry Date

  // Additional UI States
  const [displaysellingPrice, setDisplaysellingPrice] = useState('');
  const [filterText, setFilterText] = useState('');
  const [fetchItemPrice, setFetchItemPrice] = useState('');

  // For suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [Unit,setUnit] = useState('psc');
  const [outofStockProduct, setOutofstockProduct] = useState(null);

  // Out-of-Stock
  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false);
  const [outOfStockProduct, setOutOfStockProduct] = useState(null);

  // General
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step / Modal controls
  const [step, setStep] = useState(1);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ----------------------
  // Calculation States
  // ----------------------
  const [totalAmount, setTotalAmount] = useState(0);
  const [amountWithoutGST, setAmountWithoutGST] = useState(0);
  const [gstAmount, setGSTAmount] = useState(0);
  const [cgst, setCGST] = useState(0);
  const [sgst, setSGST] = useState(0);
  const [perItemDiscount, setPerItemDiscount] = useState(0);

  // ----------------------
  // Refs
  // ----------------------
  const invoiceNoRef = useRef();
  const customerNameRef = useRef();
  const customerAddressRef = useRef();
  const customerContactNumberRef = useRef();
  const salesmanNameRef = useRef();
  const invoiceDateRef = useRef();
  const expectedDeliveryDateRef = useRef();
  const deliveryStatusRef = useRef();
  const paymentStatusRef = useRef();
  const marketedByRef = useRef();
  const showroomRef = useRef();

  // Product input refs
  const itemIdRef = useRef();
  const itemNameRef = useRef();
  const itemBrandRef = useRef();
  const itemCategoryRef = useRef();
  const itemQuantityRef = useRef();
  const sellingPriceRef = useRef();
  const itemUnitRef = useRef();
  const outofStockRef = useRef();

  // Payment & Summary Refs
  const outOfStockRef = useRef();
  const unloadingRef = useRef();
  const transportationRef = useRef();
  const handlingChargeRef = useRef();
  const discountRef = useRef();
  const receivedAmountRef = useRef();
  const receivedDateRef = useRef();
  const paymentMethodRef = useRef();
  const remarkRef = useRef();

  // For invoice suggestions
  const [billingsuggestions, setBillingSuggestions] = useState([]);
  const [selectedBillingSuggestions, setSelectedBillingSuggestions] = useState();
  // For customer suggestions
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [customerSuggestionIndex, setCustomerSuggestionIndex] = useState(-1);

  // --------------------------------------------------------
  // 1) Fetch Salesmen & Accounts on mount
  // --------------------------------------------------------
  useEffect(() => {
    const fetchSalesmenAndAccounts = async () => {
      setIsLoading(true);
      try {
        const [salesmenRes, accountsRes] = await Promise.all([
          api.get('/api/users/salesmen/all'),
          api.get('/api/accounts/allaccounts'),
        ]);

        // Salesmen
        if (salesmenRes.data) {
          // e.g., [{_id, name, contactNumber}, ...]
          // You can store them in local state
        }

        // Accounts
        if (accountsRes.data) {
          // e.g., [{accountId, accountName}, ...]
          // If you want to set a default:
          if (accountsRes.data.length > 0) {
            setPaymentMethod(accountsRes.data[0].accountId);
          } else {
            setPaymentMethod('');
          }
        }
      } catch (err) {
        console.error('Error fetching salesmen/accounts:', err);
        setError('Failed to fetch payment accounts or salesmen.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesmenAndAccounts();
  }, []);

  // --------------------------------------------------------
  // 2) If NO ID => Listen for invoiceNo changes => billing suggestions
  // --------------------------------------------------------
  useEffect(() => {
    if (!id && invoiceNo) {
      // Only fetch if user typed something
      const fetchSuggestions = async () => {
        try {
          const response = await api.get(
            `/api/billing/billing/suggestions?search=${invoiceNo}`
          );
          setBillingSuggestions(response.data); 
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      };
      fetchSuggestions();
    } else {
      setBillingSuggestions([]);
    }
  }, [id, invoiceNo]);

  const handleSuggestionClick = (suggestion) => {
    navigate(`/bills/edit/${suggestion._id}`);
    navigate(0);
    setBillingSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      setSelectedBillingSuggestions((prevIndex) =>
        prevIndex < billingsuggestions.length - 1 ? prevIndex + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      setSelectedBillingSuggestions((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : billingsuggestions.length - 1
      );
    } else if (e.key === 'Enter' && selectedBillingSuggestions >= 0) {
      // If user pressed Enter on a suggestion
      setSelectedBillingSuggestions(
        billingsuggestions[selectedBillingSuggestions]
      );
      handleSuggestionClick(billingsuggestions[selectedBillingSuggestions]);
      setBillingSuggestions([]);
    } else if (e.key === 'Enter' && id) {
      // If billing already loaded
      changeRef(e, customerNameRef);
    }
  };

  // --------------------------------------------------------
  // 3) Fetch Existing Billing Data if ID present
  // --------------------------------------------------------
  // This can happen after salesmen are loaded, but if you only need them for phone #, we can do:
  useEffect(() => {
    if (!id) return; // no ID => new invoice
    const fetchBillingDetails = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/api/billing/${id}`);
        if (!data) return;

        // Set Billing Info
        setInvoiceNo(data.invoiceNo);
        setInvoiceDate(new Date(data.invoiceDate).toISOString().split('T')[0]);
        setExpectedDeliveryDate(
          new Date(data.expectedDeliveryDate).toISOString().slice(0, 16)
        );
        setReceivedDate(
          new Date(data.paymentReceivedDate || new Date())
            .toISOString()
            .split('T')[0]
        );
        setDeliveryStatus(data.deliveryStatus);
        setPaymentStatus(data.paymentStatus);

        // Set Customer Info
        setCustomerName(data.customerName);
        setCustomerAddress(data.customerAddress);
        setCustomerContactNumber(data.customerContactNumber);
        setCustomerId(data.customerId);

        // Additional
        setMarketedBy(data.marketedBy);
        setDiscount(parseFloat(data.discount) || 0);
        setReceivedAmount(parseFloat(data.paymentAmount) || 0);
        setUnloading(parseFloat(data.unloading) || 0);
        setTransportation(parseFloat(data.transportation) || 0);
        setHandlingCharge(parseFloat(data.handlingCharge) || 0);
        setshowRoom(data.showroom);
        setRemark(data.remark);

        // Products
        if (Array.isArray(data.products)) {
          const fetchedProducts = data.products.map((product) => {
            const gstRate = parseFloat(product.gstRate) || 0;
            const sellingPrice = parseFloat(product.sellingPrice) || 0;
            const gstAmount = (sellingPrice * gstRate) / 100;
        
            return {
              ...product,
              quantity: parseFloat(product.quantity) || 0,
              sellingPriceinQty: sellingPrice * (parseFloat(product.quantity) || 1),
              gstRate,
              gstAmount: gstAmount.toFixed(2),
            };
          });
        
          setProducts(fetchedProducts);
        }
        

        // Salesman
        setSalesmanName(data.salesmanName || '');
        setSalesmanPhoneNumber(data.salesmanPhoneNumber || '');

        // Calculate total quantity => used for discount
        const totalQuantity = data.products?.reduce(
          (acc, product) => acc + (parseFloat(product.quantity) || 0),
          0
        );
        const calculatedPerItemDiscount =
          totalQuantity > 0
            ? parseFloat(data.discount) / totalQuantity
            : 0;
        setPerItemDiscount(calculatedPerItemDiscount.toFixed(2));
      } catch (err) {
        console.error('Error fetching billing details:', err);
        setError('Failed to fetch billing information.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingDetails();
  }, [id]);

  // --------------------------------------------------------
  // 4) Clear error after 3 seconds
  // --------------------------------------------------------
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // --------------------------------------------------------
  // 5) Handle Salesman Selection (for phone #, etc.)
  //    (If you have an array of salesmen stored somewhere, e.g. local state)
  // --------------------------------------------------------
  const handleSalesmanChange = (e) => {
    const selectedName = e.target.value;
    setSalesmanName(selectedName);

    // If you have a local array of salesmen => find the phone:
    // const found = salesmen.find((x) => x.name === selectedName);
    // setSalesmanPhoneNumber(found ? found.contactNumber : '');
  };

  // --------------------------------------------------------
  // 6) Handle Customer Suggestions
  // --------------------------------------------------------
  const handleCustomerNameChange = async (e) => {
    const value = e.target.value;
    setCustomerName(value);

    if (!value.trim()) {
      setCustomerSuggestions([]);
      setCustomerAddress('');
      setCustomerContactNumber('');
      setCustomerId('');
      return;
    }

    try {
      const { data } = await api.get(
        `/api/billing/customer/suggestions?suggestions=true&search=${encodeURIComponent(
          value
        )}`
      );
      // data.suggestions => array of customers
      setCustomerSuggestions(data.suggestions);
    } catch (err) {
      console.error('Error fetching customer suggestions:', err);
      setError('Error fetching customer suggestions.');
    }
  };

  const handleCustomerContactNumberChange = async (e) => {
    const value = e.target.value;
    setCustomerContactNumber(value);

    if (!value.trim()) {
      setCustomerSuggestions([]);
      return;
    }

    try {
      const { data } = await api.get(
        `/api/billing/customer/suggestions?suggestions=true&search=${encodeURIComponent(
          value
        )}`
      );
      setCustomerSuggestions(data.suggestions);
    } catch (err) {
      console.error('Error fetching customer suggestions:', err);
      setError('Error fetching customer suggestions.');
    }
  };

  // Pressing Enter => might want to handle “double enter” to open summary
  const [lastKeyWasEnter, setLastKeyWasEnter] = useState(false);
  const handleDoubleClick = (event) => {
    if (event.key === 'Enter') {
      if (lastKeyWasEnter) {
        setShowSummaryModal(true);
        setLastKeyWasEnter(false);
      } else {
        setLastKeyWasEnter(true);
        setTimeout(() => setLastKeyWasEnter(false), 1000);
      }
    }
  };

  // Focus discountRef when summary modal shows
  useEffect(() => {
    if (showSummaryModal) {
      discountRef.current?.focus();
    }
  }, [showSummaryModal]);

  // --------------------------------------------------------
  // 7) Item ID => suggestions
  // --------------------------------------------------------
  const itemIdChange = async (e) => {
    const newValue = e.target.value;
    setItemId(newValue);

    if (!newValue.trim()) {
      setSuggestions([]);
      setError('');
      return;
    }

    try {
      const { data } = await api.get(`/api/products/search/itemId?query=${newValue}`);
      setSuggestions(data);
      setError('');
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setSuggestions([]);
      setError('Error fetching product suggestions.');
    }
  };

  // --------------------------------------------------------
  // 8) Add Product by ID => fetch from /api/products/itemId/:id
  // --------------------------------------------------------
  const addProductByItemId = async (product) => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/api/products/itemId/${product.item_id}`);
      if (!data) {
        setError('Product not found.');
        return;
      }

      // Check stock
      if (data.countInStock <= 0) {
        setOutOfStockProduct(data);
        setQuantity(1);
        setItemId(data.item_id);
        setSuggestions([]);
        setShowOutOfStockModal(true);
        outOfStockRef.current?.focus();
        return;
      }

      // Set selected product
      setSelectedProduct(data);
      setQuantity(1);
      setFetchQuantity(data.countInStock);
      setFetchItemPrice(data.price);

      // We'll just set the same price in “sellingPrice” and “displaysellingPrice”
      const parsedPrice = parseFloat(data.price) || 0;
      setSellingPrice(parsedPrice.toString());
      setDisplaysellingPrice(parsedPrice.toString());

      // Clear UI stuff
      itemNameRef.current?.focus();
      setItemId(data.item_id);
      setSuggestions([]);
    } catch (err) {
      console.error('Error adding product:', err);
      setError('Product not found or server error.');
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------
  // 9) Add product with entered quantity, selling price, GST, etc.
  // --------------------------------------------------------
  const handleAddProductWithQuantity = () => {
    if (!selectedProduct) {
      setError('No product selected.');
      return;
    }
    // Validate quantity
    const parsedQuantity = parseFloat(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }

    // Validate selling price
    const parsedSellingPrice = parseFloat(sellingPrice);
    if (isNaN(parsedSellingPrice) || parsedSellingPrice <= 0) {
      setError('Please enter a valid selling price.');
      return;
    }

    // Validate GST
    const parsedGstRate = parseFloat(gstRate);
    if (isNaN(parsedGstRate) || parsedGstRate < 0) {
      setError('Please enter a valid GST Rate.');
      return;
    }

    // If Expiry Date is set, check if it’s not in the past
    if (expiryDate) {
      const today = new Date().setHours(0, 0, 0, 0);
      const productExpiry = new Date(expiryDate).setHours(0, 0, 0, 0);
      if (productExpiry < today) {
        setError('Cannot add an expired product!');
        return;
      }
    }

    // Check duplicates
    if (products.some((p) => p.item_id === selectedProduct.item_id)) {
      setError('This product is already added. Adjust the quantity instead.');
      return;
    }

    // Calculate GST amount
    const calculatedGstAmount = (parsedSellingPrice * parsedGstRate) / 100;

    // Build product object
    const productToAdd = {
      ...selectedProduct,
      quantity: parsedQuantity,
      enteredQty: parsedQuantity,
      sellingPrice: parsedSellingPrice,
      sellingPriceinQty: parsedSellingPrice * parsedQuantity,
      gstRate: parsedGstRate,
      gstAmount: calculatedGstAmount.toFixed(2),
      expiryDate: expiryDate || '',
      unit: 'psc', // single unit
    };

    // Add to products array
    const updated = [productToAdd, ...products];
    setProducts(updated);

    // Show success & reset fields
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 2000);

    setSelectedProduct(null);
    setQuantity(1);
    setSellingPrice('');
    setDisplaysellingPrice('');
    setItemId('');
    setItemName('');
    setItemBrand('');
    setItemCategory('');
    setGstRate(0);
    setExpiryDate('');
    setError('');
  };

  // --------------------------------------------------------
  // 10) Delete product from list
  // --------------------------------------------------------
  const deleteProduct = (indexToDelete) => {
    setProducts((prev) => prev.filter((_, idx) => idx !== indexToDelete));
  };

  // --------------------------------------------------------
  // 11) Edit product details inline
  // --------------------------------------------------------
  const handleEditProduct = (index, field, value) => {
    const updatedProducts = [...products];
    const product = updatedProducts[index];
    const parsedValue = parseFloat(value);
  
    if (!product) return;
  
    switch (field) {
      case 'enteredQty':
      case 'quantity':
        product.quantity = isNaN(parsedValue) ? 0 : parsedValue;
        product.enteredQty = product.quantity;
        // Recalculate sellingPriceinQty based on new quantity
        product.sellingPriceinQty = product.quantity * (parseFloat(product.sellingPrice) || 0);
        // Recalculate GST Amount based on new quantity
        product.gstAmount = ((parseFloat(product.sellingPrice) || 0) * (parseFloat(product.gstRate) || 0) / 100 * product.quantity).toFixed(2);
        break;
  
      case 'sellingPrice':
        product.sellingPrice = isNaN(parsedValue) ? 0 : parsedValue;
        // Recalculate sellingPriceinQty based on new selling price
        product.sellingPriceinQty = product.quantity * product.sellingPrice;
        // Recalculate GST Amount based on new selling price
        product.gstAmount = ((product.sellingPrice * (parseFloat(product.gstRate) || 0)) / 100 * product.quantity).toFixed(2);
        break;
  
      case 'gstRate':
        product.gstRate = isNaN(parsedValue) ? 0 : parsedValue;
        // Recalculate GST Amount based on new GST rate
        product.gstAmount = ((parseFloat(product.sellingPrice) || 0) * product.gstRate / 100 * product.quantity).toFixed(2);
        break;
  
      case 'expiryDate':
        product.expiryDate = value;
        break;
  
      default:
        // Handle other fields if any
        product[field] = value;
        break;
    }
  
    setProducts(updatedProducts);
  };
  

  // --------------------------------------------------------
  // 12) Calculate Totals, GST, discount, etc. whenever products or discount changes
  // --------------------------------------------------------
  useEffect(() => {
    const parsedDiscount = parseFloat(discount) || 0;
    const parsedTransportation = parseFloat(transportation) || 0;
    const parsedUnloading = parseFloat(unloading) || 0;
    const parsedHandling = parseFloat(handlingCharge) || 0;
  
    // Total quantity for discount distribution
    const totalQty = products.reduce((acc, p) => acc + (p.quantity || 0), 0);
    const calcPerItemDiscount = totalQty > 0 ? parsedDiscount / totalQty : 0;
    setPerItemDiscount(calcPerItemDiscount.toFixed(2));
  
    // Calculate total product amount and total GST
    let totalProductAmount = 0;
    let totalGst = 0;
  
    products.forEach((p) => {
      const qty = p.quantity || 0;
      const sellingPrice = parseFloat(p.sellingPrice) || 0;
      const gstRate = parseFloat(p.gstRate) || 0;
  
      const spQty = sellingPrice * qty;
      const gstAmt = (sellingPrice * gstRate / 100) * qty;
  
      totalProductAmount += spQty; // Add total selling price
      totalGst += gstAmt; // Add GST for the quantity
    });
  
    setGSTAmount(totalGst.toFixed(2)); // Set overall GST
  
    // Calculate total discount
    const totalDiscount = calcPerItemDiscount * totalQty;
  
    // Include GST and subtract total discount in the final grand total
    const final = totalProductAmount + totalGst + parsedTransportation + parsedUnloading + parsedHandling - totalDiscount;
    setTotalAmount(totalProductAmount.toFixed(2));
    setGrandTotal(final.toFixed(2));
  
    // Reset if no products
    if (!products.length) {
      setTotalAmount(0);
      setDiscount(0);
      setGrandTotal(0);
      setAmountWithoutGST(0);
      setGSTAmount(0);
      setCGST(0);
      setSGST(0);
      setPerItemDiscount(0);
    }
  }, [discount, products, unloading, transportation, handlingCharge]);
  
  

  // --------------------------------------------------------
  // 13) Submit billing data => /api/billing/edit/:id
  // --------------------------------------------------------
  const submitBillingData = async () => {
    setIsSubmitting(true);
    setError('');

    const billingData = {
      invoiceNo,
      invoiceDate,
      salesmanName,
      expectedDeliveryDate,
      deliveryStatus,
      paymentStatus,
      userId: userInfo?._id,
      billingAmount: totalAmount,
      grandTotal: grandTotal,
      cgst, // if needed
      sgst, // if needed
      paymentAmount: receivedAmount,
      paymentMethod,
      paymentReceivedDate: receivedDate,

      customerName,
      customerAddress,
      customerContactNumber,
      customerId,
      salesmanPhoneNumber,
      marketedBy,
      unloading,
      showroom,
      transportation,
      handlingcharge: handlingCharge,
      remark,
      discount,

      // array of products
      products: products.map((p) => ({
        item_id: p.item_id,
        name: p.name,
        category: p.category,
        brand: p.brand,
        quantity: p.quantity,
        sellingPrice: p.sellingPrice,
        enteredQty: p.enteredQty,
        sellingPriceinQty: p.sellingPriceinQty,
        gstRate: p.gstRate,
        gstAmount: p.gstAmount,
        unit: p.unit || 'psc',
        expiryDate: p.expiryDate || '',
      })),
    };

    try {
      // call your API
      await api.post(`/api/billing/edit/${id}`, billingData);

      setShowSummaryModal(false);
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        navigate('/bills');
      }, 2000);
    } catch (err) {
      console.error('Error submitting billing data:', err);
      setError('Error submitting data. Please try again.');
      alert('Error submitting data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSummaryModal = () => {
    // Basic validation
    if (
      !customerName ||
      !customerAddress ||
      !invoiceNo ||
      !expectedDeliveryDate ||
      !salesmanName ||
      products.length === 0
    ) {
      setError('Please fill all required fields and add at least one product.');
      return;
    }
    setShowSummaryModal(true);
  };

  // --------------------------------------------------------
  // 14) Generate PDF
  // --------------------------------------------------------
  const generatePDF = async () => {
    setIsLoading(true);
    const formData = {
      invoiceNo,
      invoiceDate,
      salesmanName,
      expectedDeliveryDate,
      deliveryStatus,
      salesmanPhoneNumber,
      paymentStatus,
      billingAmount: totalAmount,
      cgst,
      sgst,
      paymentAmount: receivedAmount,
      paymentMethod,
      paymentReceivedDate: receivedDate,
      customerName,
      customerAddress,
      customerContactNumber,
      marketedBy,
      unloading,
      transportation,
      handlingcharge: handlingCharge,
      remark,
      discount,
      subTotal: amountWithoutGST,
      grandTotal,
      products: products.map((p) => ({
        item_id: p.item_id,
        name: p.name,
        category: p.category,
        brand: p.brand,
        quantity: p.quantity,
        sellingPrice: p.sellingPrice,
        enteredQty: p.enteredQty,
        sellingPriceinQty: p.sellingPriceinQty,
        gstRate: p.gstRate,
        gstAmount: p.gstAmount,
        unit: p.unit || 'psc',
        expiryDate: p.expiryDate || '',
      })),
    };

    try {
      const response = await api.post('/api/print/generate-pdf', formData, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Invoice_${formData.invoiceNo}.pdf`;
      link.click();
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      setError('Failed to generate PDF invoice.');
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------
  // 15) Print Invoice
  // --------------------------------------------------------
  const printInvoice = () => {
    const formData = {
      invoiceNo,
      invoiceDate,
      salesmanName,
      expectedDeliveryDate,
      deliveryStatus,
      salesmanPhoneNumber,
      paymentStatus,
      billingAmount: totalAmount,
      paymentAmount: receivedAmount,
      paymentMethod,
      paymentReceivedDate: receivedDate,
      customerName,
      customerAddress,
      customerContactNumber,
      marketedBy,
      perItemDiscount,
      subTotal: amountWithoutGST,
      grandTotal,
      transportation,
      unloading,
      handling: handlingCharge,
      remark,
      cgst,
      sgst,
      discount,
      products: products.map((p) => ({
        item_id: p.item_id,
        name: p.name,
        category: p.category,
        brand: p.brand,
        quantity: p.quantity,
        sellingPrice: p.sellingPrice,
        enteredQty: p.enteredQty,
        sellingPriceinQty: p.sellingPriceinQty,
        gstRate: p.gstRate,
        gstAmount: p.gstAmount,
        unit: p.unit || 'psc',
        expiryDate: p.expiryDate || '',
      })),
    };

    api
      .post('api/print/generate-invoice-html', formData)
      .then((response) => {
        const htmlContent = response.data;
        const printWindow = window.open('', '', 'height=800,width=600');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      })
      .catch((error) => {
        console.error('Error printing invoice:', error);
        setError('Failed to print invoice.');
      });
  };

  // --------------------------------------------------------
  // 16) Step Navigation
  // --------------------------------------------------------
  const nextStep = () => {
    if (step === 4) setShowSummaryModal(true);
    else setStep((prev) => prev + 1);
  };
  const prevStep = () => setStep((prev) => prev - 1);

  // Keyboard navigation helper
  function changeRef(e, nextRef) {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextRef?.current?.focus();
    }
  }

  // Auto-focus certain fields
  useEffect(() => {
    if (step === 2) salesmanNameRef.current?.focus();
    else if (step === 3) invoiceDateRef.current?.focus();
    else if (step === 4) itemIdRef.current?.focus();
  }, [step]);

  // When a product is selected => focus quantity
  useEffect(() => {
    if (selectedProduct) {
      itemQuantityRef.current?.focus();
    }
  }, [selectedProduct]);

  // --------------------------------------------------------
  // UI Return
  // --------------------------------------------------------
  return (
    <div className="container mx-auto p-2">
      {/* Header */}
      <div
        className={`flex mx-auto ${
          step === 4 ? 'w-full' : 'max-w-2xl'
        } items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 cursor-pointer`}
        onClick={() => navigate('/')}
      >
        <div className="text-center">
          <h2 className="text-md font-bold text-red-600">Travancore Backers</h2>
          <p className="text-gray-400 text-xs font-bold">
            Billing Edit and Update
          </p>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="font-bold bg-white px-4 py-2 rounded-lg text-gray-600 text-xs animate-pulse">
            Loading...
          </div>
        </div>
      )}

      {/* Main Form */}
      <div
        className={`mx-auto ${
          step === 4 ? 'w-full' : 'max-w-2xl'
        } mt-5 mb-3 bg-white shadow-lg rounded-lg p-4`}
      >
        {/* Top Actions */}
        <div className="flex justify-between">
          <div className="text-left">
            {step === 4 && (
              <div className="flex justify-between mb-8">
                <div className="space-x-4 mx-2 flex">
                  <p className="text-sm font-bold text-gray-500 mt-2">
                    <i className="fa fa-list" />
                  </p>
                  <button
                    disabled={step === 1}
                    onClick={prevStep}
                    className={`${
                      step === 1
                        ? 'bg-gray-300 text-gray-500 text-xs font-bold py-2 px-4 rounded-lg cursor-not-allowed'
                        : 'bg-red-500 text-xs text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600'
                    }`}
                  >
                    Previous
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Buttons (PDF, Print, Submit) */}
          <div className="text-right">
            <button
              onClick={generatePDF}
              className={`mb-2 bg-red-500 text-xs text-white font-bold py-2 px-4 rounded-lg mr-2 ${
                products.length === 0 ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-600'
              }`}
              disabled={products.length === 0 || !userInfo?.isAdmin}
            >
              <i className="fa fa-download" />
            </button>

            <button
              onClick={printInvoice}
              className={`mb-2 bg-red-500 text-xs text-white font-bold py-2 px-4 rounded-lg mr-2 ${
                products.length === 0 ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-600'
              }`}
              disabled={products.length === 0 || !userInfo?.isAdmin}
            >
              <i className="fa fa-print" />
            </button>

            <button
              onClick={() => setShowSummaryModal(true)}
              className={`mb-2 bg-red-500 text-xs text-white font-bold py-2 px-4 rounded-lg ${
                products.length === 0 ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-600'
              }`}
              disabled={products.length === 0}
            >
              Submit
            </button>
            <p className="text-xs text-gray-400">
              Fill all fields before submission
            </p>
          </div>
        </div>

        {/* Step 1: Customer Info */}
        {step === 1 && (
          <div className="mb-6">
            <h2 className="text-md text-gray-500 font-bold mb-4">
              Customer Information
            </h2>

            {/* InvoiceNo + Suggestions */}
            <div className="mb-4">
              <label className="block text-xs text-gray-700">Invoice No</label>
              <input
                type="text"
                ref={invoiceNoRef}
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e)}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                placeholder="Enter Invoice No"
              />
              {billingsuggestions.length > 0 && (
                <ul className="bg-white divide-y shadow-lg rounded-md overflow-hidden mb-4 border border-gray-300 max-h-48 overflow-y-auto">
                  {billingsuggestions.map((suggestion, index) => (
                    <li
                      key={suggestion._id}
                      className={`p-4 cursor-pointer hover:bg-gray-100 flex justify-between ${
                        index === selectedBillingSuggestions
                          ? 'bg-gray-200'
                          : ''
                      }`}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <span className="font-bold text-xs text-gray-500">
                        {suggestion.invoiceNo}
                      </span>
                      <i className="fa fa-arrow-right text-gray-300" />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Customer Name + Suggestions */}
            <div className="mb-4 relative">
              <label className="block text-xs text-gray-700">Customer Name</label>
              <input
                type="text"
                ref={customerNameRef}
                value={customerName}
                autoComplete="off"
                onChange={handleCustomerNameChange}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setCustomerSuggestionIndex((prev) =>
                      prev < customerSuggestions.length - 1 ? prev + 1 : prev
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setCustomerSuggestionIndex((prev) =>
                      prev > 0 ? prev - 1 : prev
                    );
                  } else if (e.key === 'Enter') {
                    if (
                      customerSuggestionIndex >= 0 &&
                      customerSuggestionIndex < customerSuggestions.length
                    ) {
                      e.preventDefault();
                      const selectedCustomer =
                        customerSuggestions[customerSuggestionIndex];
                      setCustomerName(selectedCustomer.customerName);
                      setCustomerContactNumber(
                        selectedCustomer.customerContactNumber
                      );
                      setCustomerAddress(selectedCustomer.customerAddress);
                      setCustomerId(selectedCustomer.customerId);
                      customerAddressRef.current?.focus();
                      setCustomerSuggestionIndex(-1);
                      setCustomerSuggestions([]);
                    } else {
                      // If no suggestion used => generate ID if none
                      if (!customerId) {
                        const generateCustomerId = async () => {
                          try {
                            const { data } = await api.get('/api/billing/lastOrder/id');
                            // data.lastCustomerId => e.g. "CUS005"
                            const lastNum = parseInt(
                              data.lastCustomerId.slice(3),
                              10
                            );
                            const nextCustomer = `CUS${(lastNum + 1)
                              .toString()
                              .padStart(3, '0')}`;
                            setCustomerId(nextCustomer);
                          } catch (error) {
                            console.error('Failed generating new customer ID', error);
                          }
                        };
                        generateCustomerId();
                      }
                      customerContactNumberRef.current?.focus();
                    }
                  }
                }}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                placeholder="Enter Customer Name"
              />
              {customerSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-md max-h-60 overflow-y-auto">
                  {customerSuggestions.map((cust, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setCustomerName(cust.customerName);
                        setCustomerContactNumber(cust.customerContactNumber);
                        setCustomerAddress(cust.customerAddress);
                        setCustomerId(cust.customerId);
                        customerAddressRef.current?.focus();
                        setCustomerSuggestionIndex(-1);
                        setCustomerSuggestions([]);
                      }}
                      className={`p-2 text-xs cursor-pointer hover:bg-gray-100 ${
                        index === customerSuggestionIndex
                          ? 'bg-gray-200'
                          : ''
                      }`}
                    >
                      {cust.customerName}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Contact Number */}
            <div className="mb-4">
              <label className="block text-xs text-gray-700">
                Customer Contact Number
              </label>
              <input
                type="number"
                ref={customerContactNumberRef}
                placeholder="Enter Customer Number"
                value={customerContactNumber}
                onChange={handleCustomerContactNumberChange}
                onKeyDown={(e) => changeRef(e, customerAddressRef)}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
              />
            </div>

            {/* Customer Address */}
            <div className="mb-4">
              <label className="block text-xs text-gray-700">
                Customer Address
              </label>
              <textarea
                ref={customerAddressRef}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') nextStep();
                }}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                placeholder="Enter Customer Address"
              />
            </div>

            {/* Customer ID */}
            <div className="mb-4">
              <label className="block text-xs text-gray-700">Customer ID</label>
              <input
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                onKeyDown={(e) => changeRef(e, salesmanNameRef)}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                placeholder="Enter Customer ID"
              />
            </div>
          </div>
        )}

        {/* Step 2: Salesman */}
        {step === 2 && (
          <div className="mb-6">
            <h2 className="text-md text-gray-500 font-bold mb-4">
              Salesman Information
            </h2>
            <div className="mb-4">
              <label className="block text-xs text-gray-700">Salesman Name</label>
              <input
                type="text"
                ref={salesmanNameRef}
                value={salesmanName}
                onChange={(e) => setSalesmanName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') nextStep();
                }}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                placeholder="Enter Salesman Name"
              />
            </div>

            {/* If salesmanName => show phone input */}
            {salesmanName && (
              <div className="mb-4">
                <label className="block text-xs text-gray-700">
                  Salesman Phone Number
                </label>
                <input
                  type="text"
                  value={salesmanPhoneNumber}
                  onChange={(e) => setSalesmanPhoneNumber(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                  placeholder="Salesman Phone Number"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Payment and Delivery */}
        {step === 3 && (
          <div className="mb-6">
            <h2 className="text-md text-gray-500 font-bold mb-4">
              Payment and Delivery Information
            </h2>

            {/* Invoice Date */}
            <div className="mb-4">
              <label className="block text-xs text-gray-700">Invoice Date</label>
              <input
                type="date"
                ref={invoiceDateRef}
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                onKeyDown={(e) => changeRef(e, expectedDeliveryDateRef)}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
              />
            </div>

            {/* Expected Delivery Date */}
            <div className="mb-4">
              <label className="block text-xs text-gray-700">
                Expected Delivery Date
              </label>
              <input
                type="datetime-local"
                ref={expectedDeliveryDateRef}
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                onKeyDown={(e) => changeRef(e, marketedByRef)}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
              />
            </div>

            {/* Marketed By */}
            <div className="mb-4">
              <label className="block text-xs text-gray-700">Marketed By</label>
              <input
                type="text"
                ref={marketedByRef}
                value={marketedBy}
                onChange={(e) => setMarketedBy(e.target.value)}
                onKeyDown={(e) => changeRef(e, deliveryStatusRef)}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                placeholder="Marketed by"
              />
            </div>

            {/* Delivery Status */}
            <div className="mb-4">
              <label className="block text-xs text-gray-700">
                Delivery Status
              </label>
              <select
                value={deliveryStatus}
                ref={deliveryStatusRef}
                onChange={(e) => setDeliveryStatus(e.target.value)}
                onKeyDown={() => nextStep()}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
              >
                <option value="Pending">Pending</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>

            {/* Showroom */}
            <div className="mb-4">
              <label className="block text-xs text-gray-700">Showroom</label>
              <select
                value={showroom}
                ref={showroomRef}
                onChange={(e) => setshowRoom(e.target.value)}
                onKeyDown={(e) => changeRef(e, itemIdRef)}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
              >
                <option value="main">Main Showroom</option>
                <option value="branch">Branch</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 4: Add Products */}
        {step === 4 && (
          <div>
            <div className="flex flex-col min-h-screen">
              {/* Desktop Layout */}
              <div className="hidden md:flex flex-col flex-1">
                {/* Top Section => Product Table & Search */}
                <div className="flex flex-col flex-1 overflow-y-auto p-6">
                  {/* If there are products => show them */}
                  {products.length > 0 && (
                    <div className="mt-6">
                      <h2 className="text-sm font-semibold mb-2">
                        Added Products: {products.length}
                      </h2>

                      {/* Filter Input */}
                      <div className="mb-4 flex items-center">
                        <input
                          type="text"
                          placeholder="Search added products..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                        />
                        <i className="fa fa-search bg-red-500 p-2 text-white rounded-lg ml-2 items-center" />
                      </div>

                      {/* Product Table */}
                      <div className="overflow-x-auto rounded-md">
                        <table className="table-auto w-full border-collapse rounded-xl shadow-md">
                          <thead>
                            <tr className="bg-red-500 text-white text-xs">
                              <th className="px-2 py-2 text-left">Name</th>
                              <th className="px-2 py-2 text-center">Qty</th>
                              <th className="px-2 py-2 text-center">
                                Sell Price
                              </th>
                              <th className="px-2 py-2 text-center">GST (%)</th>
                              <th className="px-2 py-2 text-center">
                                GST Amount
                              </th>
                              <th className="px-2 py-2 text-left">Total</th>
                              <th className="px-2 py-2 text-center">Discount</th>
                              <th className="px-2 py-2 text-left">Net Total</th>
                              <th className="px-2 py-2 text-center">
                                <i className="fa fa-trash" aria-hidden="true" />
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-x">
                            {products
                              .filter(
                                (p) =>
                                  p.name
                                    .toLowerCase()
                                    .includes(filterText.toLowerCase()) ||
                                  p.item_id
                                    .toLowerCase()
                                    .includes(filterText.toLowerCase())
                              )
                              .map((p, index) => {
                                const discountForRow = perItemDiscount * p.quantity;
                                const netTotal =
                                  p.quantity * p.sellingPriceinQty +
                                  parseFloat(p.gstAmount) -
                                  discountForRow;

                                return (
                                  <tr
                                    key={index}
                                    className={`divide-x ${
                                      index % 2 === 0
                                        ? 'bg-gray-100'
                                        : 'bg-white'
                                    } border-b hover:bg-red-50 transition duration-150`}
                                  >
                                    <td className="px-2 py-2 text-xs font-medium">
                                      {p.name} - {p.item_id}
                                    </td>
                                    <td className="px-2 py-2 text-center text-xs">
                                      <input
                                        type="number"
                                        min={1}
                                        value={p.enteredQty}
                                        onChange={(e) =>
                                          handleEditProduct(
                                            index,
                                            'enteredQty',
                                            e.target.value
                                          )
                                        }
                                        className="w-12 text-center px-1 py-1 border rounded-md text-xs"
                                      />
                                    </td>
                                    <td className="px-2 py-2 text-center text-xs">
                                      <input
                                        type="number"
                                        min={0}
                                        value={p.sellingPrice}
                                        onChange={(e) =>
                                          handleEditProduct(
                                            index,
                                            'sellingPrice',
                                            e.target.value
                                          )
                                        }
                                        className="w-16 text-center px-1 py-1 border rounded-md text-xs"
                                      />
                                    </td>
                                    <td className="px-2 py-2 text-center text-xs">
                                      <input
                                        type="number"
                                        min={0}
                                        value={p.gstRate}
                                        onChange={(e) =>
                                          handleEditProduct(
                                            index,
                                            'gstRate',
                                            e.target.value
                                          )
                                        }
                                        className="w-12 text-center px-1 py-1 border rounded-md text-xs"
                                      />
                                    </td>
                                    <td className="px-2 py-2 text-center text-xs">
                                      ₹{parseFloat(p.gstAmount).toFixed(2)}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                      ₹
                                      {(
                                        p.quantity * p.sellingPriceinQty
                                      ).toFixed(2)}
                                    </td>
                                    <td className="px-2 py-2 text-center text-xs">
                                      ₹{discountForRow.toFixed(2)}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                      ₹{netTotal.toFixed(2)}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-center">
                                      <button
                                        onClick={() => {
                                          if (
                                            window.confirm(
                                              `Are you sure you want to delete ${p.name} from the bill?`
                                            )
                                          )
                                            deleteProduct(index);
                                        }}
                                        className="text-red-500 font-bold hover:text-red-700"
                                      >
                                        <i
                                          className="fa fa-trash"
                                          aria-hidden="true"
                                        />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Section => Add Product Fields + Totals */}
                <div className="flex flex-col flex-1 overflow-y-auto p-6">
                <div className="fixed bottom-0 left-0 right-0 bg-white px-4 pt-4 pb-4 border-t shadow-inner">
          <div className="flex justify-between">
            <div className="w-4/5">
              <div className="grid grid-cols-5 gap-2">
                {/* Item ID Input */}
                <div className="flex flex-col">
                  <label className="block text-gray-700 text-xs mb-1">Item ID</label>
                  <input
                    type="text"
                    ref={itemIdRef}
                    value={itemId}
                    onChange={(e) => itemIdChange(e)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedSuggestionIndex((prev) =>
                          prev < suggestions.length - 1 ? prev + 1 : prev
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
                      } else if (e.key === 'Enter') {
                        if (
                          selectedSuggestionIndex >= 0 &&
                          selectedSuggestionIndex < suggestions.length
                        ) {
                          e.preventDefault();
                          addProductByItemId(suggestions[selectedSuggestionIndex]);
                          const selected = suggestions[selectedSuggestionIndex];
                          setItemId(selected.item_id);
                          setItemName(selected.name);
                          setItemCategory(selected.category);
                          setItemBrand(selected.brand);
                          itemNameRef.current?.focus();
                        } else {
                          handleDoubleClick(e)
                          itemNameRef.current?.focus();
                        }
                      }
                    }}
                    className="w-full border border-gray-300 px-2 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                    placeholder="Enter Item ID or Name"
                  />
                  {error && <p className="text-red-500 truncate text-xs">{error}</p>}
                  {/* Suggestions Dropdown */}
                  {suggestions.length > 0 && (
                    <div className="mt-1 bg-white border rounded-md max-h-40 divide-y overflow-y-auto">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            addProductByItemId(suggestion);
                            setItemName(suggestion.name);
                            setItemCategory(suggestion.category);
                            setItemBrand(suggestion.brand);
                            setSuggestions([]);
                            itemNameRef.current?.focus();
                          }}
                          className={`p-2 text-xs cursor-pointer hover:bg-gray-100 ${
                            index === selectedSuggestionIndex ? 'bg-gray-200' : ''
                          }`}
                        >
                          {suggestion.name} - {suggestion.item_id}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Item Name Input */}
                <div className="flex flex-col">
                  <label className="block text-gray-700 text-xs mb-1">Item Name</label>
                  <input
                    type="text"
                    value={itemName}
                    ref={itemNameRef}
                    onChange={(e) => setItemName(e.target.value)}
                    onKeyDown={(e) => changeRef(e, itemCategoryRef)}
                    className="w-full border border-gray-300 px-2 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                    placeholder="Item Name"
                    disabled={!selectedProduct}
                  />
                </div>

                {/* Item Category Input */}
                <div className="flex flex-col">
                  <label className="block text-gray-700 text-xs mb-1">Category</label>
                  <input
                    type="text"
                    ref={itemCategoryRef}
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    onKeyDown={(e) => changeRef(e, itemBrandRef)}
                    className="w-full border border-gray-300 px-2 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                    placeholder="Item Category"
                    disabled={!selectedProduct}
                  />
                </div>

                {/* Item Brand Input */}
                <div className="flex flex-col">
                  <label className="block text-gray-700 text-xs mb-1">Brand</label>
                  <input
                    type="text"
                    value={itemBrand}
                    ref={itemBrandRef}
                    onChange={(e) => setItemBrand(e.target.value)}
                    onKeyDown={(e) => changeRef(e, itemUnitRef)}
                    className="w-full border border-gray-300 px-2 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                    placeholder="Item Brand"
                    disabled={!selectedProduct}
                  />
                </div>


                                {/* Unit */}
                                <div className="flex flex-col">
                  <label className="block text-gray-700 text-xs mb-1">Unit</label>
                  <select
                    ref={itemUnitRef}
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    onKeyDown={(e) => changeRef(e, itemQuantityRef)}
                    className="w-full border border-gray-300 px-2 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                  >
     <option value="pcs">pcs</option>
     <option value="kg">kg</option>
                  </select>
                </div>

              </div>

              <div className="grid grid-cols-7 gap-2 mt-2">

                {/* Quantity */}
                <div className="flex flex-col">
                  <label className="block text-gray-700 text-xs mb-1">Quantity</label>
                  <input
                    type="number"
                    ref={itemQuantityRef}
                    max={fetchQuantity}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.min(parseFloat(e.target.value), fetchQuantity))
                    }
                    onKeyDown={(e) => changeRef(e, sellingPriceRef)}
                    className="w-full border border-gray-300 px-2 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                  />
                </div>

                <div className="mb-2">
              <label className="block text-xs mb-1 text-gray-700">M.R.P</label>
              <input
      type="number"
      value={displaysellingPrice}
      className="w-full border border-gray-300 px-2 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
      placeholder="No Selling Price"
      readOnly
       // Keep readOnly if manual editing isn't allowed
    />
            </div> 

                {/* Selling Price */}
                <div className="flex flex-col">
                  <label className="block text-gray-700 text-xs mb-1">Cus. Selling Price</label>
                  <input
                    type="number"
                    ref={sellingPriceRef}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddProductWithQuantity();
                      }
                    }}
                    className="w-full border border-gray-300 px-2 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                    placeholder="Enter Selling Price"
                  />
                </div>

                {/* GST Rate */}
 <div className="flex flex-col">
  <label className="block text-gray-700 text-xs mb-1">GST (%)</label>
   <input
     type="number"
     value={gstRate}
     onChange={(e) => setGstRate(e.target.value)}
     className="w-full border border-gray-300 px-2 py-2 rounded-md text-xs"
     placeholder="e.g. 18"
   />
</div>

 {/* Expiry Date */}
 <div className="flex flex-col">
   <label className="block text-gray-700 text-xs mb-1">Expiry Date</label>
   <input
     type="date"
     value={expiryDate}
     onChange={(e) => setExpiryDate(e.target.value)}
    className="w-full border border-gray-300 px-2 py-2 rounded-md text-xs"
  />
 </div>

                {/* Stock Status */}
                <div
                  className={`flex flex-col items-center justify-center bg-gray-50 p-2 rounded-md ${
                    selectedProduct && fetchQuantity > 10
                      ? 'text-green-600'
                      : selectedProduct && fetchQuantity > 0
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  <p className="text-xs font-bold">Stock:</p>
                  <p className="text-xs font-bold">
                    {selectedProduct ? fetchQuantity : '0'} {unit}
                  </p>
                </div>

                {/* Net Amount */}
                <div className="flex flex-col items-center justify-center bg-gray-50 p-2 rounded-md">
                  <p className="text-xs font-bold text-gray-500">Net Amount:</p>
                  <p className="text-xs font-bold">
                    ₹
                    {quantity > 0 && sellingPrice > 0
                      ? (quantity * sellingPrice).toFixed(2)
                      : '0.00'}
                  </p>
                </div>
              </div>
            </div>

              {/* Action Buttons */}
              <div className="text-center md:hidden lg:block bg-gray-100 ml-2 items-center text-center rounded-lg p-4 h-full shadow-inner">
                <div className='mb-2 mt-2'>
                  <p className='text-xs font-bold'>Added Products</p>
                  <p className='text-xs font-bold'>{products?.length}</p>
                  </div>
                
                <div>
                <button
                  className="bg-red-500 text-xs text-white font-bold py-1 px-3 rounded focus:outline-none hover:bg-red-600"
                  onClick={handleAddProductWithQuantity}
                >
                  Add Item
                </button>
                <button
                  onClick={() => {
                    setOutofstockProduct(selectedProduct);
                    setQuantity(0);
                    setItemId('');
                    setItemName('');
                    setItemCategory('');
                    setItemBrand('');
                    setSuggestions([]);
                    setShowOutOfStockModal(true);
                    outofStockRef.current?.focus();
                  }}
                  className="text-xs text-gray-500 font-bold hover:text-gray-700"
                >
                  Update Stock
                </button>
                </div>
              </div>

            {/* Total Amount Display */}
              <div className="bg-gray-100 ml-2 w-60  items-center text-center rounded-lg shadow-inner">
                <div className="text-gray-600 mt-8">
                  <p className="text-sm font-bold">Total</p>
                  <p className="text-xs font-bold">Bill Amount:</p>
                </div>
                <h2 className="text-sm font-bold text-gray-700">
                  INR {(parseFloat(grandTotal)).toFixed(2)}
                  <p className="font-bold text-xs">
                    Discount: {parseFloat(discount || 0)?.toFixed(2)}
                  </p>
                </h2>
              </div>

          </div>
        </div>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden flex flex-col flex-1 p-6">
                {/* Item ID Input */}
                <div className="mb-4 relative">
                  <label className="block text-xs text-gray-700">Item ID</label>
                  <input
                    type="text"
                    value={itemId}
                    onChange={itemIdChange}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                    placeholder="Enter Item ID or Name"
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedSuggestionIndex((prev) =>
                          prev < suggestions.length - 1 ? prev + 1 : prev
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedSuggestionIndex((prev) =>
                          prev > 0 ? prev - 1 : prev
                        );
                      } else if (e.key === 'Enter') {
                        if (
                          selectedSuggestionIndex >= 0 &&
                          selectedSuggestionIndex < suggestions.length
                        ) {
                          e.preventDefault();
                          addProductByItemId(
                            suggestions[selectedSuggestionIndex]
                          );
                        }
                      }
                    }}
                  />
                  {error && (
                    <p className="text-red-500 mt-1 text-xs">{error}</p>
                  )}

                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-md max-h-60 divide-y overflow-y-auto">
                      {suggestions.map((sugg, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            addProductByItemId(sugg);
                            setItemName(sugg.name);
                            setItemCategory(sugg.category);
                            setItemBrand(sugg.brand);
                          }}
                          className={`p-4 text-xs cursor-pointer hover:bg-gray-100 ${
                            idx === selectedSuggestionIndex
                              ? 'bg-gray-200'
                              : ''
                          }`}
                        >
                          {sugg.name} - {sugg.item_id}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* If a product is selected => show fields */}
                {selectedProduct && (
                  <div className="p-4 border border-gray-200 rounded-lg shadow-md bg-white mb-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold truncate">
                        {selectedProduct.name.slice(0, 25)}... ID:{' '}
                        {selectedProduct.item_id}
                      </p>
                      <p
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          fetchQuantity > 10
                            ? 'bg-green-300 text-green-700'
                            : fetchQuantity > 0
                            ? 'bg-yellow-300 text-yellow-700'
                            : 'bg-red-300 text-red-700'
                        }`}
                      >
                        {fetchQuantity > 10
                          ? 'In Stock'
                          : fetchQuantity > 0
                          ? 'Low Stock'
                          : 'Out of Stock'}
                      </p>
                    </div>
                    <p className="text-xs font-bold truncate mb-2">
                      Category: {selectedProduct.category || 'n/a'}
                    </p>
                    <p
                      className={`text-xs font-bold mb-2 ${
                        fetchQuantity > 10
                          ? 'text-green-700'
                          : fetchQuantity > 0
                          ? 'text-yellow-700'
                          : 'text-red-700'
                      }`}
                    >
                      In stock: {fetchQuantity || 0} psc
                    </p>

                    {/* Quantity */}
                    <div className="mb-4">
                      <label className="block text-xs mb-1 text-gray-700">
                        Quantity
                      </label>
                      <input
                        type="number"
                        max={fetchQuantity}
                        value={quantity}
                        onChange={(e) => {
                          setQuantity(
                            Math.min(parseFloat(e.target.value) || 0, fetchQuantity)
                          );
                        }}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                        placeholder="Quantity"
                      />
                    </div>

                    {/* GST & Expiry */}
                    <div className="mb-4">
                      <label className="block text-xs text-gray-700">GST (%)</label>
                      <input
                        type="number"
                        value={gstRate}
                        onChange={(e) => setGstRate(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs text-gray-700">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-xs"
                      />
                    </div>

                    {/* Display Price (Cost) */}
                    <div className="mb-4">
                      <label className="block text-xs mb-1 text-gray-700">
                        Cost Price
                      </label>
                      <input
                        type="number"
                        value={displaysellingPrice}
                        readOnly
                        className="w-full border border-gray-300 px-2 py-2 rounded-md text-xs"
                      />
                    </div>

                    {/* Selling Price (User can override) */}
                    <div className="mb-4">
                      <label className="block text-xs mb-1 text-gray-700">
                        Sell Price
                      </label>
                      <input
                        type="number"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                        className="w-full border border-gray-300 px-2 py-2 rounded-md text-xs"
                        placeholder="Enter Selling Price"
                      />
                    </div>

                    {/* Add Item */}
                    <button
                      className="bg-red-500 text-xs w-full text-white font-bold py-2 px-4 rounded focus:outline-none hover:bg-red-600"
                      onClick={handleAddProductWithQuantity}
                    >
                      Add Item
                    </button>
                    {/* Update Stock */}
                    <p
                      onClick={() => {
                        setOutOfStockProduct(selectedProduct);
                        setQuantity(0);
                        setItemId('');
                        setItemName('');
                        setItemCategory('');
                        setItemBrand('');
                        setSuggestions([]);
                        setShowOutOfStockModal(true);
                        outOfStockRef.current?.focus();
                      }}
                      className="text-xs cursor-pointer text-gray-500 text-center font-bold my-5"
                    >
                      Update Stock
                    </p>
                  </div>
                )}

                {/* List of added products in mobile */}
                {products.length > 0 && (
                  <div className="mt-6">
                    <h2 className="text-sm font-semibold mb-4">
                      Added Products: {products.length}
                    </h2>
                    {/* Filter */}
                    <div className="mb-4 flex items-center">
                      <input
                        type="text"
                        placeholder="Filter by product name or ID"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs"
                      />
                      <i className="fa fa-search bg-red-500 p-3 text-white rounded-lg ml-2 items-center" />
                    </div>

                    {products
                      .filter(
                        (p) =>
                          p.name.toLowerCase().includes(filterText.toLowerCase()) ||
                          p.item_id.toLowerCase().includes(filterText.toLowerCase())
                      )
                      .map((p, idx) => {
                        // discount for row
                        const discountForRow = ((p.quantity * p.sellingPriceinQty) / totalAmount) * discount;
                        const netTotal =
                          p.quantity * p.sellingPriceinQty - discountForRow;

                        return (
                          <div
                            key={idx}
                            className="mb-4 bg-white border border-gray-200 rounded-lg shadow-md flex flex-col space-y-2"
                          >
                            {/* Header */}
                            <div className="flex justify-between rounded-t-lg bg-red-500 p-2 items-center">
                              <p className="text-xs text-white font-bold truncate">
                                {p.name.slice(0, 20)}... - {p.item_id}
                              </p>
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Are you sure you want to delete ${p.name} from the bill?`
                                    )
                                  )
                                    deleteProduct(idx);
                                }}
                                className="text-white text-xs font-bold hover:text-white"
                              >
                                <i className="fa fa-trash" aria-hidden="true" />
                              </button>
                            </div>

                            <div className="flex flex-col px-4 py-3 space-y-2">
                              {/* Qty */}
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold">
                                  Quantity:
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  value={p.enteredQty}
                                  onChange={(e) =>
                                    handleEditProduct(idx, 'enteredQty', e.target.value)
                                  }
                                  className="w-20 border border-gray-300 px-2 py-1 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs text-center"
                                />
                              </div>
                              {/* Selling Price */}
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold">
                                  Selling Price:
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.sellingPrice}
                                  onChange={(e) =>
                                    handleEditProduct(idx, 'sellingPrice', e.target.value)
                                  }
                                  className="w-20 border border-gray-300 px-2 py-1 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs text-center"
                                />
                              </div>
                              {/* GST Rate */}
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold">
                                  GST Rate:
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  value={p.gstRate}
                                  onChange={(e) =>
                                    handleEditProduct(idx, 'gstRate', e.target.value)
                                  }
                                  className="w-20 border border-gray-300 px-2 py-1 rounded-md focus:border-red-200 focus:ring-red-500 focus:outline-none text-xs text-center"
                                />
                              </div>
                              {/* GST Amount */}
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold">
                                  GST Amount:
                                </span>
                                <span className="text-xs font-bold">
                                  ₹{parseFloat(p.gstAmount || 0).toFixed(2)}
                                </span>
                              </div>
                              {/* Discount */}
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold">
                                  Discount:
                                </span>
                                <span className="text-xs">
                                  ₹{discountForRow.toFixed(2)}
                                </span>
                              </div>
                              {/* Net Total */}
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold">
                                  Net Total:
                                </span>
                                <span className="text-xs font-bold">
                                  ₹{netTotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation */}
        <div className="flex justify-between mb-8">
          <button
            disabled={step === 1}
            onClick={prevStep}
            className={`${
              step === 1
                ? 'bg-gray-300 text-gray-500 text-xs font-bold py-2 px-4 rounded-lg cursor-not-allowed'
                : 'bg-red-500 text-xs text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600'
            }`}
          >
            Previous
          </button>
          <p className="font-bold text-center text-xs mt-2">
            Step {step} of 4
          </p>
          <button
            disabled={step === 4}
            onClick={nextStep}
            className={`${
              step === 4
                ? 'bg-gray-300 text-xs text-gray-500 font-bold py-2 px-4 rounded-lg cursor-not-allowed'
                : 'bg-red-500 text-xs text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600'
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && <SuccessModal message="Item added successfully!" />}

      {/* Summary Modal */}
      {showSummaryModal && (
        <SummaryModal
          // Payment accounts
          accounts={[] /* or your fetched accounts */}
          customerName={customerName}
          invoiceNo={invoiceNo}
          totalAmount={totalAmount}
          amountWithoutGST={amountWithoutGST}
          salesmanName={salesmanName}
          cgst={cgst}
          sgst={sgst}
          discount={discount}
          setDiscount={setDiscount}
          receivedAmount={receivedAmount}
          setReceivedAmount={setReceivedAmount}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          unloading={unloading}
          setUnloading={setUnloading}
          transportation={transportation}
          setTransportation={setTransportation}
          handling={handlingCharge}
          setHandling={setHandlingCharge}
          remark={remark}
          setRemark={setRemark}
          receivedDate={receivedDate}
          setReceivedDate={setReceivedDate}
          grandTotal={grandTotal}
          discountRef={discountRef}
          paymentMethodRef={paymentMethodRef}
          receivedDateRef={receivedDateRef}
          remarkRef={remarkRef}
          unloadingRef={unloadingRef}
          receivedAmountRef={receivedAmountRef}
          transportationRef={transportationRef}
          handlingRef={handlingChargeRef}
          changeRef={changeRef}
          onClose={() => setShowSummaryModal(false)}
          onSubmit={submitBillingData}
          isSubmitting={isSubmitting}
          totalProducts={products.length}
        />
      )}

      {/* Out of Stock Modal */}
      {showOutOfStockModal && outOfStockProduct && (
        <OutOfStockModal
          product={outOfStockProduct}
          onUpdate={async (newQ, product) => {
            if (newQ) {
              const { data } = await api.get(
                `/api/products/itemId/${product.item_id}`
              );
              if (data && data.countInStock) {
                setSelectedProduct(data);
                setQuantity(1);
                setSellingPrice(data.price);
                setFetchQuantity(data.countInStock);
                setItemId('');
                setSuggestions([]);
              } else {
                alert('Error updating stock!');
              }
            }
          }}
          onClose={() => {
            setOutOfStockProduct(null);
            setShowOutOfStockModal(false);
          }}
          stockRef={outOfStockRef}
        />
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <p className="text-xs animate-pulse font-bold">{error}</p>
        </div>
      )}
    </div>
  );
}
