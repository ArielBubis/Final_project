import React from "react";
import PropTypes from "prop-types";
import "./Button.css";

export default function Button({ label, onClick, type, className , blue, wide }) {
   // Determine if button should be blue or wide
   const buttonClass = [
    "px-4 py-2 rounded", 
    blue ? "blue" : "", 
    wide ? "wide" : "", 
    className
  ].filter(Boolean).join(" "); // Filter out empty strings and join with space

  console.log("Button Class: ", buttonClass);  // Log class name to ensure blue is passed correctly

  return (
    <button 
      type={type} 
      onClick={onClick} 
      className={buttonClass}
    >
      {label}
    </button>
  );
}

// Define PropTypes
Button.propTypes = {
  label: PropTypes.string.isRequired,  // Ensures label is a required string
  onClick: PropTypes.func,              // Ensures onClick is a function
  type: PropTypes.oneOf(["button", "submit", "reset"]), // Limits type to valid HTML button types
  className: PropTypes.string,          // Optional className for styling
  blue: PropTypes.bool,
  wide: PropTypes.bool
};

// Default Props (optional)
Button.defaultProps = {
  type: "button",   // Default type is "button" if not specified
  className: "",    // Default empty class name
  blue: false,
  wide: false
};