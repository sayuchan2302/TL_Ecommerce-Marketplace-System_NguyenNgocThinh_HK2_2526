import './Vendor.css';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, CreditCard, FileText, Link2, MapPin, Package, Printer, Truck, User } from 'lucide-react';
import { startTransition, useEffect, useState } from 'react';
import VendorLayout from './VendorLayout';
import { formatVendorOrderDate, getVendorOrderStatusLabel } from './vendorOrderPresentation';
import { formatCurrency } from '../../services/commissionService';
import { vendorPortalService, type VendorOrderDetailData } from '../../services/vendorPortalService';
import { useToast } from '../../contexts/ToastContext';
import { AdminStateBlock } from '../Admin/AdminStateBlocks';

const emptyOrder: VendorOrderDetailData = {
  id: '',
  status: 'pending',
  createdAt: new Date().toISOString(),
  customer: { name: '', email: '', phone: '' },
  shippingAddress: { fullName: '', phone: '', address: '', ward: '', district: '', city: '' },
  items: [],
  subtotal: 0,
  shippingFee: 0,
  discount: 0,
  total: 0,
  paymentMethod: 'COD',
  paymentStatus: 'pending',
  note: '',
  trackingNumber: '',
  commissionFee: 0,
  vendorPayout: 0,
  timeline: [],
};

