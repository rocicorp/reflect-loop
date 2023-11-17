import "./Footer.css";
import CreatedWithReflect from "../src/assets/created-with-reflect.svg?react";

const Footer = ({
  ctaText,
  createCtaURL,
  reflectUrl,
  onOpenModal,
}: {
  ctaText: string;
  createCtaURL: () => Promise<string>;
  reflectUrl: string;
  onOpenModal: () => void;
}) => {
  const handleCta = async () => {
    window.location.href = await createCtaURL();
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <a href={reflectUrl}>
          <CreatedWithReflect className="createdWithReflect" />
        </a>
        <div className="footer-links">
          <button onClick={onOpenModal} className="footer-share">Share</button>
          <button onClick={handleCta} className="footer-link primary-cta">
            {ctaText}
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
