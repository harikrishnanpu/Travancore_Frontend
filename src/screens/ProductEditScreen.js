import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { detailsProduct, updateProduct } from '../actions/productActions';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { PRODUCT_UPDATE_RESET } from '../constants/productConstants';
import api from './api';

export default function ProductEditScreen(props) {
  const navigate = useNavigate();
  const params = useParams();
  const { id: productId } = params;
  
  const [name, setName] = useState('');
  const [itemId, setItemId] = useState('');
  const [seller, setSeller] = useState('');
  const [image, setImage] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [pUnit, setPUnit] = useState('');
  const [sUnit, setSUnit] = useState('');
  const [psRatio, setPsRatio] = useState('');
  const [length, setLength] = useState('');
  const [breadth, setBreadth] = useState('');
  const [actLength, setActLength] = useState('');
  const [actBreadth, setActBreadth] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [billPartPrice, setBillPartPrice] = useState('');
  const [cashPartPrice, setCashPartPrice] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [type, setType] = useState('');
  const [countInStock, setCountInStock] = useState('');
  const [rating, setRating] = useState('');
  const [imageError, setImageError] = useState(false);

  const productDetails = useSelector((state) => state.productDetails);
  const { loading, error, product } = productDetails;

  const productUpdate = useSelector((state) => state.productUpdate);
  const {
    loading: loadingUpdate,
    error: errorUpdate,
    success: successUpdate,
  } = productUpdate;

  const dispatch = useDispatch();
  useEffect(() => {
    if (successUpdate) {
      navigate('/search/name');
    }
    if (!product || product._id !== productId || successUpdate) {
      dispatch({ type: PRODUCT_UPDATE_RESET });
      dispatch(detailsProduct(productId));
    } else {
      setName(product.name);
      setItemId(product.item_id);
      setSeller(product.seller);
      setImage(product.image);
      setBrand(product.brand);
      setCategory(product.category);
      setDescription(product.description);
      setPUnit(product.pUnit);
      setSUnit(product.sUnit);
      setPsRatio(product.psRatio);
      setLength(product.length);
      setBreadth(product.breadth);
      setActLength(product.actLength);
      setActBreadth(product.actBreadth);
      setSize(product.size);
      setUnit(product.unit);
      setPrice(product.price);
      setBillPartPrice(product.billPartPrice);
      setCashPartPrice(product.cashPartPrice);
      setSellerAddress(product.sellerAddress);
      setType(product.type);
      setCountInStock(product.countInStock);
      setRating(product.rating);
    }
  }, [product, dispatch, productId, successUpdate, navigate]);

  const submitHandler = () => {
    dispatch(
      updateProduct({
        _id: productId,
        name,
        itemId,
        seller,
        image,
        brand,
        category,
        description,
        pUnit,
        sUnit,
        psRatio,
        length,
        breadth,
        actLength,
        actBreadth,
        size,
        unit,
        price,
        billPartPrice,
        cashPartPrice,
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
      setLoadingUpload(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl p-4">
      {/* Header Section */}
      <div className="flex items-center justify-between bg-gradient-to-l from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-4 relative">
        <div onClick={() => { navigate('/'); }} className="text-center cursor-pointer">
          <h2 className="text-md font-bold text-red-600">KK TRADING</h2>
          <p className="text-gray-400 text-xs font-bold">Product Updations</p>
        </div>
        <i className="fa fa-box text-gray-500" />
      </div>

      {/* Update Button */}
      <div className="text-right mb-4">
        <button
          onClick={() => submitHandler()}
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
          <>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Name */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Item ID */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Item ID</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                />
              </div>

              {/* Brand */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Brand</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>

              {/* Category */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Category</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="form-group flex flex-col md:col-span-2">
                <label className="text-xs text-gray-500 mb-1">Description</label>
                <input
                type='text'
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Price */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Price</label>
                <input
                  type="number"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              {/* Count In Stock */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Count In Stock</label>
                <input
                  type="number"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={countInStock}
                  onChange={(e) => setCountInStock(e.target.value)}
                />
              </div>

              {/* Seller */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Seller</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                />
              </div>

              {/* Seller Address */}
              <div className="form-group flex flex-col md:col-span-2">
                <label className="text-xs text-gray-500 mb-1">Seller Address</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={sellerAddress}
                  onChange={(e) => setSellerAddress(e.target.value)}
                />
              </div>

              {/* Type */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Type</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                />
              </div>

              {/* pUnit */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">P Unit</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={pUnit}
                  onChange={(e) => setPUnit(e.target.value)}
                />
              </div>

              {/* sUnit */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">S Unit</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={sUnit}
                  onChange={(e) => setSUnit(e.target.value)}
                />
              </div>

              {/* psRatio */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">P S Ratio</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={psRatio}
                  onChange={(e) => setPsRatio(e.target.value)}
                />
              </div>

              {/* Length */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Length</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                />
              </div>

              {/* Breadth */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Breadth</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={breadth}
                  onChange={(e) => setBreadth(e.target.value)}
                />
              </div>

              {/* Act Length */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Actual Length</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={actLength}
                  onChange={(e) => setActLength(e.target.value)}
                />
              </div>

              {/* Act Breadth */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Actual Breadth</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={actBreadth}
                  onChange={(e) => setActBreadth(e.target.value)}
                />
              </div>

              {/* Size */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Size</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </div>

              {/* Unit */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Unit</label>
                <input
                  type="text"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>

              {/* Bill Part Price */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Bill Part Price</label>
                <input
                  type="number"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={billPartPrice}
                  onChange={(e) => setBillPartPrice(e.target.value)}
                />
              </div>

              {/* Cash Part Price */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Cash Part Price</label>
                <input
                  type="number"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={cashPartPrice}
                  onChange={(e) => setCashPartPrice(e.target.value)}
                />
              </div>

              {/* Rating */}
              <div className="form-group flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Rating</label>
                <input
                  type="number"
                  className="w-full bg-gray-100 text-xs rounded border border-gray-300 focus:border-indigo-500 focus:bg-white px-2 py-1 outline-none"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  step="0.1"
                  min="0"
                  max="5"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
