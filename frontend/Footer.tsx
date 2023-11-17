import classNames from "classnames";
import styles from "./Footer.module.css";
import Image from "next/image";

const Footer = ({
  ctaText,
  createCtaURL,
  reflectUrl,
}: {
  ctaText: string;
  createCtaURL: () => Promise<string>;
  reflectUrl: string;
}) => {
  const handleCta = async () => {
    window.location.href = await createCtaURL();
  };
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <a href={reflectUrl}>
          <Image
            alt="Created with Reflect"
            src="/created-with-reflect.svg"
            width={142}
            height={56}
            className="createdWithReflect"
            priority={true}
          />
        </a>
        <div className={styles.footerLinks}>
          <a
            onClick={handleCta}
            className={classNames(styles.footerLink, styles.primaryCta)}
          >
            {ctaText}
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
