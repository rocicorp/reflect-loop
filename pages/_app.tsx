import { AppProps } from "next/app";
import { GoogleAnalytics } from "nextjs-google-analytics";
import "../frontend/global.css";

export default function App({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Component,
  pageProps,
}: AppProps) {
  return (
    <>
      <GoogleAnalytics trackPageViews />
      <Component {...pageProps} />
    </>
  );
}
