import type { InferGetServerSidePropsType, GetServerSideProps } from "next";
import App from "../frontend/App";
import Head from "next/head";
import { getShareInfo } from "../frontend/share";

export const getServerSideProps = (async (context) => {
  const s = context.query["s"];
  const r = context.query["r"];
  const exclusive = context.query["exclusive"] !== "false";
  return {
    props: {
      s: (Array.isArray(s) ? s[0] : s) ?? "",
      r: (Array.isArray(r) ? r[0] : r) ?? "",
      exclusive,
    },
  };
}) satisfies GetServerSideProps<{
  s: string;
}>;

export default function Home({
  s,
  r,
  exclusive,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const shareInfo = getShareInfo(s, r);
  return (
    <>
      <Head>
        <title>Loop | Reflect</title>
        {/* Facebook Meta Tags */}
        <meta property="og:url" content="loop.reflect.net" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Loop | Reflect" />
        <meta
          property="og:title"
          content="Loop: High-performance beats for the multiplayer web."
        />
        <meta
          property="og:description"
          content={`${
            exclusive ? "2^24" : "2^64"
          } possibilities for your listening pleasure.`}
        />
        <meta
          property="og:image"
          content={
            shareInfo && shareInfo.encodedCells
              ? `https://loop.reflect.net/api/og?s=${shareInfo.encodedCells}`
              : `https://loop.reflect.net/api/og?s=040-153-220-261-362-453-511-572`
          }
        />
        <meta
          property="twitter:image"
          content={
            shareInfo && shareInfo.encodedCells
              ? `https://loop.reflect.net/api/og?s=${shareInfo.encodedCells}`
              : `https://loop.reflect.net/api/og?s=040-153-220-261-362-453-511-572`
          }
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@hello_reflect" />

        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <App shareInfo={shareInfo} exclusive={exclusive} />
    </>
  );
}
