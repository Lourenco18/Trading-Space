// pages/index.js
// The app lives in /public/index.html which Next.js serves automatically.
// This file exists only to satisfy Next.js routing.
export default function Home() { return null; }

export async function getServerSideProps({ res }) {
  res.writeHead(302, { Location: '/index.html' });
  res.end();
  return { props: {} };
}
