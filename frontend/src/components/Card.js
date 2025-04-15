import React from "react";
import PropTypes from "prop-types";
import styles from "../styles/modules/Card.module.css";
import classNames from "classnames";

const Card = ({ data, imageKey, size, type }) => {
  const cardClasses = classNames(
    styles.card,
    styles[size],
    styles[type]
  );

  return (
    <div className={cardClasses}>
      <img src={data[imageKey]} alt={data.name} className={styles.cardImage} />
      <div className={styles.cardContent}>
        {Object.keys(data).map((key) => (
          key !== imageKey && (
            <div className={styles.cardField} key={key}>
              <span className={styles.cardKey}>{key}:</span> {data[key]}
            </div>
          )
        ))}
      </div>
    </div>
  );
};

Card.propTypes = {
  data: PropTypes.object.isRequired,
  imageKey: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  type: PropTypes.oneOf(['course', 'student'])
};

Card.defaultProps = {
  size: 'md',
  type: 'course'
};

export default Card;
