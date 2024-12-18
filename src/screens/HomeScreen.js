import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import LowStockPreview from '../components/lowStockPreview';
import ApprovalModal from '../components/ApprovalModal';
import SellerStatusModal from '../components/SellerStatusModal';
import api from './api';

export default function HomeScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [isSellerStatusModal, setSellerStatusModal] = useState(false);
  const [showDelayedMessage, setShowDelayedMessage] = useState(false);
  const userSignin = useSelector((state) => state.userSignin);
  const { userInfo } = userSignin;

  useEffect(() => {
    const timer = setTimeout(() => setShowDelayedMessage(true), 5000);

    async function fetchData() {
      setLoading(true);

      if (localStorage.getItem('faceId')) {
        navigate('/');
      }

      if (!userInfo) {
        navigate('/signin');
      }

      try {
        const FoundFaceData = await api.get(`/api/users/get-face-data/${userInfo?._id}`);

        if (FoundFaceData) {
          if (!FoundFaceData.data.isSeller) {
            setIsPendingApproval(true);
          } else {
            if (userInfo.isSeller) {
              setIsPendingApproval(false);
            } else {
              setSellerStatusModal(true);
            }
          }

          if (FoundFaceData.data.faceDescriptor?.length !== 0) {
            if (!localStorage.getItem('faceId')) {
              // navigate('/face-id?ref=login');
            } else {
              setLoading(false);
            }
          } else {
            navigate('/face-id?ref=new');
          }
        }
      } catch (error) {
        localStorage.clear();
        navigate('/signin');
      } finally {
        setLoading(false);
        clearTimeout(timer);
      }
    }

    fetchData();
  }, [userInfo, navigate]);

  return (
    <div className="flex flex-col items-center justify-center py-2">
      {loading ? (
        <LoadingScreen showDelayedMessage={showDelayedMessage} />
      ) : (
        <div className="w-full p-2 max-w-5xl">
          {/* <AccountInfo userInfo={userInfo} /> */}
          <LowStockPreview />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <CardSection title="Billing">
              <ActionButton href="/create-bill" title={`${userInfo.isAdmin ? 'Create Bill' : 'Add Estimate'}`} />
              <ActionButton href="/bills" title="All Bills" />
            </CardSection>

            {userInfo.isAdmin && <CardSection title="Purchases">
              <ActionButton href="/purchase" title="Add Purchases" />
              <ActionButton href="/allpurchases" title="All Purchases" />
            </CardSection>}

            {userInfo.isAdmin && <CardSection title="Returns">
              <ActionButton href="/create-return" title="Add Return" />
              <ActionButton href="/returns" title="All Returns" />
            </CardSection>}

           <CardSection title="Product Management">
              <ActionButton href="/search/name/" title="All Products" />
              <ActionButton href="/get-product" title="Manage Product" />
            </CardSection>

            <CardSection title="Damages">
              <ActionButton href="/create-damage" title="Add Damage" />
              <ActionButton href="/damages" title="All Damages" />
            </CardSection>

            <CardSection title="Drivers Section">
              <ActionButton href="/driver" title="See Invoices" />
              <ActionButton href="/driver-invoice" title="Delivery" />
            </CardSection>

            <CardSection title="Accounts">
            <ActionButton href="/daily-transactions" title="Daily Transactions" />
            <ActionButton href="/verify" title="Verify Bills" />
            </CardSection>

            {userInfo.isAdmin && <CardSection title="Purchase Paymets">
            <ActionButton href="/purchase-payments" title="Purchase Transactions" />
            <ActionButton href="/transport-payments" title="Transport Transactions" />
            </CardSection>}

            <CardSection title="Delivery & Stock Registry">
            <ActionButton href="/driver-tracker" title="Delivery Tracking" />
            <ActionButton href="/stock-logs" title="Stock Registry" />
            </CardSection>


            {userInfo.isAdmin && <CardSection title="Reports">
            <ActionButton href="/sales-report" title="Sales Report" />
            <ActionButton href="/purchase-report" title="Purchase Report" />
            </CardSection>}

            <CardSection title="Site Reports">
            <ActionButton href="/all-sites" title="All Sites Report" />
            <ActionButton href="/report-site" title="Report Site" />
            </CardSection>

            {userInfo.isAdmin && <CardSection title="Accounts">
            <ActionButton href="/create-account" title="Create Account" />
            <ActionButton href="/payment-accounts" title="Accounts" />
            </CardSection>}

            {userInfo.isAdmin && <CardSection title="Customer Accounts">
            <ActionButton href="/create-customer-account" title="Create Account" />
            <ActionButton href="/customer-accounts" title="Customer Accounts" />
            </CardSection>}

            {userInfo.isAdmin && <CardSection title="Supplier Accounts">
            <ActionButton href="/create-seller-account" title="Create Account" />
            <ActionButton href="/seller-accounts" title="Supplier Accounts" />
            </CardSection>}

            {userInfo.isAdmin && <CardSection title="Transportation Accounts">
            <ActionButton href="/create-transport-payments" title="Create Accounts" />
            <ActionButton href="/all-transport-payments" title="Transportation Accounts" />
            </CardSection>}

            {userInfo.isAdmin && <CardSection title="Stock">
            <ActionButton href="/stock-logs" title="Stock Registry" />
            <ActionButton href="/update-stock" title="Update Stock" />
            </CardSection>}

            <CardSection title="Leave Application">
            <ActionButton href="/leave" title="Add Leave" />
            <ActionButton href="/all-leaves" title="All Leaves" />
            </CardSection>

            {userInfo.isAdmin && <CardSection title="Billings">
            <ActionButton href="/stock-logs" title="Stock Registry" />
            <ActionButton href="/bills/payment" title="Billing Transactions" />
            </CardSection> }

           {userInfo.isAdmin && <CardSection title="Admin Panel">
              <ActionButton href={userInfo?.isAdmin ? '/support' : '/chat'} title="Inbox" />
              <ActionButton href="/dashboard" title="Dashboard" />
              <ActionButton href="https://kktrading-backend.vercel.app/export" title="Export All" />
            </CardSection> }

            {/* <CardSection title="Edit Billings">
            <ActionButton href="/bills/edit" title="Edit Bills" />
            <ActionButton href="/purchase/edit" title="Edit Purchases" />
            <ActionButton href="/return/edit" title="Edit Returns" />
            </CardSection> */}

          </div>
        </div>
      )}
      <ApprovalModal isVisible={isPendingApproval} />
      <SellerStatusModal isVisible={isSellerStatusModal} />
    </div>
  );
}

