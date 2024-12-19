// src/screens/ProductEditScreen.jsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { detailsProduct, updateProduct } from '../actions/productActions';
import { PRODUCT_UPDATE_RESET } from '../constants/productConstants';
import api from './api';

import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';

import {
  TextField,
  Button,
  IconButton,
  Card,
  CardMedia,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

import SuccessModal from '../components/successModalnew';
import ErrorModal from '../components/ErrorModal';

export default function ProductEditScreen() {
  const navigate = useNavigate();
  const params = useParams();
  const { id: productId } = params;

  const dispatch = useDispatch();

  // Form Fields State
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

  const [imageError, setImageError] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [errorUpload, setErrorUpload] = useState('');

  // Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Redux State
  const productDetails = useSelector((state) => state.productDetails);
  const { loading, error, product } = productDetails;

  const productUpdate = useSelector((state) => state.productUpdate);
  const {
    loading: loadingUpdate,
    error: errorUpdate,
    success: successUpdate,
  } = productUpdate;

  useEffect(() => {
    if (successUpdate) {
      setSuccessMessage('Product updated successfully!');
      setShowSuccessModal(true);
      dispatch({ type: PRODUCT_UPDATE_RESET });
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
      setActLength(product.actLength || '');
      setActBreadth(product.actBreadth || '');
      setSize(product.size);
      setUnit(product.unit);
      setPrice(product.price);
      setBillPartPrice(product.billPartPrice || '');
      setCashPartPrice(product.cashPartPrice || '');
      setSellerAddress(product.sellerAddress || '');
      setType(product.type || '');
      setCountInStock(product.countInStock);
    }
  }, [product, dispatch, productId, successUpdate]);

  const submitHandler = (e) => {
    e.preventDefault();
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
      })
    );
  };

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
      setImageError(false);
    } catch (error) {
      setErrorUpload(error.message);
      setLoadingUpload(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    navigate('/'); // Redirect to home after closing the success modal
  };

  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
  };

  // Trigger error modal if there's an errorUpdate or error
  useEffect(() => {
    if (errorUpdate) {
      setErrorMessage(errorUpdate);
      setShowErrorModal(true);
    } else if (error) {
      setErrorMessage(error);
      setShowErrorModal(true);
    }
  }, [errorUpdate, error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center py-10 px-4">
      {/* Top Banner */}
      <div
        className="w-full max-w-6xl flex items-center justify-between bg-gradient-to-r from-gray-200 via-gray-100 to-gray-50 shadow-md p-5 rounded-lg mb-6 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <div className="text-center">
          <Typography variant="h5" className="font-bold text-red-600">
            KK TRADING
          </Typography>
          <Typography variant="body2" className="text-gray-500 font-semibold uppercase tracking-wider">
            Product Management
          </Typography>
        </div>
        <i className="fa fa-box text-gray-500 text-3xl" />
      </div>

      {/* Loading and Error States */}
      {(loadingUpdate || loading) && <LoadingBox />}
      {(errorUpdate || error) && <MessageBox variant="danger">{error || errorUpdate}</MessageBox>}

      {/* Success and Error Modals */}
      <SuccessModal
        open={showSuccessModal}
        onClose={handleCloseSuccessModal}
        message={successMessage}
      />
      <ErrorModal
        open={showErrorModal}
        onClose={handleCloseErrorModal}
        message={errorMessage}
      />

      {/* Product Edit Form */}
      {!loading && !error && (
        <Card className="w-full max-w-6xl shadow-lg rounded-lg p-6 bg-white">
          {/* Form Header */}
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div>
              <Typography variant="h6" className="font-semibold text-gray-700">
                Edit Product
              </Typography>
              <Typography variant="body2" className="text-gray-400">
                Update product details and save changes
              </Typography>
            </div>
            {loadingUpdate && <CircularProgress size={24} />}
          </div>

          <form onSubmit={submitHandler}>
            {/* Image Upload Section */}
            <div className="mb-6 relative">
              <div className="relative w-full h-60 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                {loadingUpload ? (
                  <CircularProgress />
                ) : image && !imageError ? (
                  <CardMedia
                    component="img"
                    image={image}
                    alt="product"
                    className="object-cover h-full w-full"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <Typography variant="body2" className="text-gray-400 animate-pulse">
                    No image
                  </Typography>
                )}
                <IconButton
                  component="label"
                  className="!absolute bottom-3 right-3 bg-white hover:bg-gray-100 shadow p-1 rounded-full"
                >
                  <EditIcon className="text-red-500" />
                  <input type="file" hidden onChange={uploadFileHandler} />
                </IconButton>
              </div>
              {errorUpload && (
                <MessageBox variant="danger">{errorUpload}</MessageBox>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
              <TextField
                size="small"
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <TextField
                size="small"
                label="Item ID"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                required
              />
              <TextField
                size="small"
                label="Brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                required
              />
              <TextField
                size="small"
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
              <TextField
                size="small"
                label="Seller"
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
              />
              <TextField
                size="small"
                label="Type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
              <TextField
                size="small"
                label="P Unit"
                value={pUnit}
                onChange={(e) => setPUnit(e.target.value)}
              />
              <TextField
                size="small"
                label="S Unit"
                value={sUnit}
                onChange={(e) => setSUnit(e.target.value)}
              />
              <TextField
                size="small"
                label="P S Ratio"
                value={psRatio}
                onChange={(e) => setPsRatio(e.target.value)}
              />
              <TextField
                size="small"
                label="Length"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
              <TextField
                size="small"
                label="Breadth"
                value={breadth}
                onChange={(e) => setBreadth(e.target.value)}
              />
              <TextField
                size="small"
                label="Actual Length"
                value={actLength}
                onChange={(e) => setActLength(e.target.value)}
              />
              <TextField
                size="small"
                label="Actual Breadth"
                value={actBreadth}
                onChange={(e) => setActBreadth(e.target.value)}
              />
              <TextField
                size="small"
                label="Size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
              <TextField
                size="small"
                label="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
              <TextField
                size="small"
                type="number"
                label="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <TextField
                size="small"
                type="number"
                label="Bill Part Price"
                value={billPartPrice}
                onChange={(e) => setBillPartPrice(e.target.value)}
              />
              <TextField
                size="small"
                type="number"
                label="Cash Part Price"
                value={cashPartPrice}
                onChange={(e) => setCashPartPrice(e.target.value)}
              />
              <TextField
                size="small"
                type="number"
                label="Count In Stock"
                value={countInStock}
                onChange={(e) => setCountInStock(e.target.value)}
                required
              />
              <TextField
                size="small"
                label="Seller Address"
                value={sellerAddress}
                onChange={(e) => setSellerAddress(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <TextField
                label="Description"
                multiline
                rows={4}
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                variant="contained"
                color="error"
                type="submit"
                className="px-6 py-2"
              >
                Update
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
