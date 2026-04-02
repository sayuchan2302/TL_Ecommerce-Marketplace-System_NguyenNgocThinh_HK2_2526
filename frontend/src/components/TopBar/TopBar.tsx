import './TopBar.css';
import { Link } from 'react-router-dom';

const TopBar = () => {
  return (
    <div className="topbar">
      <div className="topbar-content container">
        <Link to="/vendor/register" className="topbar-item topbar-item-primary">
          Bán hàng cùng COOLMATE Marketplace
        </Link>
      </div>
    </div>
  );
};

export default TopBar;