function LoadingScreen({ showDelayedMessage }) {
  return (
    <div className="fixed top-0 bg-white z-10 w-full overflow-hidden p-3">
      <p className="text-sm font-bold text-red-400 animate-pulse pb-2 text-center mt-20 pt-10">KK TRADING</p>
      {showDelayedMessage && (
        <p className="text-center text-gray-400 animate-pulse pb-4 text-xs">
          <i className="fa fa-sync fa-spin mr-2 text-red-400" />
          It is taking longer than usual to load the site. <br /> Retrieving server data, please be patient.
        </p>
      )}
      <p className="text-center text-gray-400 animate-pulse pb-10 text-xs">
        <i className="fa fa-spinner fa-spin" /> Loading...
      </p>
      <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-5">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((_, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-300 rounded mb-4"></div>
            <div className="h-6 bg-gray-300 rounded mb-3"></div>
            <div className="h-6 bg-gray-300 rounded mb-3"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountInfo({ userInfo }) {
  return (
    <div className="flex items-center justify-center mb-4">
      {userInfo ? (
        <p className="text-md font-semibold text-gray-800 text-center">
          Welcome, <span className="text-blue-600">{userInfo.name}</span>!
        </p>
      ) : null}
    </div>
  );
}

function CardSection({ title, children }) {
  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <h2 className="text-sm font-bold text-gray-500 mb-3">{title}</h2>
      <div className="flex flex-col space-y-3">{children}</div>
    </div>
  );
}

function ActionButton({ href, title }) {
  return (
    <a
      href={href}
      className="w-full px-3 py-2 bg-red-600 text-white font-bold text-xs md:text-sm rounded-md shadow-sm hover:bg-red-700 transition duration-150"
    >
      {title}
    </a>
  );
}
