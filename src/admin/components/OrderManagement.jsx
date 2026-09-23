import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Eye, 
  ExternalLink,
  ChevronRight,
  PackageCheck,
  Send
} from 'lucide-react';

export default function OrderManagement({ orders, onSelectOrderForReview, onUpdateShipping }) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [shippingModalOrder, setShippingModalOrder] = useState(null);
  const [courierName, setCourierName] = useState('Domex Express');
  const [trackingNo, setTrackingNo] = useState('');

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Tab filter
    if (activeTab === 'review' && order.status !== 'slip_review') return false;
    if (activeTab === 'packing' && order.status !== 'advance_verified' && order.status !== 'packing') return false;
    if (activeTab === 'dispatched' && order.status !== 'dispatched') return false;
    if (activeTab === 'delivered' && order.status !== 'delivered') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchName = order.customer_name?.toLowerCase().includes(q);
      const matchPhone = order.customer_phone?.toLowerCase().includes(q);
      const matchCity = order.customer_city?.toLowerCase().includes(q);
      return matchId || matchName || matchPhone || matchCity;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'slip_review':
        return <span className="status-badge badge-warning"><Clock size={12} /> Awaiting Slip Check</span>;
      case 'advance_verified':
        return <span className="status-badge badge-info"><CheckCircle2 size={12} /> Advance Verified</span>;
      case 'packing':
        return <span className="status-badge badge-info"><PackageCheck size={12} /> Packing in Progress</span>;
      case 'dispatched':
        return <span className="status-badge badge-primary"><Truck size={12} /> Dispatched</span>;
      case 'delivered':
        return <span className="status-badge badge-success"><CheckCircle2 size={12} /> Delivered & Settled</span>;
      case 'rejected':
        return <span className="status-badge badge-danger"><AlertCircle size={12} /> Slip Rejected</span>;
      default:
        return <span className="status-badge badge-secondary">{status}</span>;
    }
  };

  const handleSaveShipping = async () => {
    if (!shippingModalOrder) return;
    await onUpdateShipping(shippingModalOrder.id, {
      courierName,
      trackingNo: trackingNo || `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'dispatched'
    });
    setShippingModalOrder(null);
    setTrackingNo('');
  };

  return (
    <div className="orders-management-panel">
      {/* Top Controls Bar */}
      <div className="orders-controls-bar">
        {/* Status Tabs */}
        <div className="orders-status-tabs">
          <button 
            type="button"
            className={`order-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Orders ({orders.length})
          </button>
          <button 
            type="button"
            className={`order-tab-btn ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            Slip Review ({orders.filter(o => o.status === 'slip_review').length})
          </button>
          <button 
            type="button"
            className={`order-tab-btn ${activeTab === 'packing' ? 'active' : ''}`}
            onClick={() => setActiveTab('packing')}
          >
            To Pack ({orders.filter(o => ['advance_verified', 'packing'].includes(o.status)).length})
          </button>
          <button 
            type="button"
            className={`order-tab-btn ${activeTab === 'dispatched' ? 'active' : ''}`}
            onClick={() => setActiveTab('dispatched')}
          >
            In Transit ({orders.filter(o => o.status === 'dispatched').length})
          </button>
          <button 
            type="button"
            className={`order-tab-btn ${activeTab === 'delivered' ? 'active' : ''}`}
            onClick={() => setActiveTab('delivered')}
          >
            Delivered ({orders.filter(o => o.status === 'delivered').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="orders-search-wrapper">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by Order ID, Name, Phone, or City..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="orders-search-input"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="admin-table-container">
        <table className="admin-orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Destination</th>
              <th>Items & Sizing</th>
              <th>Financials (LKR)</th>
              <th>Slip Status</th>
              <th>Courier Tracking</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-orders-cell">
                  No orders found matching this filter.
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr key={order.id} className="admin-order-row">
                  {/* Order ID & Date */}
                  <td>
                    <div className="order-id-cell">
                      <strong className="order-id-tag">{order.id}</strong>
                      <span className="order-date-text">
                        {new Date(order.created_at).toLocaleDateString('en-GB', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </td>

                  {/* Customer */}
                  <td>
                    <div className="customer-cell">
                      <span className="customer-name">{order.customer_name}</span>
                      <span className="customer-phone">{order.customer_phone}</span>
                    </div>
                  </td>

                  {/* Destination */}
                  <td>
                    <div className="destination-cell">
                      <span className="city-tag">{order.customer_city || 'Sri Lanka'}</span>
                      <small className="address-snippet" title={order.customer_address}>
                        {order.customer_address?.substring(0, 32)}...
                      </small>
                    </div>
                  </td>

                  {/* Items */}
                  <td>
                    <div className="items-cell">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="item-snippet">
                          <span>{item.quantity}x {item.title}</span>
                          <span className="item-size-pill">
                            {item.size || `${item.hisSize || 'L'} / ${item.herSize || 'M'}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* Financials */}
                  <td>
                    <div className="financials-cell">
                      <div className="total-val">LKR {Number(order.total_amount).toLocaleString()}</div>
                      <div className="adv-val text-success">
                        Adv: LKR {Number(order.advance_required).toLocaleString()}
                      </div>
                      <div className="cod-val text-muted">
                        COD: LKR {Number(order.balance_cod).toLocaleString()}
                      </div>
                    </div>
                  </td>

                  {/* Slip Status */}
                  <td>
                    <div className="slip-status-cell">
                      {getStatusBadge(order.status)}
                      {order.slip_reference && (
                        <small className="ref-snippet">Ref: {order.slip_reference}</small>
                      )}
                    </div>
                  </td>

                  {/* Courier */}
                  <td>
                    {order.courier_name ? (
                      <div className="courier-cell">
                        <strong>{order.courier_name}</strong>
                        <code>{order.courier_tracking_no}</code>
                      </div>
                    ) : (
                      <span className="text-muted text-xs">Unassigned</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="order-actions-cell">
                      {order.status === 'slip_review' && (
                        <button 
                          type="button" 
                          className="action-btn-primary"
                          onClick={() => onSelectOrderForReview(order)}
                        >
                          <Eye size={14} />
                          <span>Review Slip</span>
                        </button>
                      )}

                      {(order.status === 'advance_verified' || order.status === 'packing') && (
                        <button 
                          type="button" 
                          className="action-btn-dispatch"
                          onClick={() => setShippingModalOrder(order)}
                        >
                          <Truck size={14} />
                          <span>Dispatch Courier</span>
                        </button>
                      )}

                      {order.status === 'dispatched' && (
                        <button 
                          type="button" 
                          className="action-btn-delivered"
                          onClick={() => onUpdateShipping(order.id, {
                            courierName: order.courier_name,
                            trackingNo: order.courier_tracking_no,
                            status: 'delivered'
                          })}
                        >
                          <CheckCircle2 size={14} />
                          <span>Mark Delivered</span>
                        </button>
                      )}

                      {order.slip_url && (
                        <button 
                          type="button"
                          className="action-btn-icon"
                          onClick={() => onSelectOrderForReview(order)}
                          title="View Details"
                        >
                          <FileText size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Courier Dispatch Waybill Modal */}
      {shippingModalOrder && (
        <div className="admin-modal-backdrop" onClick={() => setShippingModalOrder(null)}>
          <div className="admin-modal-container shipping-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Dispatch Courier · Order #{shippingModalOrder.id}</h3>
              <button className="admin-close-btn" onClick={() => setShippingModalOrder(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="shipping-modal-body">
              <p className="shipping-subtitle">
                Assign parcel tracking details for <strong>{shippingModalOrder.customer_name}</strong> in {shippingModalOrder.customer_city}.
              </p>

              <div className="admin-field-group">
                <label className="admin-field-label">Select Courier Service</label>
                <select 
                  className="admin-select"
                  value={courierName}
                  onChange={e => setCourierName(e.target.value)}
                >
                  <option value="Domex Express">Domex Express</option>
                  <option value="Koombiyo Delivery">Koombiyo Delivery</option>
                  <option value="Pronto Lanka">Pronto Lanka</option>
                  <option value="Ceylon Post Register">Department of Posts (SL Post)</option>
                </select>
              </div>

              <div className="admin-field-group">
                <label className="admin-field-label">Waybill / Tracking Number</label>
                <input 
                  type="text" 
                  className="admin-input-text"
                  placeholder="e.g. DMX-889210"
                  value={trackingNo}
                  onChange={e => setTrackingNo(e.target.value)}
                />
              </div>

              <div className="shipping-summary-box">
                <div className="ship-row">
                  <span>Balance to Collect on Delivery:</span>
                  <strong>LKR {Number(shippingModalOrder.balance_cod).toLocaleString()}</strong>
                </div>
              </div>

              <div className="shipping-actions">
                <button 
                  type="button"
                  className="admin-btn approve-btn"
                  onClick={handleSaveShipping}
                >
                  <Truck size={16} />
                  <span>Confirm Dispatch & Generate Tracking</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


