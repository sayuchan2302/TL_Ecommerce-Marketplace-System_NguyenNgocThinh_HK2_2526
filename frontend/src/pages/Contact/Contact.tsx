import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Send, ChevronRight } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import './Contact.css';

const Contact = () => {
  const { addToast } = useToast();

  return (
    <div className="contact-page">
      <div className="contact-container">
        {/* Breadcrumb */}
        <div className="contact-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} />
          <span>Liên hệ</span>
        </div>

        <h1 className="contact-title">Liên hệ với chúng tôi</h1>
        <p className="contact-subtitle">Coolmate luôn sẵn sàng lắng nghe và hỗ trợ bạn!</p>

        <div className="contact-layout">
          {/* Contact Info */}
          <div className="contact-info-col">
            <div className="contact-info-card">
              <div className="ci-item">
                <div className="ci-icon"><Phone size={20} /></div>
                <div>
                  <h4>Hotline</h4>
                  <p><strong>1900.27.27.37</strong></p>
                  <p className="ci-sub">(028.7777.2737)</p>
                </div>
              </div>
              <div className="ci-item">
                <div className="ci-icon"><Mail size={20} /></div>
                <div>
                  <h4>Email</h4>
                  <p>cool@coolmate.me</p>
                </div>
              </div>
              <div className="ci-item">
                <div className="ci-icon"><Clock size={20} /></div>
                <div>
                  <h4>Giờ làm việc</h4>
                  <p>Thứ 2 - Thứ 7: 8:00 - 22:00</p>
                  <p className="ci-sub">Chủ nhật: 9:00 - 17:00</p>
                </div>
              </div>
              <div className="ci-item">
                <div className="ci-icon"><MapPin size={20} /></div>
                <div>
                  <h4>Văn phòng Hà Nội</h4>
                  <p>Tầng 3-4, BMM, KM2, Phùng Hưng, Hà Đông, Hà Nội</p>
                </div>
              </div>
              <div className="ci-item">
                <div className="ci-icon"><MapPin size={20} /></div>
                <div>
                  <h4>Văn phòng TP.HCM</h4>
                  <p>Lầu 1, 163 Trần Trọng Cung, Quận 7, TP.HCM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-col">
            <div className="contact-form-container">
              <h2 className="contact-title">Gửi tin nhắn cho chúng tôi</h2>
              <form className="contact-form" onSubmit={(e) => { e.preventDefault(); addToast('Cảm ơn bạn! Tin nhắn đã được gửi.', 'success'); e.currentTarget.reset(); }}>
                <div className="form-group">
                  <div className="cf-group">
                    <label>Họ và tên</label>
                    <input type="text" placeholder="Nhập họ và tên" required />
                  </div>
                  <div className="cf-group">
                    <label>Email</label>
                    <input type="email" placeholder="Nhập email" required />
                  </div>
                </div>
                <div className="cf-group">
                  <label>Số điện thoại</label>
                  <input type="tel" placeholder="Nhập số điện thoại" />
                </div>
                <div className="cf-group">
                  <label>Chủ đề</label>
                  <select>
                    <option value="">-- Chọn chủ đề --</option>
                    <option>Hỏi về sản phẩm</option>
                    <option>Đổi / trả hàng</option>
                    <option>Khiếu nại đơn hàng</option>
                    <option>Góp ý dịch vụ</option>
                    <option>Khác</option>
                  </select>
                </div>
                <div className="cf-group">
                  <label>Nội dung</label>
                  <textarea rows={5} placeholder="Viết tin nhắn của bạn..." required></textarea>
                </div>
                <button type="submit" className="cf-submit-btn">
                  <Send size={16} />
                  Gửi tin nhắn
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
