import type { Metadata } from "next";
import LegalLayout from "@/app/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Quais dados o Manda Pixel usa, para quê, e como pedir acesso ou exclusão (LGPD).",
  alternates: { canonical: "/privacidade" },
};

const CONTACT_EMAIL = "contato@mandapixel.com.br";

export default function PrivacidadePage() {
  return (
    <LegalLayout title="Privacidade" updatedAt="outubro de 2026">
      <section>
        <h2 className="text-xl font-bold text-stone-950">Dados do anúncio</h2>
        <p className="mt-2">
          A imagem, o link, o texto e o @ do X que você envia são públicos: aparecem na grade para qualquer visitante.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-stone-950">Endereço IP</h2>
        <p className="mt-2">
          Guardamos o IP só para limitar abuso (excesso de tentativas, por exemplo) e por pouco tempo.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-stone-950">Dados de pagamento</h2>
        <p className="mt-2">
          Nome, e-mail e CPF ou CNPJ ficam no Asaas, o gateway de pagamento, e não neste site. Eles servem só para o
          pagamento, a nota fiscal e os avisos sobre a sua compra.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-stone-950">Visitas</h2>
        <p className="mt-2">Medimos as visitas com o PostHog, sem identificar quem você é.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-stone-950">Compartilhamento</h2>
        <p className="mt-2">Nenhum dado é vendido ou repassado a ninguém.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-stone-950">Seus direitos (LGPD)</h2>
        <p className="mt-2">
          Para pedir acesso ou exclusão dos seus dados, escreva para{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-purple-900 underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
