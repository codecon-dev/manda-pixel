import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/app/components/LegalLayout";
import {
  BLOCK_SIZE,
  PIXEL_PRICE_BRL,
  PROHIBITED,
  RESERVATION_MINUTES,
  TOTAL_PIXELS,
} from "@/app/lib/constants";
import { FAQ_ITEMS, buildFaqPageJsonLd, serializeJsonLd } from "@/app/lib/faq";

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Como comprar pixels no Manda Pixel: R$ 1 por pixel, blocos a partir de 5x5, você escolhe a posição e o anúncio fica no ar pra sempre.",
  alternates: { canonical: "/como-funciona" },
};

const H2 = "text-xl font-bold text-stone-950";
const MIN_AD_BRL = BLOCK_SIZE * BLOCK_SIZE * PIXEL_PRICE_BRL;
const totalPixels = TOTAL_PIXELS.toLocaleString("pt-BR");

export default function ComoFuncionaPage() {
  return (
    <LegalLayout title="Como funciona" updatedAt="outubro de 2026">
      <section>
        <h2 className={H2}>O que é</h2>
        <p className="mt-2">
          Uma releitura do Million Dollar Homepage de 2005: uma grade de {totalPixels} de pixels onde cada pedaço vira
          anúncio. Quem opera tudo é uma IA, em público, com os números abertos.
        </p>
      </section>

      <section>
        <h2 className={H2}>Quanto custa</h2>
        <p className="mt-2">
          R$ {PIXEL_PRICE_BRL} por pixel. O bloco mínimo é de {BLOCK_SIZE}x{BLOCK_SIZE}, ou seja, R$ {MIN_AD_BRL}, e
          os lados crescem de {BLOCK_SIZE} em {BLOCK_SIZE}.
        </p>
        <p className="mt-2">
          Na dúvida do tamanho?{" "}
          <Link href="/previa" className="font-semibold text-purple-950 underline underline-offset-2">
            Veja seu logo na grade antes de comprar
          </Link>{" "}
          e baixe a imagem pra mostrar pra alguém.
        </p>
      </section>

      <section>
        <h2 className={H2}>Como escolher a posição</h2>
        <p className="mt-2">
          Você escolhe qualquer área livre na grade. Quem chega primeiro pega o centro.
        </p>
      </section>

      <section>
        <h2 className={H2}>Reserva</h2>
        <p className="mt-2">
          Ao ir para o pagamento, a área fica reservada por {RESERVATION_MINUTES} minutos. Se não pagar nesse tempo,
          ela volta a ficar livre.
        </p>
      </section>

      <section>
        <h2 className={H2}>Pra sempre</h2>
        <p className="mt-2">
          O anúncio é permanente: fica no ar enquanto o site existir, sem mensalidade nem renovação.
        </p>
      </section>

      <section>
        <h2 className={H2}>O que não aceitamos</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          {PROHIBITED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className={H2}>Perguntas frequentes</h2>
        <dl className="mt-2 space-y-4">
          {FAQ_ITEMS.map((item) => (
            <div key={item.question}>
              <dt className="font-semibold text-stone-950">{item.question}</dt>
              <dd className="mt-1">{item.answer}</dd>
            </div>
          ))}
        </dl>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildFaqPageJsonLd(FAQ_ITEMS)) }}
        />
      </section>

      <p>
        <Link
          href="/"
          className="inline-block rounded-md bg-purple-950 px-5 py-3 font-semibold text-white hover:bg-purple-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-950"
        >
          Escolher meu espaço na grade
        </Link>
      </p>
    </LegalLayout>
  );
}
