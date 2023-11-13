import "./Footer.css";
import CreatedWithReflect from "../src/assets/created-with-reflect.svg?react";

const Footer = ({
  createShareURL,
  reflectUrl,
}: {
  createShareURL: () => Promise<string>;
  reflectUrl: string;
}) => {
  const handleShare = async () => {
    window.location.href = await createShareURL();
  };
  return (
    <footer className="footer">
      <div className="footer-content">
        <a href={reflectUrl}>
          <CreatedWithReflect className="createdWithReflect" />
        </a>
        <div className="footer-links">
          <a onClick={handleShare} className="footer-link primary-cta">
            Share
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
