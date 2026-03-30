import Head from 'next/head';
import Shell from '@/components/Shell';

export default function Home() {
  return (
    <>
      <Head>
        <title>ALAN OS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Shell />
    </>
  );
}
