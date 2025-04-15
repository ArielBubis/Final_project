import React from "react";
import PropTypes from "prop-types";
import "../styles/Button.css";

export default function Button({ label, onClick, type, className = "", variant = "default", size = "medium" }) {
  // Create a base class name from the component-button class
  const baseClass = "component-button-inner";
  
  // Add variant and size modifiers using BEM-like naming
  const variantClass = variant !== "default" ? `${baseClass}--${variant}` : "";
  const sizeClass = size !== "medium" ? `${baseClass}--${size}` : "";
  
  // Combine all classes
  const buttonClass = `${baseClass} ${variantClass} ${sizeClass} ${className}`.trim();

  return (
    <div className="component-button">
      <button 
        type={type} 
        onClick={onClick} 
        className={buttonClass}
      >
        {label}
      </button>
    </div>
  );
}

// Define PropTypes
Button.propTypes = {
  label: PropTypes.string.isRequired,  // Ensures label is a required string
  onClick: PropTypes.func,              // Ensures onClick is a function
  type: PropTypes.oneOf(["button", "submit", "reset"]), // Limits type to valid HTML button types
  className: PropTypes.string,          // Optional className for styling
  variant: PropTypes.oneOf(["default", "primary", "secondary", "blue", "danger"]), // Button style variants
  size: PropTypes.oneOf(["small", "medium", "large", "wide"]) // Button size variants
};

// Default Props
Button.defaultProps = {
  type: "button",   // Default type is "button" if not specified
  className: "",    // Default empty class name
  variant: "default",
  size: "medium"
};