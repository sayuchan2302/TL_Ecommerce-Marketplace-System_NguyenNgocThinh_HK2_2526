import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './HeroSlider.css';

const slides = [
  {
    title: 'BỘ SƯU TẬP HÈ 2026',
    subtitle: 'Chất liệu mát, form fit tự tin ra phố',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1920&auto=format&fit=crop',
    cta: 'Khám phá ngay',
  },
  {
    title: 'POLO COOLMAX SIÊU THOÁNG',
    subtitle: 'Khử mùi, thấm hút tốt, 10 phối màu mới',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1920&auto=format&fit=crop',
    cta: 'Mua polo',
  },
  {
    title: 'QUẦN ACTIVE SERIES',
    subtitle: 'Co giãn 4 chiều, nhẹ và khô nhanh',
    image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=1920&auto=format&fit=crop',
    cta: 'Thử ngay',
  },
  {
    title: 'SUMMER ESSENTIALS',
    subtitle: 'Tối giản, nhẹ nhàng, phối nhanh mọi dịp',
    image: 'https://images.unsplash.com/photo-1500522144261-ea64433bbe27?q=80&w=1920&auto=format&fit=crop',
    cta: 'Xem lookbook',
  },
  {
    title: 'COLLECTION DENIM',
    subtitle: 'Form slim, wash đẹp, bền màu lâu dài',
    image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=1920&auto=format&fit=crop',
    cta: 'Mua denim',
  },
];

const AUTO_DELAY = 5500;

const HeroSlider = () => {
  const loopSlides = [slides[slides.length - 1], ...slides, slides[0]];
  const [position, setPosition] = useState(1); // index in loopSlides (offset by 1)
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startXRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const restartTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIsTransitioning(true);
      setPosition((prev) => prev + 1);
    }, AUTO_DELAY);
  };

  useEffect(() => {
    restartTimer();
    return () => { timerRef.current && clearInterval(timerRef.current); };
  }, [position]);

  const next = () => {
    setIsTransitioning(true);
    setPosition((prev) => prev + 1);
    restartTimer();
  };

  const prev = () => {
    setIsTransitioning(true);
    setPosition((prev) => prev - 1);
    restartTimer();
  };

  const handleTransitionEnd = () => {
    if (position === slides.length + 1) {
      setIsTransitioning(false);
      setPosition(1);
    } else if (position === 0) {
      setIsTransitioning(false);
      setPosition(slides.length);
    }
  };

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

  const dragOffsetPercent = (() => {
    if (!isDragging || !trackRef.current) return 0;
    const width = trackRef.current.clientWidth;
    if (!width) return 0;
    return (dragOffset / width) * 100;
  })();

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
              <button className="hero-btn">{slide.cta}</button>
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
