// src/screens/PurchaseList.jsx
import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import api from './api';
import { useSelector } from 'react-redux';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { FaUser, FaFilter } from 'react-icons/fa';

const PurchaseList = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sellerNameFilter, setSellerNameFilter] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // Sidebar for mobile filters
  const [showSidebar, setShowSidebar] = useState(false);

  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  // Fetch all purchases
  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/products/purchases/all');
      setPurchases(response.data);
    } catch (err) {
      setError('Failed to fetch purchases.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  // Compute filtered and sorted data
  const filteredPurchases = useMemo(() => {
    let data = [...purchases];

    // Filter based on user role if needed
    // Example: if non-admins have restricted access
    // if (!userInfo.isAdmin) {
    //   data = data.filter(purchase => purchase.someCondition);
    // }

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      data = data.filter(
        (purchase) =>
          purchase.invoiceNo.toLowerCase().includes(lowerSearch) ||
          purchase.sellerName.toLowerCase().includes(lowerSearch) ||
          purchase.sellerId.toLowerCase().includes(lowerSearch) ||
          purchase.purchaseId.toLowerCase().includes(lowerSearch)
      );
    }

    // Date Range Filter
    if (startDate) {
      const start = new Date(startDate);
      data = data.filter((purchase) => {
        const purchaseDate = new Date(purchase.billingDate || purchase.invoiceDate);
        return purchaseDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      data = data.filter((purchase) => {
        const purchaseDate = new Date(purchase.billingDate || purchase.invoiceDate);
        return purchaseDate <= end;
      });
    }

    // Seller Name Filter
    if (sellerNameFilter) {
      const lowerSeller = sellerNameFilter.toLowerCase();
      data = data.filter((purchase) =>
        purchase.sellerName.toLowerCase().includes(lowerSeller)
      );
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
    purchases,
    searchTerm,
    startDate,
    endDate,
    sellerNameFilter,
    sortField,
    sortOrder,
    userInfo.isAdmin,
  ]);

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);

  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPurchases.slice(start, start + itemsPerPage);
  }, [filteredPurchases, currentPage]);

  // Calculate top stats based on filtered data
  const stats = useMemo(() => {
    let totalAmount = 0;
    let grandTotal = 0;
    let transportationCharges = 0;
    let totalItems = 0;

    filteredPurchases.forEach((purchase) => {
      totalAmount += parseFloat(purchase.totals.totalPurchaseAmount) || 0;
      grandTotal += parseFloat(purchase.totals.grandTotalPurchaseAmount) || 0;
      transportationCharges += parseFloat(purchase.totals.transportationCharges) || 0;
      totalItems += purchase.items.length;
    });

    return {
      totalPurchases: filteredPurchases.length,
      totalAmount,
      grandTotal,
      transportationCharges,
      totalItems,
    };
  }, [filteredPurchases]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // PDF Generation for filtered purchases
  const handleGeneratePDF = async () => {
    setPdfLoading(true);
    try {
      const purchasesToPrint = filteredPurchases;

      // Prepare data for PDF
      const doc = new jsPDF();

      doc.text('Purchase Report', 14, 16);
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 22);

      const tableColumn = [
        'Invoice No',
        'Purchase ID',
        'Invoice Date',
        'Supplier Name',
        'Seller ID',
        'Seller GST',
        'Total Items',
        'Total Amount',
        'Grand Total',
        'Transportation Charges',
      ];
      const tableRows = [];

      purchasesToPrint.forEach((purchase) => {
        const purchaseData = [
          purchase.invoiceNo,
          purchase.purchaseId,
          new Date(purchase.billingDate || purchase.invoiceDate).toLocaleDateString(),
          purchase.sellerName,
          purchase.sellerId,
          purchase.sellerGst || 'N/A',
          purchase.items.length,
          '₹' + (parseFloat(purchase.totals.totalPurchaseAmount) || 0).toFixed(2),
          '₹' + (parseFloat(purchase.totals.grandTotalPurchaseAmount) || 0).toFixed(2),
          '₹' + (parseFloat(purchase.totals.transportationCharges) || 0).toFixed(2),
        ];
        tableRows.push(purchaseData);
      });

      doc.autoTable(tableColumn, tableRows, {
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [220, 53, 69] },
      });
      doc.save('Purchase_Report.pdf');

      setPdfLoading(false);
    } catch (err) {
      setPdfLoading(false);
      setError('Failed to generate PDF.');
      console.error(err);
    }
  };

  // Handle Generate Single Print (Purchase Invoice)
  const handleGenerateSinglePrint = async (purchase) => {
    setPdfLoading(true);
    try {
      const formData = {
        sellerId: purchase.sellerId || '',
        sellerName: purchase.sellerName || '',
        sellerAddress: purchase.sellerAddress || '',
        sellerGst: purchase.sellerGst || '',
        invoiceNo: purchase.invoiceNo || '',
        purchaseId: purchase.purchaseId || '',
        billingDate: purchase.billingDate || '',
        invoiceDate: purchase.invoiceDate || '',
        items: purchase.items.map((item) => ({
          itemId: item.itemId || '',
          name: item.name || '',
          brand: item.brand || '',
          category: item.category || '',
          quantity: item.quantity || 0,
          quantityInNumbers: item.quantityInNumbers || 0,
          pUnit: item.pUnit || '',
          sUnit: item.sUnit || '',
          psRatio: item.psRatio || 0,
          length: item.length || 0,
          breadth: item.breadth || 0,
          size: item.size || 0,
          billPartPrice: parseFloat(item.billPartPrice) || 0,
          cashPartPrice: parseFloat(item.cashPartPrice) || 0,
          billPartPriceInNumbers: parseFloat(item.billPartPriceInNumbers) || 0,
          cashPartPriceInNumbers: parseFloat(item.cashPartPriceInNumbers) || 0,
          allocatedOtherExpense: parseFloat(item.allocatedOtherExpense) || 0,
        })),
        totals: {
          billPartTotal: parseFloat(purchase.totals.billPartTotal) || 0,
          cashPartTotal: parseFloat(purchase.totals.cashPartTotal) || 0,
          amountWithoutGSTItems: parseFloat(purchase.totals.amountWithoutGSTItems) || 0,
          gstAmountItems: parseFloat(purchase.totals.gstAmountItems) || 0,
          cgstItems: parseFloat(purchase.totals.cgstItems) || 0,
          sgstItems: parseFloat(purchase.totals.sgstItems) || 0,
          amountWithoutGSTTransport: parseFloat(purchase.totals.amountWithoutGSTTransport) || 0,
          gstAmountTransport: parseFloat(purchase.totals.gstAmountTransport) || 0,
          cgstTransport: parseFloat(purchase.totals.cgstTransport) || 0,
          sgstTransport: parseFloat(purchase.totals.sgstTransport) || 0,
          unloadingCharge: parseFloat(purchase.totals.unloadingCharge) || 0,
          insurance: parseFloat(purchase.totals.insurance) || 0,
          damagePrice: parseFloat(purchase.totals.damagePrice) || 0,
          totalPurchaseAmount: parseFloat(purchase.totals.totalPurchaseAmount) || 0,
          totalOtherExpenses: parseFloat(purchase.totals.totalOtherExpenses) || 0,
          grandTotalPurchaseAmount: parseFloat(purchase.totals.grandTotalPurchaseAmount) || 0,
          transportationCharges: parseFloat(purchase.totals.transportationCharges) || 0,
        },
        transportationDetails: {
          logistic: {
            purchaseId: purchase.transportationDetails?.logistic?.purchaseId || '',
            invoiceNo: purchase.transportationDetails?.logistic?.invoiceNo || '',
            billId: purchase.transportationDetails?.logistic?.billId || '',
            companyGst: purchase.transportationDetails?.logistic?.companyGst || '',
            transportCompanyName:
              purchase.transportationDetails?.logistic?.transportCompanyName || '',
            transportationCharges:
              parseFloat(purchase.transportationDetails?.logistic?.transportationCharges) || 0,
            remark: purchase.transportationDetails?.logistic?.remark || '',
          },
          local: {
            purchaseId: purchase.transportationDetails?.local?.purchaseId || '',
            invoiceNo: purchase.transportationDetails?.local?.invoiceNo || '',
            billId: purchase.transportationDetails?.local?.billId || '',
            companyGst: purchase.transportationDetails?.local?.companyGst || '',
            transportCompanyName:
              purchase.transportationDetails?.local?.transportCompanyName || '',
            transportationCharges:
              parseFloat(purchase.transportationDetails?.local?.transportationCharges) || 0,
            remark: purchase.transportationDetails?.local?.remark || '',
          },
        },
      };

      const response = await api.post('/api/print/generate-purchase-invoice-html', formData);
      const htmlContent = response.data;

      const printWindow = window.open('', '', 'height=800,width=1200');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        alert('Popup blocked! Please allow popups for this website.');
      }

      setPdfLoading(false);
    } catch (error) {
      setPdfLoading(false);
      setError('Failed to generate purchase invoice.');
      console.error('Error:', error);
    }
  };

  // Handle Remove Purchase
  const handleRemove = async (id) => {
    if (window.confirm('Are you sure you want to remove this purchase?')) {
      try {
        await api.delete(`/api/products/purchases/delete/${id}`);
        setPurchases(purchases.filter((purchase) => purchase._id !== id));
      } catch (error) {
        setError('Error occurred while deleting the purchase.');
        console.error(error);
      }
    }
  };

  // Handle View Purchase Details
  const handleView = (purchase) => {
    setSelectedPurchase(purchase);
  };

  // Close Modal
  const closeModal = () => {
    setSelectedPurchase(null);
  };

  // Reset Filters
  const resetFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSellerNameFilter('');
    setSortField('');
    setSortOrder('asc');
    setShowSidebar(false);
  };

  // Toggle Sidebar
  const toggleSidebar = () => {
    setShowSidebar((prev) => !prev);
  };

  // Render Status Indicator or any other visual indicator if needed
  const renderStatusIndicator = (purchase) => {
    // Example: you can customize based on certain conditions
    return null; // Placeholder
  };

  // Render Purchase Card for Mobile
  const renderCard = (purchase) => (
    <div
      key={purchase.invoiceNo}
      className="bg-white rounded-lg shadow-md p-6 mb-4 transition-transform transform hover:scale-105 duration-200"
    >
      <div className="flex justify-between items-center">
        <p
          onClick={() => navigate(`/purchases/${purchase._id}`)}
          className={`text-md flex cursor-pointer font-bold text-red-600`}
        >
          {purchase.invoiceNo}
        </p>
        <p className="text-gray-600 text-xs">Purchase ID: {purchase.purchaseId}</p>
      </div>
      <p className="text-gray-600 text-xs mt-2">Supplier: {purchase.sellerName}</p>
      <p className="text-gray-600 text-xs mt-1">Seller ID: {purchase.sellerId}</p>
      <p className="text-gray-600 text-xs mt-1">Seller GST: {purchase.sellerGst || 'N/A'}</p>
      <p className="text-gray-600 text-xs mt-1">
        Invoice Date: {new Date(purchase.billingDate || purchase.invoiceDate).toLocaleDateString()}
      </p>
      <p className="text-gray-600 text-xs mt-1">Total Items: {purchase.items.length}</p>
      <div className="flex justify-between">
        <p className="text-gray-600 text-xs font-bold mt-1">
          Total Amount: ₹{(parseFloat(purchase.totals.totalPurchaseAmount) || 0).toFixed(2)}
        </p>
        <p className="text-gray-400 italic text-xs mt-1">
          Grand Total: ₹{(parseFloat(purchase.totals.grandTotalPurchaseAmount) || 0).toFixed(2)}
        </p>
      </div>
      <div className="flex justify-between">
        <p className="text-gray-600 text-xs font-bold mt-1">
          Transportation Charges: ₹{purchase.totals.transportationCharges || 0}
        </p>
        <p className="text-gray-400 italic text-xs mt-1">
          Last Edited: {new Date(purchase.updatedAt ? purchase.updatedAt : purchase.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex mt-4 text-xs space-x-2">
        {userInfo.isAdmin && (
          <button
            onClick={() => navigate(`/purchase/edit/${purchase._id}`)}
            className="bg-red-500 text-white px-3 font-bold py-1 rounded hover:bg-red-600 flex items-center"
          >
            <i className="fa fa-pen mr-2"></i> Edit
          </button>
        )}
        {userInfo.isAdmin && (
          <button
            onClick={() => handleGenerateSinglePrint(purchase)}
            className="bg-red-500 text-white px-3 font-bold py-1 rounded hover:bg-red-600 flex items-center"
          >
            <i className="fa fa-print mr-2"></i>
          </button>
        )}
        <button
          onClick={() => handleView(purchase)}
          className="bg-red-500 text-white px-3 font-bold py-1 rounded hover:bg-red-600 flex items-center"
        >
          <i className="fa fa-eye mr-2"></i> View
        </button>
        {userInfo.isAdmin && (
          <button
            onClick={() => handleRemove(purchase._id)}
            className="bg-red-500 text-white px-3 font-bold py-1 rounded hover:bg-red-600 flex items-center"
          >
            <i className="fa fa-trash mr-2"></i> Delete
          </button>
        )}
      </div>
    </div>
  );

  // Render Skeleton for Table
  const renderTableSkeleton = () => {
    const skeletonRows = Array.from({ length: itemsPerPage }, (_, index) => index);
    return (
      <table className="w-full text-sm text-gray-500 bg-white shadow-md rounded-lg overflow-hidden">
        <thead className="bg-gray-200">
          <tr className="divide-y text-xs">
            <th className="px-2 py-2">Invoice No</th>
            <th className="px-2 py-2">Purchase ID</th>
            <th className="px-2 py-2">Invoice Date</th>
            <th className="px-2 py-2">Supplier Name</th>
            <th className="px-2 py-2">Seller ID</th>
            <th className="px-2 py-2">Seller GST</th>
            <th className="px-2 py-2">Total Items</th>
            <th className="px-2 py-2">Total Amount</th>
            <th className="px-2 py-2">Grand Total</th>
            <th className="px-2 py-2">Transportation Charges</th>
            <th className="px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {skeletonRows.map((row) => (
            <tr key={row} className="hover:bg-gray-100 divide-y divide-x">
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

  // Render Skeleton for Cards
  const renderCardSkeleton = () => {
    const skeletonCards = Array.from({ length: itemsPerPage }, (_, index) => index);
    return skeletonCards.map((card) => (
      <div
        key={card}
        className="bg-white rounded-lg shadow-md p-6 mb-4 animate-pulse"
      >
        <div className="flex justify-between items-center">
          <Skeleton height={20} width={`60%`} />
          <Skeleton height={15} width={`30%`} />
        </div>
        <p className="text-gray-600 text-xs mt-2">
          <Skeleton height={10} width={`80%`} />
        </p>
        <p className="text-gray-600 text-xs mt-1">
          <Skeleton height={10} width={`60%`} />
        </p>
        <p className="text-gray-600 text-xs mt-1">
          <Skeleton height={10} width={`50%`} />
        </p>
        <p className="text-gray-600 text-xs mt-1">
          <Skeleton height={10} width={`70%`} />
        </p>
        <div className="flex justify-between">
          <p className="text-gray-600 text-xs font-bold mt-1">
            <Skeleton height={10} width={`40%`} />
          </p>
          <p className="text-gray-400 italic text-xs mt-1">
            <Skeleton height={10} width={`30%`} />
          </p>
        </div>
        <div className="flex justify-between">
          <p className="text-gray-600 text-xs font-bold mt-1">
            <Skeleton height={10} width={`50%`} />
          </p>
          <p className="text-gray-400 italic text-xs mt-1">
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

  return (
    <>
      {/* PDF Loading Spinner */}
      {pdfLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="flex flex-col items-center">
            <i className="fa fa-spinner fa-spin text-white text-4xl mb-4"></i>
            <p className="text-white text-xs">Generating...</p>
          </div>
        </div>
      )}

      {/* Sidebar for mobile filters */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 flex justify-end z-40 ${
          showSidebar ? 'block' : 'hidden'
        } md:hidden`}
        onClick={() => setShowSidebar(false)}
      ></div>
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-md p-4 w-64 z-50 transform ${
          showSidebar ? 'translate-x-0' : 'translate-x-full'
        } transition-transform md:translate-x-0 md:static md:hidden md:p-0`}
      >
        <h2 className="text-md font-bold text-red-600 mb-4">Filters & Sorting</h2>
        {/* Search */}
        <div className="mb-4">
          <label className="block text-xs font-bold mb-1" htmlFor="search">
            Search
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search by Invoice No, Supplier, Seller ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        {/* Date Range Filter */}
        <div className="mb-4">
          <label className="block text-xs font-bold mb-1" htmlFor="startDate">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-bold mb-1" htmlFor="endDate">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        {/* Seller Name Filter */}
        <div className="mb-4">
          <label className="block text-xs font-bold mb-1" htmlFor="sellerNameFilter">
            Seller Name
          </label>
          <input
            type="text"
            id="sellerNameFilter"
            value={sellerNameFilter}
            onChange={(e) => setSellerNameFilter(e.target.value)}
            className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Enter seller name"
          />
        </div>

        {/* Reset Filters */}
        <div className="flex justify-end mt-4">
          <button
            onClick={resetFilters}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-xs font-bold"
          >
         < i className='fa fa-refresh' />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 relative">
        <div onClick={() => navigate('/')} className="text-center cursor-pointer">
          <h2 className="text-md font-bold text-red-600">KK TRADING</h2>
          <p className="text-gray-400 text-xs font-bold">
            All Purchases Information and Updation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleSidebar}
            className="md:hidden bg-red-500 text-white p-2 rounded flex items-center"
          >
            <FaFilter className="mr-1" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-center mb-4 text-xs">{error}</p>
      )}

      {/* Stats */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap justify-center sm:justify-start gap-4">
          <div className="bg-white p-4 rounded-lg shadow-md flex-1 min-w-[150px]">
            <p className="text-xs font-bold text-red-600">Total Purchases</p>
            <p className="text-xs text-gray-500">{stats.totalPurchases} purchases</p>
            <p className="text-sm font-bold text-gray-700">Rs. {stats.totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md flex-1 min-w-[150px]">
            <p className="text-xs font-bold text-blue-600">Grand Total</p>
            <p className="text-xs text-gray-500">Rs. {stats.grandTotal.toFixed(2)}</p>
            <p className="text-sm font-bold text-gray-700">Rs. {stats.grandTotal.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md flex-1 min-w-[150px]">
            <p className="text-xs font-bold text-green-600">Transportation Charges</p>
            <p className="text-xs text-gray-500">Rs. {stats.transportationCharges.toFixed(2)}</p>
            <p className="text-sm font-bold text-gray-700">Rs. {stats.transportationCharges.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md flex-1 min-w-[150px]">
            <p className="text-xs font-bold text-yellow-600">Total Items</p>
            <p className="text-xs text-gray-500">{stats.totalItems} items</p>
            <p className="text-sm font-bold text-gray-700">{stats.totalItems}</p>
          </div>
        </div>
      </div>

      {/* Filters and Sorting for Desktop */}
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
              placeholder="Search by Invoice No, Supplier, Seller ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Date Range Filter */}
          <div className="min-w-[150px]">
            <label className="block text-xs font-bold mb-1" htmlFor="startDate">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-bold mb-1" htmlFor="endDate">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Seller Name Filter */}
          <div className="min-w-[200px]">
            <label className="block text-xs font-bold mb-1" htmlFor="sellerNameFilter">
              Seller Name
            </label>
            <input
              type="text"
              id="sellerNameFilter"
              value={sellerNameFilter}
              onChange={(e) => setSellerNameFilter(e.target.value)}
              className="w-full border border-red-300 rounded px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Enter seller name"
            />
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-xs font-bold"
            >
             <i className='fa fa-refresh' />
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div>
          {/* Table Skeleton for Large Screens */}
          <div className="hidden md:block">
            {renderTableSkeleton()}
          </div>
          {/* Card Skeleton for Small Screens */}
          <div className="md:hidden">
            {renderCardSkeleton()}
          </div>
        </div>
      ) : (
        <>
          {/* Purchases List */}
          {filteredPurchases.length === 0 ? (
            <p className="text-center text-gray-500 text-xs">
              No purchases match your search and filter criteria.
            </p>
          ) : (
            <>
              {/* Table for Large Screens */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-gray-500 bg-white shadow-md rounded-lg overflow-hidden">
                  <thead className="bg-red-600 text-xs text-white">
                    <tr className="divide-y">
                      <th className="px-2 py-2">Invoice No</th>
                      <th className="px-2 py-2">Purchase ID</th>
                      <th className="px-2 py-2">Invoice Date</th>
                      <th className="px-2 py-2">Supplier Name</th>
                      <th className="px-2 py-2">Seller ID</th>
                      <th className="px-2 py-2">Seller GST</th>
                      <th className="px-2 py-2">Total Items</th>
                      <th className="px-2 py-2">Total Amount</th>
                      <th className="px-2 py-2">Grand Total</th>
                      <th className="px-2 py-2">Transportation Charges</th>
                      <th className="px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPurchases.map((purchase) => (
                      <tr
                        key={purchase.invoiceNo}
                        className="hover:bg-gray-100 divide-y divide-x"
                      >
                        {/* Invoice No with sorting */}
                        <td
                          onClick={() => navigate(`/purchases/${purchase._id}`)}
                          className="px-2 py-2 cursor-pointer flex text-xs font-bold text-red-600"
                        >
                          {purchase.invoiceNo}
                        </td>

                        {/* Purchase ID */}
                        <td className="px-2 py-2 text-xs">
                          {purchase.purchaseId}
                        </td>

                        {/* Invoice Date with sorting */}
                        <td
                          className="px-2 py-2 text-xs cursor-pointer"
                          onClick={() => {
                            setSortField('invoiceDate');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          {new Date(purchase.billingDate || purchase.invoiceDate).toLocaleDateString()}
                          {sortField === 'invoiceDate' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </td>

                        {/* Supplier Name with sorting */}
                        <td
                          className="px-2 py-2 text-xs cursor-pointer"
                          onClick={() => {
                            setSortField('sellerName');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          {purchase.sellerName}
                          {sortField === 'sellerName' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </td>

                        {/* Seller ID with sorting */}
                        <td
                          className="px-2 py-2 text-xs cursor-pointer"
                          onClick={() => {
                            setSortField('sellerId');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          {purchase.sellerId}
                          {sortField === 'sellerId' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </td>

                        {/* Seller GST */}
                        <td className="px-2 py-2 text-xs">
                          {purchase.sellerGst || 'N/A'}
                        </td>

                        {/* Total Items */}
                        <td
                          className="px-2 py-2 text-xs cursor-pointer"
                          onClick={() => {
                            setSortField('items.length');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          {purchase.items.length}
                          {sortField === 'items.length' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </td>

                        {/* Total Amount with sorting */}
                        <td
                          className="px-2 py-2 text-xs cursor-pointer"
                          onClick={() => {
                            setSortField('totals.totalPurchaseAmount');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          ₹{(parseFloat(purchase.totals.totalPurchaseAmount) || 0).toFixed(2)}
                          {sortField === 'totals.totalPurchaseAmount' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </td>

                        {/* Grand Total with sorting */}
                        <td
                          className="px-2 py-2 text-xs cursor-pointer"
                          onClick={() => {
                            setSortField('totals.grandTotalPurchaseAmount');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          ₹{(parseFloat(purchase.totals.grandTotalPurchaseAmount) || 0).toFixed(2)}
                          {sortField === 'totals.grandTotalPurchaseAmount' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </td>

                        {/* Transportation Charges with sorting */}
                        <td
                          className="px-2 py-2 text-xs cursor-pointer"
                          onClick={() => {
                            setSortField('totals.transportationCharges');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          ₹{(parseFloat(purchase.totals.transportationCharges) || 0).toFixed(2)}
                          {sortField === 'totals.transportationCharges' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-2 text-xs">
                          <div className="flex mt-2 text-xs space-x-1">
                            {userInfo.isAdmin && (
                              <button
                                onClick={() => navigate(`/purchase/edit/${purchase._id}`)}
                                className="bg-red-500 text-white px-2 font-bold py-1 rounded hover:bg-red-600 flex items-center"
                              >
                                <i className="fa fa-pen mr-1"></i> Edit
                              </button>
                            )}
                            {userInfo.isAdmin && (
                              <button
                                onClick={() => handleGenerateSinglePrint(purchase)}
                                className="bg-red-500 text-white px-2 font-bold py-1 rounded hover:bg-red-600 flex items-center"
                              >
                                <i className="fa fa-print mr-1"></i>
                              </button>
                            )}
                            <button
                              onClick={() => handleView(purchase)}
                              className="bg-red-500 text-white px-2 font-bold py-1 rounded hover:bg-red-600 flex items-center"
                            >
                              <i className="fa fa-eye mr-1"></i> View
                            </button>
                            {userInfo.isAdmin && (
                              <button
                                onClick={() => handleRemove(purchase._id)}
                                className="bg-red-500 text-white px-2 font-bold py-1 rounded hover:bg-red-600 flex items-center"
                              >
                                <i className="fa fa-trash mr-1"></i> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards for Small Screens */}
              <div className="md:hidden">
                {paginatedPurchases.map(renderCard)}
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 text-xs font-bold py-2 rounded-lg ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
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
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Modal for Viewing Purchase Details */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl"
              onClick={closeModal}
            >
              &times;
            </button>
            <div className="mt-2">
              <h2 className="text-lg font-bold text-red-600 mb-4 flex items-center space-x-2">
                <FaUser className="text-red-600" />
                <span>Purchase Details - {selectedPurchase.invoiceNo}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="mb-1">
                    Supplier Name:{' '}
                    <span className="text-gray-700">{selectedPurchase.sellerName}</span>
                  </p>
                  <p className="mb-1">
                    Seller ID:{' '}
                    <span className="text-gray-700">{selectedPurchase.sellerId}</span>
                  </p>
                  <p className="mb-1">
                    Seller GST:{' '}
                    <span className="text-gray-700">{selectedPurchase.sellerGst || 'N/A'}</span>
                  </p>
                  <p className="mb-1">
                    Invoice Date:{' '}
                    <span className="text-gray-700">
                      {new Date(selectedPurchase.billingDate || selectedPurchase.invoiceDate).toLocaleString()}
                    </span>
                  </p>
                  <p className="mb-1">
                    Purchase ID:{' '}
                    <span className="text-gray-700">{selectedPurchase.purchaseId}</span>
                  </p>
                  <p className="mb-1">
                    Seller Address:{' '}
                    <span className="text-gray-700">{selectedPurchase.sellerAddress || 'N/A'}</span>
                  </p>
                </div>
                <div>
                  <p className="mb-1">
                    Total Purchase Amount:{' '}
                    <span className="text-gray-700">
                      ₹{(parseFloat(selectedPurchase.totals.totalPurchaseAmount) || 0).toFixed(2)}
                    </span>
                  </p>
                  <p className="mb-1">
                    Grand Total Purchase Amount:{' '}
                    <span className="text-gray-700">
                      ₹{(parseFloat(selectedPurchase.totals.grandTotalPurchaseAmount) || 0).toFixed(2)}
                    </span>
                  </p>
                  <p className="mb-1">
                    Transportation Charges:{' '}
                    <span className="text-gray-700">
                      ₹{parseFloat(selectedPurchase.totals.transportationCharges) || 0}
                    </span>
                  </p>
                  <p className="mb-1">
                    Unloading Charge:{' '}
                    <span className="text-gray-700">
                      ₹{parseFloat(selectedPurchase.totals.unloadingCharge) || 0}
                    </span>
                  </p>
                  <p className="mb-1">
                    Insurance:{' '}
                    <span className="text-gray-700">
                      ₹{parseFloat(selectedPurchase.totals.insurance) || 0}
                    </span>
                  </p>
                  <p className="mb-1">
                    Damage Price:{' '}
                    <span className="text-gray-700">
                      ₹{parseFloat(selectedPurchase.totals.damagePrice) || 0}
                    </span>
                  </p>
                  <p className="mb-1">
                    Total Other Expenses:{' '}
                    <span className="text-gray-700">
                      ₹{parseFloat(selectedPurchase.totals.totalOtherExpenses) || 0}
                    </span>
                  </p>
                </div>
              </div>

              <h3 className="text-sm font-bold text-red-600 mt-5">
                Items: {selectedPurchase.items.length}
              </h3>
              <div className="overflow-x-auto my-4">
                <table className="w-full text-sm text-gray-500">
                  <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                    <tr>
                      <th className="px-4 py-3">Sl</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-2 py-3 text-center">ID</th>
                      <th className="px-2 py-3">Qty</th>
                      <th className="px-2 py-3">Unit</th>
                      <th className="px-2 py-3">Bill Price</th>
                      <th className="px-2 py-3">Cash Price</th>
                      <th className="px-2 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items.map((item, index) => (
                      <tr
                        key={index}
                        className="bg-white border-b hover:bg-gray-50"
                      >
                        <th
                          scope="row"
                          className="px-2 py-4 text-xs font-medium text-gray-900 whitespace-nowrap"
                        >
                          {index + 1}
                        </th>
                        <td className="px-2 py-4 text-xs text-gray-900">
                          {item.name.length > 15
                            ? `${item.name.slice(0, 15)}...`
                            : item.name}
                        </td>
                        <td className="px-2 py-4 text-xs text-center">
                          {item.itemId || 'N/A'}
                        </td>
                        <td className="px-2 py-4 text-xs">
                          {item.quantity}
                        </td>
                        <td className="px-2 py-4 text-xs">
                          {item.pUnit || 'N/A'}
                        </td>
                        <td className="px-2 py-4 text-xs">
                          ₹{(item.billPartPrice || 0).toFixed(2)}
                        </td>
                        <td className="px-2 py-4 text-xs">
                          ₹{(item.cashPartPrice || 0).toFixed(2)}
                        </td>
                        <td className="px-2 py-4 text-xs">
                          ₹{((item.quantity || 0) * (item.billPartPrice + item.cashPartPrice)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="text-right mt-4">
                <p className="text-xs mb-1">
                  Bill Part Total:{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.billPartTotal) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  Cash Part Total:{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.cashPartTotal) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  Amount Without GST (Items):{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.amountWithoutGSTItems) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  GST Amount (Items):{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.gstAmountItems) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  CGST (Items):{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.cgstItems) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  SGST (Items):{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.sgstItems) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  Amount Without GST (Transport):{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.amountWithoutGSTTransport) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  GST Amount (Transport):{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.gstAmountTransport) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  CGST (Transport):{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.cgstTransport) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  SGST (Transport):{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.sgstTransport) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  Unloading Charge:{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.unloadingCharge) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  Insurance:{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.insurance) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  Damage Price:{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.damagePrice) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  Total Other Expenses:{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.totalOtherExpenses) || 0).toFixed(2)}
                  </span>
                </p>
                <p className="text-xs mb-1">
                  Grand Total Purchase Amount:{' '}
                  <span className="text-gray-600">
                    ₹{(parseFloat(selectedPurchase.totals.grandTotalPurchaseAmount) || 0).toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PurchaseList;
