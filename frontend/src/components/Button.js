import React from "react";
import PropTypes from "prop-types";
import styles from "../styles/modules/Button.module.css";
import classNames from "classnames";

export default function Button({ label, onClick, type, className = "", variant = "default", size = "medium" }) {
  const buttonClasses = classNames(
    styles.button,
    styles[variant],
    styles[size],
    className
  );

  return (
    <div className={styles.componentButton}>
      <button 
        type={type} 
        onClick={onClick} 
        className={buttonClasses}
      >
        {label}
      </button>
    </div>
  );
}

// Define PropTypes
Button.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(["button", "submit", "reset"]),
  className: PropTypes.string,
  variant: PropTypes.oneOf(["default", "primary", "secondary", "blue", "danger"]),
  size: PropTypes.oneOf(["small", "medium", "large", "wide"])
};

// Default Props
Button.defaultProps = {
  type: "button",
  className: "",
  variant: "default",
  size: "medium"
};