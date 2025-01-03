import React, { useEffect, useState } from 'react';
import api from '../screens/api';



export default function Product({ product }) {
  const [imageError, setImageError] = useState(false);

  const [soldOut,setSoldOut] = useState(null);

  useEffect(() => {
    // Define the async function inside useEffect
    const fetchSoldOut = async () => {
      try {
        const response = await api.get(`api/billing/product/get-sold-out/${product.item_id}`);
        // Assuming the API returns the sold-out count directly.
        // If it returns an object like { soldOut: number }, adjust accordingly:
        // setSoldOut(response.data.soldOut);
        setSoldOut(response.data.totalQuantity);
      } catch (error) { 
        console.error("Error fetching sold out status:", error);
        setSoldOut(0); // Default to 0 in case of error
      } 
    };

    // Call the async function
    fetchSoldOut();
  }, [product._id]); // Added product._id as a dependency

  return (
    <div className="bg-white shadow-md rounded-lg p-3 flex flex-col items-center space-y-2 transition-transform hover:scale-105 w-full">
      {/* Product Image */}
      <a href={`/product/${product._id}`} className="w-full">
        <img
          onError={() => setImageError(true)}
          className={`object-cover rounded-md w-full h-32 ${imageError ? 'hidden' : ''}`}
          src={`${product.image}`}
          alt={product.image}
        />
        {imageError && (
          <div className="flex justify-center items-center w-full h-32 bg-gray-200 rounded-md">
            <p className="text-gray-500 text-sm">No image</p>
          </div>
        )}
      </a>

      {/* Product Details */}
      <div className="w-full text-center p-2">
        <a href={`/product/${product._id}`}>
          <h2 className="text-xs font-bold text-red-500 truncate">{product.name}</h2>
        </a>

        <div className="text-xs text-gray-500 mt-1 truncate pb-2">{product.brand}</div>
        <div className="border-t pt-2">
            <div className="text-xs">
                <p className="text-gray-400 uppercase font-bold mb-2">Stock Details</p>
                <p className={`font-bold  ${product.countInStock > 10 ? 'text-green-600' : product.countInStock === 0 ? 'text-red-600' : 'text-yellow-700'}`}>
                    In Stock: {product.countInStock}
                </p>
            </div>
            <p className="text-xs font-semibold text-gray-500">
                Stock Cleared: {soldOut ? soldOut : 0}
            </p>
        </div>

        {/* <div className="text-md font-semibold text-indigo-600 mt-1">${product.price}</div> */}
      </div>
    </div>
  );
}
