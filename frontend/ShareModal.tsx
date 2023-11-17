import React, { useEffect, useRef } from 'react';
import ShareSnapshot from "../src/assets/share-snapshot.svg?react";
import ShareCollaboration from "../src/assets/share-collaborate.svg?react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close the modal if clicked outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" ref={modalRef}>
        <button className="close-btn" onClick={onClose}></button>
        <h2 className="modal-title">Share</h2>
        <div className="share-options-container">
            <div className="share-option">
              <h3 className="share-option-title">Snapshot</h3>
              <ShareSnapshot className="share-option-visual" />
              <p>Current state, read only.</p>
              <button className="share-cta">Copy Link</button>
            </div>
            <div className="share-option">
              <h3 className="share-option-title">Collaborate</h3>
              <ShareCollaboration className="share-option-visual" />
              <p>Viewers can edit, collaborate.</p>
              <button className="share-cta">Copy Link</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
