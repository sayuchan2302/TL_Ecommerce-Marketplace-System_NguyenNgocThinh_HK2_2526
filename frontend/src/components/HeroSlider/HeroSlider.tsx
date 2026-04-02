import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ShieldCheck, Store } from 'lucide-react';
import './HeroSlider.css';

const slides = [
  {
    title: 'SIÊU SALE ĐA CỬA HÀNG',
    subtitle: 'Hàng chính hãng từ hàng nghìn vendor đã xác thực',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1920&auto=format&fit=crop',
    cta: 'Khám phá sản phẩm',
    ctaLink: '/search?scope=products',
  },
  {
    title: 'Mua sắm an toàn, Platform bảo vệ 100%',
    subtitle: 'Thanh toán giữ tại sàn (escrow) cho đến khi đơn giao thành công',
    image: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?q=80&w=1920&auto=format&fit=crop',
    cta: 'Xem cam kết sàn',
    ctaLink: '/policy/bao-mat',
    icon: <ShieldCheck size={20} strokeWidth={1.8} />,
  },
  {
    title: 'Trở thành đối tác Marketplace',
    subtitle: 'Tiếp cận 5 triệu khách hàng và hệ thống vận hành chuẩn sàn',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1920&auto=format&fit=crop',
    cta: 'Đăng ký bán hàng',
    ctaLink: '/vendor/register',
    icon: <Store size={20} strokeWidth={1.8} />,
  },
];

const AUTO_DELAY = 5500;

const HeroSlider = () => {
  const navigate = useNavigate();
  const loopSlides = [slides[slides.length - 1], ...slides, slides[0]];
  const [position, setPosition] = useState(1); // index in loopSlides (offset by 1)
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const startXRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const maxPos = slides.length + 1;

  const restartTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setIsTransitioning(true);
      setPosition((prev) => Math.min(maxPos, prev + 1));
    }, AUTO_DELAY);
  }, [maxPos]);

  useEffect(() => {
    restartTimer();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [restartTimer]);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;

    const updateTrackWidth = () => {
      setTrackWidth(node.clientWidth);
    };

    updateTrackWidth();

    const observer = new ResizeObserver(updateTrackWidth);
    observer.observe(node);
    window.addEventListener('resize', updateTrackWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateTrackWidth);
    };
  }, []);

  const next = () => {
    setIsTransitioning(true);
    setPosition((prev) => Math.min(maxPos, prev + 1));
    restartTimer();
  };

  const prev = () => {
    setIsTransitioning(true);
    setPosition((prev) => Math.max(0, prev - 1));
    restartTimer();
  };

  const handleTransitionEnd = () => {
    if (position === slides.length + 1) {
      setIsTransitioning(false);
      setPosition(1);
    } else if (position === 0) {
      setIsTransitioning(false);
      setPosition(slides.length);
    } else if (position > slides.length + 1) {
      setIsTransitioning(false);
      setPosition(slides.length + 1);
    } else if (position < 0) {
      setIsTransitioning(false);
      setPosition(0);
    }
  };

  // Re-enable transition on the next frame after snapping to a loop position
  useEffect(() => {
    if (!isTransitioning) {
      const id = requestAnimationFrame(() => setIsTransitioning(true));
      return () => cancelAnimationFrame(id);
    }
  }, [isTransitioning]);

  const handlePointerDown = (clientX: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsDragging(true);
    startXRef.current = clientX;
    setDragOffset(0);
    setIsTransitioning(false);
  };

  const handlePointerMove = (clientX: number) => {
    if (!isDragging) return;
    setDragOffset(clientX - startXRef.current);
  };

  const handlePointerUp = (clientX: number) => {
    if (!isDragging) return;
    const delta = clientX - startXRef.current;
    const threshold = 50;
    setIsDragging(false);
    setDragOffset(0);
    if (delta > threshold) {
      prev();
    } else if (delta < -threshold) {
      next();
    } else {
      setIsTransitioning(true);
      restartTimer();
    }
  };

  const handlePointerLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragOffset(0);
      setIsTransitioning(true);
      restartTimer();
    }
  };

  const dragOffsetPercent = isDragging && trackWidth ? (dragOffset / trackWidth) * 100 : 0;

  return (
    <section className="hero-slider">
      <div
        className="hero-track"
        ref={trackRef}
        style={{
          transform: `translateX(calc(-${position * 100}% + ${dragOffsetPercent}%))`,
          transition: isTransitioning ? 'transform 0.7s ease' : 'none',
        }}
        onPointerDown={(e) => handlePointerDown(e.clientX)}
        onPointerMove={(e) => handlePointerMove(e.clientX)}
        onPointerUp={(e) => handlePointerUp(e.clientX)}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
        onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
        onTouchEnd={(e) => handlePointerUp(e.changedTouches[0].clientX)}
        onTransitionEnd={handleTransitionEnd}
      >
        {loopSlides.map((slide, i) => (
          <div key={`${slide.title}-${i}`} className="hero-slide">
            <img
              src={slide.image}
              alt={slide.title}
              className="hero-image"
              loading={i === position ? 'eager' : 'lazy'}
            />
            <div className="hero-overlay" />
            <div className="hero-content">
              <h1 className="hero-title">{slide.title}</h1>
              <p className="hero-subtitle">{slide.subtitle}</p>
              {slide.icon && <div className="hero-slide-icon">{slide.icon}</div>}
              <button
                className="hero-btn"
                onClick={() => {
                  if (slide.ctaLink) {
                    navigate(slide.ctaLink);
                  }
                }}
              >
                {slide.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="hero-nav prev" onClick={prev} aria-label="Slide trước">
        <ChevronLeft size={22} />
      </button>
      <button className="hero-nav next" onClick={next} aria-label="Slide tiếp">
        <ChevronRight size={22} />
      </button>
    </section>
  );
};

export default HeroSlider;
