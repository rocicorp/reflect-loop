import type { InferGetServerSidePropsType, GetServerSideProps } from "next";
import App from "../frontend/App";
import Head from "next/head";
import { getShareInfo } from "../frontend/share";

export const getServerSideProps = (async (context) => {
  const s = context.query["s"];
  return {
    props: {
      s: (Array.isArray(s) ? s[0] : s) ?? "",
    },
  };
}) satisfies GetServerSideProps<{
  s: string;
}>;

export default function Home({
  s,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const shareInfo = getShareInfo(s);
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
          content="2^64 possibilities for your listening pleasure."
        />
        <meta
          property="og:image"
          content={
            shareInfo
              ? `https://loop.reflect.net/api/og?s=${shareInfo.encodedCells}`
              : `https://loop.reflect.net/api/og?s=076-118-126-208-218-226-253-288-298-333-483-503-523-586-613`
          }
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <App shareInfo={shareInfo} />
    </>
  );
}
