import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import './App.css';

// Lazy loaded pages
const Home = lazy(() => import('./pages/Home/Home'));
const ProductListing = lazy(() => import('./pages/ProductListing/ProductListing'));
const ProductDetail = lazy(() => import('./pages/ProductDetail/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart/Cart'));
const Checkout = lazy(() => import('./pages/Checkout/Checkout'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess/OrderSuccess'));
const Search = lazy(() => import('./pages/Search/Search'));
const Wishlist = lazy(() => import('./pages/Wishlist/Wishlist'));
const Policy = lazy(() => import('./pages/Policy/Policy'));
const About = lazy(() => import('./pages/About/About'));
const Contact = lazy(() => import('./pages/Contact/Contact'));
const OrderDetail = lazy(() => import('./pages/OrderDetail/OrderDetail'));
const ScrollToTop = lazy(() => import('./components/ScrollToTop/ScrollToTop'));
const OrdersPage = lazy(() => import('./pages/Account/OrdersPage'));
const AddressesPage = lazy(() => import('./pages/Account/AddressesPage'));
const SecurityPage = lazy(() => import('./pages/Account/SecurityPage'));
const OrderDetailPage = lazy(() => import('./pages/Account/OrderDetailPage'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute/ProtectedRoute'));
const OrderTracking = lazy(() => import('./pages/OrderTracking/OrderTracking'));
const Returns = lazy(() => import('./pages/Returns/Returns'));
const FAQ = lazy(() => import('./pages/FAQ/FAQ'));
const PaymentResult = lazy(() => import('./pages/PaymentResult/PaymentResult'));
const SizeGuide = lazy(() => import('./pages/SizeGuide/SizeGuide'));
const Stores = lazy(() => import('./pages/Stores/Stores'));

// Admin pages
const Admin = lazy(() => import('./pages/Admin/Admin'));
const AdminOrders = lazy(() => import('./pages/Admin/AdminOrders'));
const AdminProducts = lazy(() => import('./pages/Admin/AdminProducts'));
const AdminOrderDetail = lazy(() => import('./pages/Admin/AdminOrderDetail'));
const AdminCategories = lazy(() => import('./pages/Admin/AdminCategories'));
const AdminCustomers = lazy(() => import('./pages/Admin/AdminCustomers'));
const AdminPromotions = lazy(() => import('./pages/Admin/AdminPromotions'));
const AdminReviews = lazy(() => import('./pages/Admin/AdminReviews'));
const AdminReturns = lazy(() => import('./pages/Admin/AdminReturns'));
const AdminContent = lazy(() => import('./pages/Admin/AdminContent'));

// Core components (not lazy loaded - needed immediately)
import TopBar from './components/TopBar/TopBar';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import { ToastProvider } from './contexts/ToastContext';
import { CartAnimationProvider } from './context/CartAnimationContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { CartProvider } from './contexts/CartContext';
import { FilterProvider } from './contexts/FilterContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner';

const MainLayout = () => {
  const location = useLocation();
  const isCheckout = location.pathname === '/checkout';
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && <TopBar />}
      {!isAdmin && <Header />}
      <Outlet />
      {!isCheckout && !isAdmin && <Footer />}
    </>
  );
};

const RouteLoader = ({ children, text }: { children: React.ReactNode; text?: string }) => (
  <Suspense fallback={<LoadingSpinner size="lg" fullScreen text={text || 'Đang tải...'} />}>
    {children}
  </Suspense>
);

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <CartAnimationProvider>
            <WishlistProvider>
              <FilterProvider>
                <NotificationProvider>
                <Router>
                  <RouteLoader>
                    <ScrollToTop />
                    <div className="app-container">
                      <Routes>
                        {/* All routes share standard layout (Header, Footer) */}
                        <Route element={<MainLayout />}>
                          <Route path="/" element={<Home />} />
                          <Route path="/category/:id" element={<ProductListing />} />
                          <Route path="/product/:id" element={<ProductDetail />} />
                          <Route path="/cart" element={<Cart />} />
                          <Route path="/checkout" element={<Checkout />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/order-success" element={<OrderSuccess />} />
                          <Route path="/search" element={<Search />} />
                          <Route path="/wishlist" element={<Wishlist />} />
                          <Route path="/order-tracking" element={<OrderTracking />} />
                          <Route path="/returns" element={<Returns />} />
                          <Route path="/payment-result" element={<PaymentResult />} />
                          <Route path="/faq" element={<FAQ />} />
                          <Route path="/size-guide" element={<SizeGuide />} />
                          <Route path="/stores" element={<Stores />} />
                          <Route path="/policy/:type" element={<Policy />} />
                          <Route path="/about" element={<About />} />
                          <Route path="/contact" element={<Contact />} />
                          <Route path="/profile/orders/:id" element={<OrderDetail />} />
                          <Route path="/account/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                          <Route path="/account/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
                          <Route path="/account/addresses" element={<ProtectedRoute><AddressesPage /></ProtectedRoute>} />
                          <Route path="/account/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
                          <Route path="*" element={<NotFound />} />
                        </Route>

                        {/* Admin routes */}
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/admin/orders" element={<AdminOrders />} />
                        <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
                        <Route path="/admin/products" element={<AdminProducts />} />
                        <Route path="/admin/categories" element={<AdminCategories />} />
                        <Route path="/admin/customers" element={<AdminCustomers />} />
                        <Route path="/admin/customer" element={<AdminCustomers />} />
                        <Route path="/admin/promotions" element={<AdminPromotions />} />
                        <Route path="/admin/reviews" element={<AdminReviews />} />
                        <Route path="/admin/returns" element={<AdminReturns />} />
                        <Route path="/admin/content" element={<AdminContent />} />
                      </Routes>
                    </div>
                  </RouteLoader>
                </Router>
              </NotificationProvider>
              </FilterProvider>
            </WishlistProvider>
          </CartAnimationProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
