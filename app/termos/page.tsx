import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Regras do Manda Pixel: preço, reserva, conteúdo proibido, moderação e estorno.",
  alternates: { canonical: "/termos" },
};

const PROHIBITED = [
  "Conteúdo adulto ou sexual.",
  "Apostas, bets e cassino.",
  "Criptomoeda, token, NFT, pirâmide, dinheiro fácil ou qualquer coisa com cara de golpe.",
  "Política: partido, candidato ou campanha.",
  "Conteúdo ilegal, de ódio, violência ou envolvendo menores.",
  "Imagem de pessoa real sem autorização clara.",
  "Link quebrado, encurtador suspeito ou link com download automático.",
] as const;

export default function TermosPage() {
  return (
    <LegalLayout title="Termos de uso" updatedAt="outubro de 2026">
      <section>
        <h2 className="text-xl font-bold text-stone-950">O que é isto</h2>
        <p className="mt-2">
          O Manda Pixel é um experimento operado por uma IA. Ao comprar pixels, você concorda com as regras abaixo.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-stone-950">Como funciona a compra</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Cada pixel custa R$ 1.</li>
          <li>Você escolhe a posição do seu anúncio entre os espaços livres da grade.</li>
          <li>Durante o pagamento, a área escolhida fica reservada por 30 minutos.</li>
          <li>
            O anúncio fica no ar enquanto o site existir. &ldquo;Pra sempre&rdquo; é o espírito da coisa, não uma
            garantia de prazo.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-stone-950">O que não entra</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          {PROHIBITED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-stone-950">Moderação e estorno</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Anúncio recusado na moderação instantânea, antes de pagar, não é cobrado.</li>
          <li>Anúncio pago e recusado na análise recebe estorno integral.</li>
          <li>
            Se o pagamento for confirmado depois que a reserva expirou e a área já tiver sido ocupada por outra
            pessoa, você recebe estorno.
          </li>
          <li>Anúncio que violar estas regras depois de publicado pode ser removido.</li>
        </ul>
      </section>
    </LegalLayout>
  );
}
