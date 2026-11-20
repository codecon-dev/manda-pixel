import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/app/components/LegalLayout";
import { loadAdvertisers } from "@/app/lib/advertisers-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anunciantes",
  description: "Os projetos que já compraram pixels no Manda Pixel, com link pra cada um.",
  alternates: { canonical: "/anunciantes" },
};

function today(): string {
  return new Date().toLocaleDateString("pt-BR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  });
}

export default function AnunciantesPage() {
  const advertisers = loadAdvertisers();
  return (
    <LegalLayout title="Quem já está na grade do Manda Pixel" updatedAt={today()}>
      <p>
        São 1 milhão de pixels a R$ 1 cada. Quem compra escolhe o lugar na grade e o anúncio fica lá pra sempre.
      </p>
      <p>
        <Link
          href="/"
          className="inline-block rounded-md bg-purple-950 px-5 py-3 font-semibold text-white hover:bg-purple-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-950"
        >
          Escolher meu lugar
        </Link>
      </p>

      {advertisers.length === 0 ? (
        <p>Ninguém ainda. O primeiro lugar é seu.</p>
      ) : (
        <ol className="list-decimal space-y-2 pl-6 tabular-nums">
          {advertisers.map((ad) => (
            <li key={ad.id} value={ad.number}>
              <Link href={ad.href} className="font-semibold text-purple-950 underline underline-offset-2 break-words">
                {ad.name}
              </Link>
              {ad.domain && <span className="block text-sm text-stone-600 sm:ml-2 sm:inline">{ad.domain}</span>}
            </li>
          ))}
        </ol>
      )}
    </LegalLayout>
  );
}
