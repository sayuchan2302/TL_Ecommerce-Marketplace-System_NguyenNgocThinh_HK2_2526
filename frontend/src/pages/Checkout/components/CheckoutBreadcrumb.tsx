import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CLIENT_TEXT } from '../../../utils/texts';

const t = CLIENT_TEXT.checkout;

const CheckoutBreadcrumb = () => (
  <div className="checkout-breadcrumb">
    <Link to="/cart" className="breadcrumb-link">{t.breadcrumb.cart}</Link>
    <ChevronRight size={14} />
    <span className="breadcrumb-active">{t.breadcrumb.shippingInfo}</span>
    <ChevronRight size={14} />
    <span className="breadcrumb-inactive">{t.breadcrumb.paymentStep}</span>
  </div>
);

export default CheckoutBreadcrumb;
