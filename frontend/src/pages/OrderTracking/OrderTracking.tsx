import { useState } from 'react';
import { CheckCircle2, Clock, MapPin, Package, Phone, Search, XCircle } from 'lucide-react';
import './OrderTracking.css';
import { useToast } from '../../contexts/ToastContext';
import { orderService } from '../../services/orderService';
import { CLIENT_TEXT } from '../../utils/texts';

const t = CLIENT_TEXT.orderTracking;
const tCommon = CLIENT_TEXT.common;

type TrackingStep = {
  label: string;
  time: string;
  description?: string;
  status: 'done' | 'current' | 'upcoming';
};

type MockOrder = {
  id: string;
  phone: string;
  customer: string;
  address: string;
  eta: string;
  status: 'delivered' | 'shipping' | 'processing' | 'pending' | 'cancelled';
  steps: TrackingStep[];
  tracking?: string;
};

const OrderTracking = () => {
  const { addToast } = useToast();
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<MockOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotFound(false);
    setTimeout(() => {
      const order = orderService.getById(orderId.trim());
      if (order && order.addressSummary.includes(phone.trim())) {
        const statusMap: Record<string, MockOrder['status']> = {
          pending: 'pending',
          processing: 'processing',
          shipping: 'shipping',
          delivered: 'delivered',
          canceled: 'cancelled',
        };
        const found: MockOrder = {
          id: order.id,
          phone: order.addressSummary.split(',')[1]?.trim() || '',
          customer: order.addressSummary.split(',')[0]?.trim() || '',
          address: order.addressSummary.split(',').slice(2).join(',').trim() || '',
          eta: '',
          status: statusMap[order.status] || 'pending',
          tracking: order.tracking || '',
          steps: order.statusSteps.map((step) => ({
            label: step.label,
            time: step.timestamp,
            status: 'done' as const,
          })),
        };
        setResult(found);
        addToast(t.found, 'success');
      } else {
        setResult(null);
        setNotFound(true);
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="tracking-page">
      <div className="tracking-container">
        <div className="tracking-hero">
          <div>
            <p className="hero-kicker">{t.hero.kicker}</p>
            <h1 className="hero-title">{t.hero.title}</h1>
            <p className="hero-sub">{t.hero.subtitle}</p>
          </div>
          <div className="hero-icon"><Package size={46} /></div>
        </div>

        <form className="tracking-form" onSubmit={handleSearch}>
          <div className="form-group">
            <label>{t.form.orderId}</label>
            <div className="input-with-icon">
              <input
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder={t.form.orderIdPlaceholder}
                required
              />
              <Search size={16} />
            </div>
          </div>
          <div className="form-group">
            <label>{t.form.phone}</label>
            <div className="input-with-icon">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.form.phonePlaceholder}
                required
              />
              <Phone size={16} />
            </div>
          </div>
          <button type="submit" className="btn-search" disabled={loading}>
            {loading ? t.form.searching : t.form.search}
          </button>
        </form>

        {notFound && (
          <div className="tracking-empty">
            <XCircle size={28} />
            <div>
              <h3>{t.notFound.title}</h3>
              <p>{t.notFound.desc}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="tracking-result">
            <div className="result-header">
              <div>
                <p className="result-id">Mã đơn: <strong>{result.id}</strong></p>
                {result.tracking && (
                  <p className="result-meta">{t.result.trackingNumber}: <strong>{result.tracking}</strong></p>
                )}
                <p className="result-meta">{t.result.customer}: {result.customer}</p>
                <p className="result-meta">SĐT: {result.phone}</p>
                <p className="result-meta"><MapPin size={14} /> {result.address}</p>
              </div>
              <div className="result-status">
                <span className={`status-pill status-${result.status}`}>{tCommon.status[result.status as keyof typeof tCommon.status]}</span>
                <p className="eta-text">{result.eta}</p>
              </div>
            </div>

            <div className="tracking-steps">
              {result.steps.map((step) => (
                <div key={step.label + step.time} className={`step-card ${step.status}`}>
                  <div className="step-icon">
                    {step.status === 'done' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                  </div>
                  <div className="step-body">
                    <p className="step-label">{step.label}</p>
                    <p className="step-time">{step.time}</p>
                    {step.description && <p className="step-desc">{step.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
