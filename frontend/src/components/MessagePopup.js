import React from 'react';
import styles from '../styles/modules/MessagePopup.module.css';
import classNames from 'classnames';

const MessagePopup = ({ message, isOpen, onClose, type = 'success' }) => {
  if (!isOpen) return null;

  const containerClasses = classNames(
    styles.popupContainer,
    { [styles.success]: type === 'success', [styles.error]: type === 'error' }
  );

  return (
    <div className={styles.popupOverlay}>
      <div className={containerClasses}>
        <div className={styles.popupContent}>
          <div className={styles.popupHeader}>
            <h3>{type === 'success' ? 'Success' : 'Notification'}</h3>
            <button className={styles.closeButton} onClick={onClose}>×</button>
          </div>
          <div className={styles.popupBody}>
            <p>{message}</p>
          </div>
          <div className={styles.popupFooter}>
            <button className={styles.popupButton} onClick={onClose}>OK</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagePopup;