// Card.js
import React from "react";
import "./Card.css";

const Card = ({ data, imageKey = null, size = "md" }) => {
  if (!data) return null;

  const sizeClass = {
    sm: "card-sm",
    md: "card-md",
    lg: "card-lg",
  }[size] || "card-md";

  return (
    <div className={`card ${sizeClass}`}>
      {imageKey && data[imageKey] && (
        <img
          src={data[imageKey]}
          alt="visual"
          className="card-image"
        />
      )}
      <div className="card-content">
        {Object.entries(data).map(([key, value]) => {
          if (key === imageKey) return null;
          return (
            <div key={key} className="card-field">
              <span className="card-key">{key}:</span> {value}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Card;
