import './TrustBadges.css';
import { Truck, RefreshCcw, HeadphonesIcon } from 'lucide-react';

const TrustBadges = () => {
  const badges = [
    {
      icon: <Truck size={32} strokeWidth={1.5} />,
      title: "Sàn bảo đảm thanh toán",
      desc: "Tiền đơn hàng giữ tại escrow đến khi giao thành công"
    },
    {
      icon: <RefreshCcw size={32} strokeWidth={1.5} />,
      title: "Chính sách đổi trả sàn",
      desc: "Sàn can thiệp hoàn tiền nếu vendor không xử lý đúng hạn"
    },
    {
      icon: <HeadphonesIcon size={32} strokeWidth={1.5} />,
      title: "Hỗ trợ sàn 24/7",
      desc: "Đội ngũ marketplace hỗ trợ xuyên suốt mua bán"
    }
  ];

  return (
    <section className="trust-badges">
      <div className="container">
        <div className="badges-grid">
          {badges.map((badge, index) => (
            <div key={index} className="badge-item">
              <div className="badge-icon">{badge.icon}</div>
              <h4 className="badge-title">{badge.title}</h4>
              <p className="badge-desc">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
