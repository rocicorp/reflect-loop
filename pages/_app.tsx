import { AppProps } from "next/app";
import "../frontend/global.css";

export default function App({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Component,
  pageProps,
}: AppProps) {
  return (
    <>
      <Component {...pageProps} />
    </>
  );
}
