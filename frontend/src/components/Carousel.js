import React, { useState, useEffect } from "react";
import "../styles/styles.css";

const Carousel = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0); // Start from the first item
  const [itemsPerView, setItemsPerView] = useState(window.innerWidth <= 768 ? 1 : 2);

  // Ensure proper scrolling logic for the carousel
  const nextItem = () => {
    if (currentIndex < items.length - itemsPerView) {
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }
  };

  const prevItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prevIndex) => prevIndex - 1);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setItemsPerView(window.innerWidth <= 768 ? 1 : 2);
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Set initial value

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="carousel-container">
      <button
        className="carousel-button prev"
        onClick={prevItem}
        disabled={currentIndex === 0} // Disable when at the first item
      >
        &lt;
      </button>
      <div className="carousel-cards">
        <div
          className="carousel-cards-wrapper"
          style={{
            transform: `translateX(-${currentIndex * 50}%)`, // Adjusting for 2 cards at a time
          }}
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
        disabled={currentIndex >= items.length - 2} // Disable when at the last item
      >
        &gt;
      </button>
    </div>
  );
};

export default Carousel;
