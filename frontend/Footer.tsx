import classNames from "classnames";
import styles from "./Footer.module.css";
import Image from "next/image";
import { MaybePromise } from "@rocicorp/reflect";

const Footer = ({
  ctaText,
  createCtaURL,
  reflectUrl,
  onShare,
}: {
  ctaText: string;
  createCtaURL: () => MaybePromise<string>;
  reflectUrl: string;
  onShare: (() => void) | undefined;
}) => {
  const handleCta = async () => {
    const url = await createCtaURL();
    window.location.href = url;
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
            className={styles.createdWithReflect}
            priority={true}
          />
        </a>
        <div className={styles.footerLinks}>
          {onShare ? (
            <button onClick={onShare} className={styles.footerShare}>
              Share
            </button>
          ) : null}
          <button
            onClick={handleCta}
            className={classNames(styles.footerLink, styles.primaryCta)}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
