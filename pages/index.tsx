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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <App shareInfo={shareInfo} />
    </>
  );
}
