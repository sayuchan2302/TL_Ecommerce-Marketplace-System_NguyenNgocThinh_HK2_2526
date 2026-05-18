import { useNavigate } from 'react-router-dom';
import { PanelTabs } from '../../components/Panel/PanelPrimitives';

type ProductGovernanceTabKey = 'products' | 'reports';

const productGovernanceTabs = [
  { key: 'products', label: 'Sản phẩm' },
  { key: 'reports', label: 'Tố cáo sản phẩm' },
];

interface AdminProductGovernanceTabsProps {
  activeKey: ProductGovernanceTabKey;
}

const AdminProductGovernanceTabs = ({ activeKey }: AdminProductGovernanceTabsProps) => {
  const navigate = useNavigate();

  const handleChange = (key: string) => {
    navigate(key === 'reports' ? '/admin/product-governance/reports' : '/admin/product-governance');
  };

  return <PanelTabs items={productGovernanceTabs} activeKey={activeKey} onChange={handleChange} />;
};

export default AdminProductGovernanceTabs;