const VendorOrderDetail = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [order, setOrder] = useState<VendorOrderDetailData>(emptyOrder);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const next = await vendorPortalService.getOrderDetail(id);
        if (!active) return;
        startTransition(() => setOrder(next));
      } catch (err: unknown) {
        if (!active) return;
        addToast((err as Error)?.message || 'Không tải được chi tiết đơn hàng con', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [addToast, id]);

  const updateStatus = async (status: 'CONFIRMED' | 'SHIPPED', nextUiStatus: 'packing' | 'shipping', message: string) => {
    setIsProcessing(true);
    try {
      await vendorPortalService.updateOrderStatus(id, status);
      setOrder((current) => ({ ...current, status: nextUiStatus }));
      addToast(message, 'success');
    } catch (err: unknown) {
      addToast((err as Error)?.message || 'Không thể cập nhật trạng thái đơn hàng con', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyOrderId = async () => {
    await navigator.clipboard.writeText(order.id);
    addToast('Đã sao chép mã đơn hàng con', 'success');
  };

  const shareCurrentView = async () => {
    await navigator.clipboard.writeText(window.location.href);
    addToast('Đã sao chép liên kết đơn hàng', 'success');
  };

  return (
    <VendorLayout
      title={`Đơn hàng ${id}`}
      breadcrumbs={[{ label: 'Bảng điều khiển', to: '/vendor/dashboard' }, { label: 'Đơn hàng shop', to: '/vendor/orders' }, { label: 'Chi tiết vận hành' }]}
      actions={(
        <>
          <button className="admin-ghost-btn" onClick={() => navigate('/vendor/orders')}>
            <ArrowLeft size={16} />
            Quay lại
          </button>
          <button className="admin-ghost-btn" onClick={() => void shareCurrentView()}>
            <Link2 size={16} />
            Chia sẻ
          </button>
          <button className="admin-ghost-btn">
            <Printer size={16} />
            In phiếu giao
          </button>
          {order.status === 'pending' && (
            <button className="admin-primary-btn vendor-admin-primary" onClick={() => void updateStatus('CONFIRMED', 'packing', 'Đã xác nhận đơn hàng con của shop')} disabled={isProcessing}>
              <Check size={16} />
              {isProcessing ? 'Đang xử lý...' : 'Xác nhận đơn'}
            </button>
          )}
          {order.status === 'packing' && (
            <button className="admin-primary-btn vendor-admin-primary" onClick={() => void updateStatus('SHIPPED', 'shipping', 'Đơn hàng đã bàn giao cho đơn vị vận chuyển')} disabled={isProcessing}>
              <Truck size={16} />
              {isProcessing ? 'Đang xử lý...' : 'Bàn giao vận chuyển'}
            </button>
          )}
        </>
      )}
    >
      {loading ? (
        <AdminStateBlock
          type="empty"
          title="Đang tải chi tiết vận hành"
          description="Đơn hàng của shop đang được đồng bộ."
        />
      ) : (
        <>
          <div className="admin-stats grid-4">
            <div className="admin-stat-card">
              <div className="admin-stat-label">Mã đơn hàng con</div>
              <div className="admin-stat-value vendor-stat-inline">{order.id} <button className="admin-icon-btn subtle" onClick={() => void handleCopyOrderId()}><Copy size={14} /></button></div>
              <div className="admin-stat-sub">{formatVendorOrderDate(order.createdAt, true)}</div>
            </div>
            <div className="admin-stat-card info">
              <div className="admin-stat-label">Trạng thái</div>
              <div className="admin-stat-value">{getVendorOrderStatusLabel(order.status)}</div>
              <div className="admin-stat-sub">Chỉ phản ánh phần vận hành của shop</div>
            </div>
            <div className="admin-stat-card warning">
              <div className="admin-stat-label">Phí sàn</div>
              <div className="admin-stat-value">{formatCurrency(order.commissionFee)}</div>
              <div className="admin-stat-sub">Commission áp dụng cho đơn hàng con</div>
            </div>
            <div className="admin-stat-card success">
              <div className="admin-stat-label">Thực nhận</div>
              <div className="admin-stat-value">{formatCurrency(order.vendorPayout)}</div>
              <div className="admin-stat-sub">Payout dự kiến cho shop</div>
            </div>
          </div>

          <section className="admin-panels">
            <div className="admin-left">
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2><Package size={16} /> Hàng hóa của shop</h2>
                  <span className="admin-muted">{order.items.length} SKU trong đơn hàng</span>
                </div>
                {order.items.length === 0 ? (
                  <AdminStateBlock type="empty" title="Không có SKU" description="Đơn hàng này chưa có dòng hàng hóa hợp lệ." />
                ) : (
                  <div className="admin-table" role="table" aria-label="Bảng hàng hóa của shop">
                    <div className="admin-table-row vendor-order-items admin-table-head" role="row">
                      <div role="columnheader">Sản phẩm</div>
                      <div role="columnheader">Biến thể</div>
                      <div role="columnheader">Số lượng</div>
                      <div role="columnheader">Đơn giá</div>
                      <div role="columnheader">Thành tiền</div>
                    </div>
                    {order.items.map((item) => (
                      <div key={item.id} className="admin-table-row vendor-order-items" role="row">
                        <div role="cell" className="vendor-admin-product-cell">
                          <img src={item.image} alt={item.name} className="vendor-admin-thumb" />
                          <div className="vendor-admin-product-copy">
                            <div className="admin-bold">{item.name}</div>
                            <div className="admin-muted small">SKU: {item.sku}</div>
                          </div>
                        </div>
                        <div role="cell">{item.variant}</div>
                        <div role="cell">{item.quantity}</div>
                        <div role="cell">{formatCurrency(item.price)}</div>
                        <div role="cell" className="admin-bold">{formatCurrency(item.price * item.quantity)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2><CreditCard size={16} /> Đối soát đơn hàng con</h2>
                </div>
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold">Tạm tính hàng hóa</span>
                    <span className="admin-muted">{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Phí vận chuyển</span>
                    <span className="admin-muted">{order.shippingFee === 0 ? 'Miễn phí' : formatCurrency(order.shippingFee)}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Voucher / giảm trừ</span>
                    <span className="admin-muted">{order.discount > 0 ? `-${formatCurrency(order.discount)}` : 'Không có'}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Tổng đơn hàng con</span>
                    <span className="admin-muted">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="admin-right">
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2><User size={16} /> Người mua</h2>
                </div>
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold">Tên khách</span>
                    <span className="admin-muted">{order.customer.name}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Email</span>
                    <span className="admin-muted">{order.customer.email}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Điện thoại</span>
                    <span className="admin-muted">{order.customer.phone}</span>
                  </div>
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2><MapPin size={16} /> Địa chỉ giao nhận</h2>
                </div>
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold">Người nhận</span>
                    <span className="admin-muted">{order.shippingAddress.fullName}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Điện thoại</span>
                    <span className="admin-muted">{order.shippingAddress.phone}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Địa chỉ</span>
                    <span className="admin-muted">
                      {[order.shippingAddress.address, order.shippingAddress.ward, order.shippingAddress.district, order.shippingAddress.city].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2><Truck size={16} /> Thanh toán và vận chuyển</h2>
                </div>
                <div className="admin-card-list">
                  <div className="admin-card-row">
                    <span className="admin-bold">Phương thức</span>
                    <span className="admin-muted">{order.paymentMethod}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Trạng thái thanh toán</span>
                    <span className="admin-muted">{order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-bold">Mã vận đơn</span>
                    <span className="admin-muted">{order.trackingNumber || 'Đang cập nhật'}</span>
                  </div>
                </div>
              </section>

              {order.note && (
                <section className="admin-panel">
                  <div className="admin-panel-head">
                    <h2><FileText size={16} /> Ghi chú vận hành</h2>
                  </div>
                  <p className="admin-muted vendor-note-block">{order.note}</p>
                </section>
              )}
            </div>
          </section>
        </>
      )}
    </VendorLayout>
  );
};

export default VendorOrderDetail;
