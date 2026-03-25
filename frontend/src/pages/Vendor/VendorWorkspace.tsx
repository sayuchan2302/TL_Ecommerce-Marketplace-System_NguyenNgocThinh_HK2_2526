import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import VendorDashboard from './VendorDashboard';
import VendorOrders from './VendorOrders';
import VendorOrderDetail from './VendorOrderDetail';
import VendorProducts from './VendorProducts';
import VendorAnalytics from './VendorAnalytics';
import VendorSettings from './VendorSettings';
import VendorStorefront from './VendorStorefront';
import VendorPromotions from './VendorPromotions';
import VendorReviews from './VendorReviews';
import VendorLayout from './VendorLayout';
import PageFallback from '../../components/Transitions/PageFallback';

const VendorWorkspace = () => {
  return (
    <VendorLayout title="Tổng quan shop" hideTopbarTitle>
      <div className="admin-route-transition">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route index element={<Navigate to="/vendor/dashboard" replace />} />
            <Route path="dashboard" element={<VendorDashboard />} />
            <Route path="orders" element={<VendorOrders />} />
            <Route path="orders/:id" element={<VendorOrderDetail />} />
            <Route path="products" element={<VendorProducts />} />
            <Route path="storefront" element={<VendorStorefront />} />
            <Route path="promotions" element={<VendorPromotions />} />
            <Route path="reviews" element={<VendorReviews />} />
            <Route path="analytics" element={<VendorAnalytics />} />
            <Route path="settings" element={<VendorSettings />} />
            <Route path="*" element={<Navigate to="/vendor/dashboard" replace />} />
          </Routes>
        </Suspense>
      </div>
    </VendorLayout>
  );
};

export default VendorWorkspace;
