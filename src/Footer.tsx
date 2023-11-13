import "./Footer.css";
import CreatedWithReflect from "../src/assets/created-with-reflect.svg?react";
import { useCallback } from "react";

const Footer = ({
  ctaText,
  createCtaURL,
  reflectUrl,
}: {
  ctaText: string;
  createCtaURL: () => Promise<string>;
  reflectUrl: string;
}) => {
  const handleCta = useCallback(async () => {
    window.location.href = await createCtaURL();
  }, [createCtaURL]);
  return (
    <footer className="footer">
      <div className="footer-content">
        <a href={reflectUrl}>
          <CreatedWithReflect className="createdWithReflect" />
        </a>
        <div className="footer-links">
          <a onClick={handleCta} className="footer-link primary-cta">
            {ctaText}
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
