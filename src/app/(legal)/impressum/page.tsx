import type { Metadata } from "next";
import { LegalPage, legalLocale, Operator } from "@/components/legal";
import { messagesFor } from "@/lib/i18n";
import { OPERATOR } from "@/lib/legal";

export async function generateMetadata({ searchParams }: PageProps<"/impressum">): Promise<Metadata> {
  const { locale } = await legalLocale(searchParams);
  return { title: messagesFor(locale).legal.titles.impressum };
}

export default async function ImpressumPage({ searchParams }: PageProps<"/impressum">) {
  const { locale } = await legalLocale(searchParams);
  if (locale === "en") {
    return (
      <LegalPage locale="en" path="/impressum" title="Legal notice (Impressum)" updated="2026-10-03">
        <h2>Information pursuant to § 5 DDG</h2>
        <Operator locale="en" />
        {OPERATOR.vatId && (
          <>
            <h2>VAT ID</h2>
            <p>VAT identification number pursuant to § 27a UStG: {OPERATOR.vatId}</p>
          </>
        )}
        <h2>Responsible for content under § 18(2) MStV</h2>
        <p>
          {OPERATOR.responsible}, {OPERATOR.address}
        </p>
        <h2>Consumer dispute resolution</h2>
        <p>
          This service is offered exclusively to businesses. We are neither willing nor obliged to take part in dispute resolution
          proceedings before a consumer arbitration board.
        </p>
      </LegalPage>
    );
  }
  return (
    <LegalPage locale="de" path="/impressum" title="Impressum" updated="2026-10-03">
      <h2>Angaben gemäß § 5 DDG</h2>
      <Operator locale="de" />
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
        Das Angebot richtet sich ausschließlich an Unternehmen. Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren
        vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </LegalPage>
  );
}
