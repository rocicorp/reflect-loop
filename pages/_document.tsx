import Document, { Html, Head, Main, NextScript } from "next/document";

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <meta charSet="UTF-8" />
          <link
            rel="icon"
            type="image/svg+xml"
            media="(prefers-color-scheme: light)"
            href="/favicon-light.svg"
          />
          <link
            rel="icon"
            type="image/svg+xml"
            media="(prefers-color-scheme: dark)"
            href="/favicon-dark.svg"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
