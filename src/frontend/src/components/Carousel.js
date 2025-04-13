import React, { useState } from "react";
import "./Carousel.css";

const Carousel = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0); // Start from the first item
  const [itemsPerView, setItemsPerView] = useState(window.innerWidth <= 768 ? 1 : 2);


  // Handle the next item action (move by 2 items at a time)
  const nextItem = () => {
    if (currentIndex < items.length - 2) {
      setCurrentIndex((prevIndex) => prevIndex + 2);
    }
  };

  // Handle the previous item action (move by 2 items at a time)
  const prevItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prevIndex) => prevIndex - 2);
    }
  };

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
