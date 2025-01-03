// src/screens/ProductEditScreen.jsx

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { detailsProduct, updateProduct } from '../actions/productActions';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { PRODUCT_UPDATE_RESET } from '../constants/productConstants';
import api from './api';
import ErrorModal from '../components/ErrorModal'; // Ensure correct import path

export default function ProductEditScreen(props) {
  const navigate = useNavigate();
  const params = useParams();
  const { id: productId } = params;

  // State Variables with Consistent Naming
  const [name, setName] = useState('');
  const [item_id, setItemId] = useState('');
  const [seller, setSeller] = useState('');
  const [image, setImage] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [sellingUnit, setSellingUnit] = useState('');
  const [psRatio, setPsRatio] = useState('');

  const [size, setSize] = useState('');
  const [unit, setUnit] = useState('');

  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [gst, setGst] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const [billPartPrice, setBillPartPrice] = useState('');

  const [sellerAddress, setSellerAddress] = useState('');
  const [type, setType] = useState('');
  const [countInStock, setCountInStock] = useState('');
  const [rating, setRating] = useState('');

  const [imageError, setImageError] = useState(false);

  // Modal States
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [success, setSuccess] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState('');

  const productDetails = useSelector((state) => state.productDetails);
  const { loading, error, product } = productDetails;

  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  const productUpdate = useSelector((state) => state.productUpdate);
  const {
    loading: loadingUpdate,
    error: errorUpdate,
    success: successUpdate,
  } = productUpdate;

  const dispatch = useDispatch();

  useEffect(() => {
    if (successUpdate) {
      setSuccess(true);
      dispatch({ type: PRODUCT_UPDATE_RESET });
    }

    if (!product || product._id !== productId || successUpdate) {
      dispatch({ type: PRODUCT_UPDATE_RESET });
      dispatch(detailsProduct(productId));
    } else {
      // Populate form fields with existing product data
      setName(product.name || '');
      setItemId(product.item_id || '');
      setSeller(product.seller || '');
      setImage(product.image || '');
      setBrand(product.brand || '');
      setCategory(product.category || '');
      setDescription(product.description || '');
      setPurchaseUnit(product.purchaseUnit || '');
      setSellingUnit(product.sellingUnit || '');
      setPsRatio(product.psRatio || 1);
      setSize(product.size || '');
      setUnit(product.unit || '');
      setPrice(product.price || 0);
      setMrp(product.mrp || 0);
      setGst(product.gst || 0);
      setExpiryDate(product.expiryDate ? product.expiryDate.substring(0, 10) : '');
      setBillPartPrice(product.billPartPrice || 0);
      setSellerAddress(product.sellerAddress || '');
      setType(product.type || '');
      setCountInStock(product.countInStock || 0);
      setRating(product.rating || 0);
    }
  }, [product, dispatch, productId, successUpdate, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    // Basic front-end validation
    if (!name || !item_id || !brand || !category || countInStock === '') {
      setErrorMessage('Please fill in all required fields.');
      setShowErrorModal(true);
      return;
    }

    // Dispatch the updateProduct action with updated product data
    dispatch(
      updateProduct({
        _id: productId,
        name,
        itemId: item_id,
        seller,
        image,
        brand,
        category,
        description,
        pUnit: purchaseUnit,
        sUnit: sellingUnit,
        psRatio,
        size,
        unit,
        price,
        mrp,
        gst,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        billPartPrice,
        sellerAddress,
        type,
        countInStock,
        rating,
      })
    );
  };

  const [loadingUpload, setLoadingUpload] = useState(false);
  const [errorUpload, setErrorUpload] = useState('');

  const uploadFileHandler = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default');
    setLoadingUpload(true);
    try {
      const response = await api.post(
        'https://api.cloudinary.com/v1_1/dqniuczkg/image/upload',
        formData
      );
      setImage(response.data.secure_url);
      setLoadingUpload(false);
    } catch (error) {
      setErrorUpload(error.message);
      setShowErrorModal(true);
      setErrorMessage(error.message);
      setLoadingUpload(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl p-4">
      {/* Header Section */}
      <div className="flex items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 relative">
        <div onClick={() => navigate('/')} className="text-center cursor-pointer">
          <h2 className="text-md font-bold text-red-600">Travancore Backers</h2>
          <p className="text-gray-400 text-xs font-bold">Product Updations</p>
        </div>
        <i className="fa fa-box text-gray-500" />
      </div>

      {/* Success Modal */}
      {success && 
        navigate('/search/name')
      }

      {/* Error Modal */}
      {showErrorModal && (
        <ErrorModal
          message={errorMessage || errorUpdate || error}
          onClose={() => setShowErrorModal(false)}
        />
      )}

      {/* Update Button */}
      <div className="text-right mb-4">
        <button
          onClick={submitHandler}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-6 text-xs rounded"
        >
          Update
        </button>
      </div>

      {/* Form Section */}
      <div className="form bg-white shadow-md rounded-lg p-4">
        {loadingUpdate && <LoadingBox />}
        {errorUpdate && <MessageBox variant="danger">{errorUpdate}</MessageBox>}
        {loading ? (
          <LoadingBox />
        ) : error ? (
          <MessageBox variant="danger">{error}</MessageBox>
        ) : (
          <form onSubmit={submitHandler}>
            {/* Image Upload Section */}
            <div className="relative mb-4">
              <div className="mx-auto h-36 bg-gray-50 rounded-lg flex items-center justify-center relative overflow-hidden">
                {loadingUpload ? (
                  <LoadingBox />
                ) : image && !imageError ? (
                  <img
                    src={image}
                    onError={() => setImageError(true)}
                    alt="product"
                    className="object-cover rounded-lg w-full h-full"
                  />
                ) : (
                  <div className="flex justify-center">
                    <p className="text-gray-400 animate-pulse text-xs">No image</p>
                  </div>
                )}
                <label
                  htmlFor="imageFile"
                  className="absolute bottom-2 right-2 font-bold text-xs bg-red-500 text-white px-2 py-1 rounded-lg cursor-pointer"
                >
                  <i className="fa fa-edit" />
                </label>
                <input
                  type="file"
                  id="imageFile"
                  className="hidden"
                  onChange={uploadFileHandler}
                />
                {errorUpload && <MessageBox variant="danger">{errorUpload}</MessageBox>}
              </div>
            </div>

            {/* Input Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Item ID */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="item_id">Item ID *</label>
                <input
                  type="text"
                  id="item_id"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={item_id}
                  onChange={(e) => setItemId(e.target.value)}
                  required
                />
              </div>

              {/* Brand */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="brand">Brand *</label>
                <input
                  type="text"
                  id="brand"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  required
                />
              </div>

              {/* Category */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="category">Category *</label>
                <input
                  type="text"
                  id="category"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="form-group flex flex-col md:col-span-2">
                <label className="text-xs text-gray-500 mb-1" htmlFor="description">Description</label>
                <textarea
                  id="description"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                ></textarea>
              </div>

              {/* Price */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="price">Price *</label>
                <input
                  type="number"
                  id="price"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              {/* MRP */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="mrp">MRP *</label>
                <input
                  type="number"
                  id="mrp"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              {/* GST */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="gst">GST (%) *</label>
                <input
                  type="number"
                  id="gst"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Expiry Date */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="expiryDate">Expiry Date</label>
                <input
                  type="date"
                  id="expiryDate"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>

              {/* Count In Stock */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="countInStock">Count In Stock *</label>
                <input
                  type="number"
                  id="countInStock"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={countInStock}
                  onChange={(e) => setCountInStock(e.target.value)}
                  required
                  min="0"
                />
              </div>

              {/* Seller */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="seller">Seller</label>
                <input
                  type="text"
                  id="seller"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                />
              </div>

              {/* Seller Address */}
              <div className="form-group flex flex-col md:col-span-2">
                <label className="text-xs text-gray-500 mb-1" htmlFor="sellerAddress">Seller Address</label>
                <input
                  type="text"
                  id="sellerAddress"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={sellerAddress}
                  onChange={(e) => setSellerAddress(e.target.value)}
                />
              </div>

              {/* Type */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="type">Type</label>
                <input
                  type="text"
                  id="type"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                />
              </div>

              {/* Purchase Unit */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="purchaseUnit">Purchase Unit</label>
                <input
                  type="text"
                  id="purchaseUnit"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={purchaseUnit}
                  onChange={(e) => setPurchaseUnit(e.target.value)}
                />
              </div>

              {/* Selling Unit */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="sellingUnit">Selling Unit</label>
                <input
                  type="text"
                  id="sellingUnit"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={sellingUnit}
                  onChange={(e) => setSellingUnit(e.target.value)}
                />
              </div>

              {/* PS Ratio */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="psRatio">PS Ratio</label>
                <input
                  type="number"
                  id="psRatio"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={psRatio}
                  onChange={(e) => setPsRatio(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Size */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="size">Size</label>
                <input
                  type="text"
                  id="size"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </div>

              {/* Unit */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="unit">Unit</label>
                <input
                  type="text"
                  id="unit"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>

              {/* Bill Part Price */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="billPartPrice">Bill Part Price</label>
                <input
                  type="number"
                  id="billPartPrice"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={billPartPrice}
                  onChange={(e) => setBillPartPrice(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Rating */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1" htmlFor="rating">Rating</label>
                <input
                  type="number"
                  id="rating"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  step="0.1"
                  min="0"
                  max="5"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-right mt-4">
              <button
                type="submit"
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-6 rounded"
              >
                Update
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
