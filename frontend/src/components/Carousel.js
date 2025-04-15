// filepath: e:\Libraries\My Documents\University\Year 4\FinalProject\website\Final_project\frontend\src\components\Carousel.js
import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import "../styles/Carousel.css";

const Carousel = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(window.innerWidth <= 768 ? 1 : 2);

  const nextItem = useCallback(() => {
    if (currentIndex < items.length - itemsPerView) {
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }
  }, [currentIndex, items.length, itemsPerView]);

  const prevItem = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prevIndex) => prevIndex - 1);
    }
  }, [currentIndex]);

  useEffect(() => {
    const handleResize = () => {
      const newItemsPerView = window.innerWidth <= 768 ? 1 : 2;
      setItemsPerView(newItemsPerView);
      // Ensure currentIndex doesn't exceed max possible index
      if (currentIndex > items.length - newItemsPerView) {
        setCurrentIndex(Math.max(0, items.length - newItemsPerView));
      }
    };

    const debouncedResize = debounce(handleResize, 250);
    window.addEventListener("resize", debouncedResize);
    handleResize(); // Set initial value

    return () => window.removeEventListener("resize", debouncedResize);
  }, [currentIndex, items.length]);

  const transformStyle = useMemo(() => ({
    transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
  }), [currentIndex, itemsPerView]);

  return (
    <div className="carousel-container">
      <button
        className="carousel-button prev"
        onClick={prevItem}
        disabled={currentIndex === 0}
        aria-label="Previous items"
      >
        &lt;
      </button>
      <div className="carousel-cards">
        <div
          className="carousel-cards-wrapper"
          style={transformStyle}
        >
          {items.map((item, index) => (
            <div className="carousel-card" key={index}>
              {item}
            </div>
          ))}
        </div>
      </div>
      <button
        className="carousel-button next"
        onClick={nextItem}
        disabled={currentIndex >= items.length - itemsPerView}
        aria-label="Next items"
      >
        &gt;
      </button>
    </div>
  );
};

// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

Carousel.propTypes = {
  items: PropTypes.arrayOf(PropTypes.node).isRequired
};

export default React.memo(Carousel);