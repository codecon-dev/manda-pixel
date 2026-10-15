import Image from 'next/image';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="absolute top-4 left-4">
        <Image src="/logo.svg" alt="Manda Pixel Logo" width={40} height={40} />
      </div>
      <h1 className="text-5xl font-bold">Manda Pixel</h1>
    </main>
  );
}
