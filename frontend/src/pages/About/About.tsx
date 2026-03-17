import { Link } from 'react-router-dom';
import { ChevronRight, Users, Award, Heart, Truck } from 'lucide-react';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      <div className="about-container">
        {/* Breadcrumb */}
        <div className="about-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Về chúng tôi</span>
        </div>

        {/* Hero */}
        <div className="about-hero">
          <div className="about-hero-content">
            <h1 className="about-hero-title">Câu chuyện Coolmate</h1>
            <p className="about-hero-desc">
              Coolmate ra đời với sứ mệnh mang đến trải nghiệm mua sắm thời trang nam giản đơn, tiện lợi 
              và chất lượng nhất cho cộng đồng người Việt.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="about-stats">
          <div className="about-stat">
            <span className="about-stat-number">5M+</span>
            <span className="about-stat-label">Sản phẩm đã bán</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-number">1M+</span>
            <span className="about-stat-label">Khách hàng hài lòng</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-number">60</span>
            <span className="about-stat-label">Ngày đổi trả</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-number">4.8★</span>
            <span className="about-stat-label">Đánh giá trung bình</span>
          </div>
        </div>

        {/* Values */}
        <div className="about-values">
          <h2 className="about-section-title">Giá trị cốt lõi</h2>
          <div className="about-values-grid">
            <div className="about-value-card">
              <div className="about-value-icon"><Award size={28} /></div>
              <h3>Chất lượng</h3>
              <p>Kiểm soát chất lượng nghiêm ngặt từ nguyên liệu đến thành phẩm.</p>
            </div>
            <div className="about-value-card">
              <div className="about-value-icon"><Heart size={28} /></div>
              <h3>Trải nghiệm</h3>
              <p>Đặt trải nghiệm khách hàng làm trung tâm trong mọi quyết định.</p>
            </div>
            <div className="about-value-card">
              <div className="about-value-icon"><Truck size={28} /></div>
              <h3>Tiện lợi</h3>
              <p>Giao hàng nhanh, đổi trả dễ dàng, thanh toán đa dạng.</p>
            </div>
            <div className="about-value-card">
              <div className="about-value-icon"><Users size={28} /></div>
              <h3>Cộng đồng</h3>
              <p>Xây dựng cộng đồng hơn 1 triệu thành viên CoolClub.</p>
            </div>
          </div>
        </div>

        {/* Story */}
        <div className="about-story">
          <h2 className="about-section-title">Hành trình phát triển</h2>
          <div className="about-story-wrapper">
            <img 
              src="https://media.coolmate.me/cdn-cgi/image/width=1000,quality=80,format=auto/uploads/November2023/IMG_8203_1.jpg" 
              alt="Coolmate Team" 
              className="about-story-img"
            />
            <div className="about-timeline">
              <div className="timeline-item">
                <div className="timeline-year">2019</div>
                <div className="timeline-content">
                  <h4>Thành lập Coolmate</h4>
                  <p>Bắt đầu với sứ mệnh đơn giản hóa việc mua sắm thời trang nam.</p>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-year">2020</div>
                <div className="timeline-content">
                  <h4>Mở rộng quy mô</h4>
                  <p>Đạt mốc 100.000 khách hàng, ra mắt ứng dụng di động.</p>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-year">2022</div>
                <div className="timeline-content">
                  <h4>Gọi vốn thành công</h4>
                  <p>Nhận đầu tư từ Shark Tank Việt Nam, mở rộng dòng sản phẩm.</p>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-year">2024</div>
                <div className="timeline-content">
                  <h4>Vươn tầm khu vực</h4>
                  <p>Hơn 1 triệu khách hàng, mở rộng sang thị trường Đông Nam Á.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
