export async function getServerSideProps() {
  return {
    notFound: true,
  };
}

export default function HiddenTestPage() {
  return null;
}
