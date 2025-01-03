// AdminLogsPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import Modal from 'react-modal';
import { FaTrash, FaUser, FaInfoCircle, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function AdminLogsPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal State
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'descending' });

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await api.get('/api/users/alllogs/all');
        setLogs(data);
        setFilteredLogs(data);
        extractFilters(data);
        setLoading(false);
      } catch (error) {
        setError('Failed to fetch logs');
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Extract unique users and actions for filters
  const extractFilters = (data) => {
    const uniqueUsers = Array.from(new Set(data.map(log => log.username))).filter(Boolean);
    const uniqueActions = Array.from(new Set(data.map(log => formatActionGeneric(log.action))));
    setUsers(uniqueUsers);
    setActions(uniqueActions);
  };

  // Dynamic Action Formatter
  const formatAction = (method, url) => {
    // Remove query parameters and trailing slashes
    const cleanUrl = url.split('?')[0].replace(/\/$/, '');

    // Split the URL into parts
    const parts = cleanUrl.split('/').filter(part => part && part !== 'api');

    // Identify the resource and any identifiers
    let resource = '';
    let id = '';

    if (parts.length > 1) {
      resource = parts[1];
      if (parts.length > 2) {
        id = parts[2];
      }
    } else if (parts.length === 1) {
      resource = parts[0];
    }

    // Define action verbs based on HTTP methods
    const methodVerbMap = {
      GET: 'Fetched',
      POST: 'Created',
      PUT: 'Updated',
      DELETE: 'Deleted',
      PATCH: 'Patched',
    };

    const verb = methodVerbMap[method] || 'Performed';

    // Convert resource to singular form if necessary
    const resourceName = resource.endsWith('s') ? resource.slice(0, -1) : resource;

    // Construct the action description
    let actionDescription = `${verb} ${resourceName}`;

    if (id) {
      actionDescription += ` (ID: ${id})`;
    }

    return actionDescription;
  };

  // Generic Action Formatter assuming 'action' field contains "METHOD /api/endpoint"
  const formatActionGeneric = (action) => {
    if (!action) return 'Performed an action';
    const [method, ...urlParts] = action.split(' ');
    const url = urlParts.join(' ');
    return formatAction(method, url);
  };

  // Handle Sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Apply Filters, Search, and Sorting
  useEffect(() => {
    let tempLogs = [...logs];

    // Apply User Filter
    if (selectedUser) {
      tempLogs = tempLogs.filter(log => log.username === selectedUser);
    }

    // Apply Action Filter
    if (selectedAction) {
      tempLogs = tempLogs.filter(log => formatActionGeneric(log.action) === selectedAction);
    }

    // Apply Date Range Filter
    if (fromDate) {
      tempLogs = tempLogs.filter(log => new Date(log.timestamp) >= fromDate);
    }
    if (toDate) {
      tempLogs = tempLogs.filter(log => new Date(log.timestamp) <= toDate);
    }

    // Apply Search Filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      tempLogs = tempLogs.filter(log =>
        (log.username && log.username.toLowerCase().includes(lowerSearch)) ||
        formatActionGeneric(log.action).toLowerCase().includes(lowerSearch)
      );
    }

    // Apply Sorting
    if (sortConfig !== null) {
      tempLogs.sort((a, b) => {
        let aKey, bKey;

        if (sortConfig.key === 'user') {
          aKey = a.username || '';
          bKey = b.username || '';
        } else if (sortConfig.key === 'action') {
          aKey = formatActionGeneric(a.action);
          bKey = formatActionGeneric(b.action);
        } else if (sortConfig.key === 'timestamp') {
          aKey = new Date(a.timestamp);
          bKey = new Date(b.timestamp);
        } else {
          aKey = '';
          bKey = '';
        }

        if (aKey < bKey) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aKey > bKey) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredLogs(tempLogs);
  }, [logs, selectedUser, selectedAction, fromDate, toDate, searchTerm, sortConfig]);

  // Format Details
  const formatDetails = (details) => {
    try {
      const parsedDetails = JSON.parse(details);
      return (
        <div className="space-y-4">
          {parsedDetails.params && (
            <div>
              <h3 className="text-sm font-semibold">Parameters:</h3>
              <ul className="list-disc list-inside">
                {Object.entries(parsedDetails.params).map(([key, value]) => (
                  <li key={key} className="text-xs">
                    <span className="font-medium">{key}:</span> {value}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {parsedDetails.query && (
            <div>
              <h3 className="text-sm font-semibold">Query:</h3>
              <ul className="list-disc list-inside">
                {Object.entries(parsedDetails.query).map(([key, value]) => (
                  <li key={key} className="text-xs">
                    <span className="font-medium">{key}:</span> {value}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {parsedDetails.body && (
            <div>
              <h3 className="text-sm font-semibold">Body:</h3>
              <ul className="list-disc list-inside">
                {Object.entries(parsedDetails.body).map(([key, value]) => (
                  <li key={key} className="text-xs">
                    <span className="font-medium">{key}:</span>{' '}
                    {typeof value === 'object' ? JSON.stringify(value) : value}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    } catch {
      return <p className="text-xs text-gray-700">{details}</p>;
    }
  };

  // Open Modal
  const openModal = (log) => {
    setSelectedLog(log);
    setModalIsOpen(true);
  };

  // Close Modal
  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedLog(null);
  };

  // Delete All Logs
  const deleteAllLogs = () => {
    if (window.confirm('Are you sure you want to delete all logs? This action cannot be undone.')) {
      api.post('/api/users/alllogs/all')
        .then(() => {
          alert('All Logs Deleted');
          navigate(0);
        })
        .catch((err) => {
          console.error(err);
          alert('Failed to delete logs');
        });
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between bg-white shadow-md p-6 rounded-lg mb-8">
        <div
          onClick={() => navigate('/')}
          className="cursor-pointer text-center sm:text-left"
        >
          <h1 className="text-sm sm:text-md font-bold text-red-600">Travancore Backers</h1>
          <p className="text-gray-500 text-xs sm:text-xs font-medium">
            All Logs and User Tracking
          </p>
        </div>
        <button
          onClick={deleteAllLogs}
          className="mt-4 sm:mt-0 flex items-center text-red-500 hover:text-red-700 transition-colors text-xs sm:text-sm"
          title="Delete All Logs"
        >
          <FaTrash className="mr-2" />
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 space-y-4 md:space-y-0">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
          {/* User Filter */}
          <div className="flex items-center space-x-2">
            <label htmlFor="userFilter" className="text-xs sm:text-sm text-gray-700">User:</label>
            <select
              id="userFilter"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="border border-gray-300 rounded px-8 py-1 text-xs sm:text-sm"
            >
              <option value="">All</option>
              {users.map((user, index) => (
                <option key={index} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center space-x-2">
            <label htmlFor="actionFilter" className="text-xs sm:text-sm text-gray-700">Action:</label>
            <select
              id="actionFilter"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
            >
              <option value="">All</option>
              {actions.map((action, index) => (
                <option key={index} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <label htmlFor="fromDate" className="text-xs sm:text-sm text-gray-700">From:</label>
            <DatePicker
              id="fromDate"
              selected={fromDate}
              onChange={(date) => setFromDate(date)}
              className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
              placeholderText="Start Date"
              dateFormat="yyyy-MM-dd"
            />

            <label htmlFor="toDate" className="text-xs sm:text-sm text-gray-700">To:</label>
            <DatePicker
              id="toDate"
              selected={toDate}
              onChange={(date) => setToDate(date)}
              className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm"
              placeholderText="End Date"
              dateFormat="yyyy-MM-dd"
            />
          </div>

        </div>

        {/* Search */}
        <div className="flex items-center space-x-2">
          <label htmlFor="search" className="text-xs sm:text-sm text-gray-700">Search:</label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm w-40 sm:w-60"
            placeholder="Search by user or action"
          />
        </div>
      </div>

      {/* Logs Section */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <p className="text-center text-sm sm:text-base font-semibold text-gray-700">Loading logs...</p>
        ) : error ? (
          <p className="text-center text-sm sm:text-base font-semibold text-red-600">
            {error}
          </p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-center text-sm sm:text-base font-semibold text-gray-700">No logs available.</p>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl text-gray-700 font-bold mb-4">Activity Logs</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {/* User Column */}
                    <th
                      scope="col"
                      className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('user')}
                    >
                      <div className="flex items-center">
                        User
                        {sortConfig.key === 'user' && (
                          sortConfig.direction === 'ascending' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                        )}
                        {sortConfig.key !== 'user' && <FaSort className="ml-1 text-gray-400" />}
                      </div>
                    </th>

                    {/* Action Column */}
                    <th
                      scope="col"
                      className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('action')}
                    >
                      <div className="flex items-center">
                        Action
                        {sortConfig.key === 'action' && (
                          sortConfig.direction === 'ascending' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                        )}
                        {sortConfig.key !== 'action' && <FaSort className="ml-1 text-gray-400" />}
                      </div>
                    </th>

                    {/* Details Column */}
                    <th
                      scope="col"
                      className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      Details
                    </th>

                    {/* Timestamp Column */}
                    <th
                      scope="col"
                      className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('timestamp')}
                    >
                      <div className="flex items-center">
                        Timestamp
                        {sortConfig.key === 'timestamp' && (
                          sortConfig.direction === 'ascending' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                        )}
                        {sortConfig.key !== 'timestamp' && <FaSort className="ml-1 text-gray-400" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-100">
                      {/* User */}
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-700 flex items-center">
                        <FaUser className="text-red-500 mr-1" />
                        {log.username || 'Unknown User'}
                      </td>

                      {/* Action */}
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                        <FaInfoCircle className="text-red-500 mr-1 inline-block" />
                        {formatActionGeneric(log.action)}
                      </td>

                      {/* Details */}
                      <td
                        className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-blue-500 cursor-pointer hover:underline"
                        onClick={() => openModal(log)}
                      >
                        View Details
                      </td>

                      {/* Timestamp */}
                      <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal for displaying details */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Log Details"
        ariaHideApp={false}
        className="fixed inset-0 flex items-center justify-center p-4"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 overflow-auto"
      >
        {selectedLog && (
          <div className="bg-white w-full h-full sm:w-11/12 md:w-10/12 lg:w-8/12 xl:w-6/12 p-4 sm:p-6 overflow-y-auto rounded-lg shadow-xl relative">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
              title="Close Modal"
            >
              &times;
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Log Details</h2>
            <div className="space-y-4">
              {/* User */}
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">User:</h3>
                <p className="text-xs sm:text-sm text-gray-600">{selectedLog.username || 'Unknown User'}</p>
              </div>

              {/* Action */}
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">Action:</h3>
                <p className="text-xs sm:text-sm text-gray-600">{formatActionGeneric(selectedLog.action)}</p>
              </div>

              {/* Endpoint */}
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">Endpoint:</h3>
                <p className="text-xs sm:text-sm text-gray-600">{selectedLog.action}</p>
              </div>

              {/* Timestamp */}
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">Timestamp:</h3>
                <p className="text-xs sm:text-sm text-gray-600">{new Date(selectedLog.timestamp).toLocaleString()}</p>
              </div>

              {/* Details */}
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">Details:</h3>
                <div className="ml-4">
                  {formatDetails(selectedLog.details)}
                </div>
              </div>

              {/* Additional Fields (if any) */}
              {/* Example: */}
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-gray-700">IP Address:</h3>
                <p className="text-xs sm:text-sm text-gray-600">{selectedLog.ipAddress}</p>
              </div>
             
            </div>
            <button
              onClick={closeModal}
              className="mt-4 sm:mt-6 px-3 sm:px-4 py-1 sm:py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-xs sm:text-sm"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
