import { LegalPage, Operator } from "@/components/legal";
import { OPERATOR } from "@/lib/legal";

export const metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" updated="3. Oktober 2026">
      <h2>Angaben gemäß § 5 DDG</h2>
      <Operator />
      {OPERATOR.vatId && (
        <>
          <h2>Umsatzsteuer-ID</h2>
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {OPERATOR.vatId}</p>
        </>
      )}
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        {OPERATOR.responsible}, {OPERATOR.address}
      </p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Das Angebot richtet sich ausschließlich an Unternehmen. Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor
        einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </LegalPage>
  );
}
