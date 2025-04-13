// Card.js
import React from "react";
import "./Card.css";

const Card = ({ data, imageKey, size, type }) => {
  const cardClass = `card ${size ? `card-${size}` : ""} ${type ? `card-${type}` : ""}`;

  const sizeClass = {
    sm: "card-sm",
    md: "card-md",
    lg: "card-lg",
  }[size] || "card-md";

  return (
    <div className={cardClass}>
      <img src={data[imageKey]} alt={data.name} className="card-image" />
      <div className="card-content">
        {Object.keys(data).map((key) => (
          key !== imageKey && (
            <div className="card-field" key={key}>
              <span className="card-key">{key}:</span> {data[key]}
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default Card;
