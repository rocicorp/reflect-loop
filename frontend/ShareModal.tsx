import React, { useEffect, useRef } from "react";
import styles from "./ShareModal.module.css";
import Image from "next/image";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close the modal if clicked outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} ref={modalRef}>
        <button className={styles.closeBtn} onClick={onClose}></button>
        <h2 className={styles.modalTitle}>Share</h2>
        <div className={styles.shareOptionsContainer}>
          <div className={styles.shareOption}>
            <h3 className={styles.shareOptionTitle}>Snapshot</h3>
            <Image
              alt="Share a snapshot"
              src="/share-snapshot.svg"
              width="120"
              height="120"
              className={styles.shareOptionVisual}
            />
            <p>Current state, read only.</p>
            <button className={styles.shareCta}>Copy Link</button>
          </div>
          <div className={styles.shareOption}>
            <h3 className={styles.shareOptionTitle}>Collaborate</h3>
            <Image
              alt="Share to collaborate"
              src="/share-collaborate.svg"
              width="120"
              height="120"
              className={styles.shareOptionVisual}
            />
            <p>Viewers can edit, collaborate.</p>
            <button className={styles.shareCta}>Copy Link</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
