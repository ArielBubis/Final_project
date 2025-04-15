import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import styles from "../styles/modules/Carousel.module.css";
import classNames from "classnames";

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

  const prevButtonClasses = classNames(
    styles.carouselButton, 
    styles.prev, 
    { [styles.disabled]: currentIndex === 0 }
  );

  const nextButtonClasses = classNames(
    styles.carouselButton, 
    styles.next, 
    { [styles.disabled]: currentIndex >= items.length - itemsPerView }
  );

  return (
    <div className={styles.carouselContainer}>
      <button
        className={prevButtonClasses}
        onClick={prevItem}
        disabled={currentIndex === 0}
        aria-label="Previous items"
      >
        &lt;
      </button>
      <div className={styles.carouselCards}>
        <div
          className={styles.carouselCardsWrapper}
          style={transformStyle}
        >
          {items.map((item, index) => (
            <div className={styles.carouselCard} key={index}>
              {item}
            </div>
          ))}
        </div>
      </div>
      <button
        className={nextButtonClasses}
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