import React from 'react';
import '../styles/MessagePopup.css';

const MessagePopup = ({ message, isOpen, onClose, type = 'success' }) => {
  if (!isOpen) return null;

  return (
    <div className="popup-overlay">
      <div className={`popup-container ${type}`}>
        <div className="popup-content">
          <div className="popup-header">
            <h3>{type === 'success' ? 'Success' : 'Notification'}</h3>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="popup-body">
            <p>{message}</p>
          </div>
          <div className="popup-footer">
            <button className="popup-button" onClick={onClose}>OK</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagePopup;