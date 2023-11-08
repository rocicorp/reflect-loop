// Footer.tsx

import React from 'react';
import './Footer.css';
import CreatedWithReflect from "../src/assets/created-with-reflect.svg?react";

interface FooterProps {
  shareUrl: string;
  reflectUrl: string;
}

const Footer: React.FC<FooterProps> = ({shareUrl, reflectUrl}) => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <a href={reflectUrl}>
            <CreatedWithReflect className="createdWithReflect" />
        </a>
        <div className="footer-links">
          <a href={reflectUrl} className="footer-link primary-cta">Share</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;