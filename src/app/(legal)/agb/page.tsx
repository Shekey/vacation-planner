import type { Metadata } from "next";
import { LegalPage, legalHref, legalLocale } from "@/components/legal";
import { FOUNDER_DISCOUNT_PERCENT, isBetaMode } from "@/lib/beta";
import { messagesFor } from "@/lib/i18n";
import { OPERATOR, SUBPROCESSORS } from "@/lib/legal";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

export async function generateMetadata({ searchParams }: PageProps<"/agb">): Promise<Metadata> {
  const { locale } = await legalLocale(searchParams);
  return { title: messagesFor(locale).legal.titles.terms };
}

export default async function TermsPage({ searchParams }: PageProps<"/agb">) {
  const { locale, forced } = await legalLocale(searchParams);
  const avv = legalHref("/avv", locale, forced);
  const beta = isBetaMode();
  if (locale === "en") {
    return (
      <LegalPage locale="en" path="/agb" title="General Terms and Conditions" updated="2026-10-20">
        <h2>1. Scope</h2>
        <p>
          These terms apply to the use of Vacation Planner, offered by {OPERATOR.name}, {OPERATOR.address} (“Provider”). The service is
          aimed exclusively at entrepreneurs within the meaning of § 14 BGB (German Civil Code), not at consumers. Deviating terms of the
          customer do not apply.
        </p>

        <h2>2. Services</h2>
        <p>
          The Provider makes available web-based software for planning vacation and absences in a team. The scope of services depends on the
          plan chosen: Free for up to {PLANS.FREE.maxMembers} people, Team for up to {PLANS.TEAM.maxMembers} people, Business for up to{" "}
          {PLANS.BUSINESS.maxMembers} people. The Provider aims for availability of 99% on a monthly average, excluding announced
          maintenance and disruptions beyond its control.
        </p>

        <h2>{beta ? "3. Free beta phase" : "3. Trial period and conclusion of contract"}</h2>
        {beta && (
          <p>
            Vacation Planner is in a public beta phase. Until the Provider announces its end by email, the service is free of charge with
            all features and without a limit on team size; the plans and the 99% availability in section 2 do not apply. In the beta the
            service is provided as it is, may change or be interrupted, and the Provider may end the beta with reasonable notice; no data
            is deleted when it ends. A customer who creates a workspace during the beta receives a permanent discount of{" "}
            {FOUNDER_DISCOUNT_PERCENT}% on the then-current list price of the Team or Business plan for as long as it keeps a paid plan
            without interruption (“founder rate”). No fee arises automatically: a paid contract is only concluded when the customer
            completes an order via the payment service Stripe.
          </p>
        )}
        {!beta && (
        <p>
          Every new workspace can be used free of charge with all features for {TRIAL_DAYS} days. After that, the Free plan applies until a
          paid plan is booked; no data is deleted. If the workspace has more people than the current plan allows, everyone can still sign
          in, see existing bookings and cancel them, but no new bookings or invitations can be made until a larger plan is booked or people
          are removed. The paid contract is concluded when the order is completed via the payment service Stripe.
        </p>
        )}

        <h2>4. Prices and payment</h2>
        <p>
          The prices shown at the time of ordering apply, plus statutory VAT. Billing is monthly or yearly in advance. If a payment fails,
          Stripe retries it several times; if it still fails, the paid plan ends and the workspace moves to the Free plan. No data is
          deleted.
        </p>

        <h2>5. Term and termination</h2>
        <p>
          Depending on the choice made, contracts run for one month or one year and renew automatically for the same period. They can be
          cancelled at any time, effective at the end of the current period, in the workspace’s billing settings. After that, the workspace
          continues on the Free plan and its data is kept until the customer deletes the workspace. Deleting the workspace ends a running
          subscription at the same time. The right to terminate for cause remains unaffected.
        </p>

        <h2>6. Customer obligations</h2>
        <p>
          The customer only invites people who belong to its team, keeps access credentials confidential and is responsible for the
          lawfulness of the data entered, in particular towards its employees.
        </p>

        <h2>7. Data protection</h2>
        <p>
          Insofar as the Provider processes personal data on behalf of the customer, the <a href={avv}>data processing agreement</a> agreed
          together with these terms applies. Subprocessors used: {SUBPROCESSORS.filter((s) => s.dpa).map((s) => s.name).join(", ")}.
        </p>

        <h2>8. Liability</h2>
        <p>
          The Provider has unlimited liability for intent, gross negligence and for damage resulting from injury to life, body or health. In
          the case of a slightly negligent breach of material contractual obligations, liability is limited to the foreseeable damage
          typical for this type of contract, and to no more than the fees paid in the last twelve months. Otherwise, liability is excluded.
          Liability under the German Product Liability Act (Produkthaftungsgesetz) remains unaffected.
        </p>

        <h2>9. Changes</h2>
        <p>
          The Provider may change these terms with six weeks’ notice and will announce this by email. If the customer does not object within
          this period, the changes are deemed accepted; the Provider will point this out in the notice.
        </p>

        <h2>10. Final provisions</h2>
        <p>
          German law applies, excluding the UN Convention on Contracts for the International Sale of Goods (CISG). To the extent permitted,
          the place of jurisdiction is the Provider’s registered office. Should any provision be invalid, the rest of the contract remains
          valid.
        </p>
      </LegalPage>
    );
  }
  return (
    <LegalPage locale="de" path="/agb" title="Allgemeine Geschäftsbedingungen" updated="2026-10-20">
      <h2>1. Geltungsbereich</h2>
      <p>
        Diese AGB gelten für die Nutzung des Vacation Planner, angeboten von {OPERATOR.name}, {OPERATOR.address} („Anbieter“). Das Angebot
        richtet sich ausschließlich an Unternehmer im Sinne von § 14 BGB, nicht an Verbraucher. Abweichende Bedingungen des Kunden gelten
        nicht.
      </p>

      <h2>2. Leistungen</h2>
      <p>
        Der Anbieter stellt eine webbasierte Software zur Planung von Urlaub und Abwesenheiten im Team bereit. Der Leistungsumfang ergibt
        sich aus dem gewählten Tarif: Free bis {PLANS.FREE.maxMembers} Personen, Team bis {PLANS.TEAM.maxMembers} Personen, Business bis{" "}
        {PLANS.BUSINESS.maxMembers} Personen. Der Anbieter strebt eine Verfügbarkeit von 99 % im Monatsmittel an, ausgenommen angekündigte
        Wartungen und Störungen außerhalb seines Einflussbereichs.
      </p>

      <h2>{beta ? "3. Kostenlose Beta-Phase" : "3. Testphase und Vertragsschluss"}</h2>
      {beta && (
        <p>
          Der Vacation Planner befindet sich in einer öffentlichen Beta-Phase. Bis der Anbieter ihr Ende per E-Mail ankündigt, ist der Dienst
          mit allen Funktionen und ohne Begrenzung der Teamgröße kostenlos; die Tarife und die Verfügbarkeit von 99 % aus Ziffer 2 gelten
          nicht. In der Beta wird der Dienst so bereitgestellt, wie er ist, kann sich ändern oder unterbrochen werden, und der Anbieter kann
          die Beta mit angemessener Frist beenden; dabei werden keine Daten gelöscht. Ein Kunde, der in der Beta einen Workspace anlegt,
          erhält dauerhaft {FOUNDER_DISCOUNT_PERCENT} % Rabatt auf den dann gültigen Listenpreis des Tarifs Team oder Business, solange er
          ohne Unterbrechung einen kostenpflichtigen Tarif behält („Gründerpreis“). Es entstehen nicht automatisch Kosten: Ein
          kostenpflichtiger Vertrag kommt erst zustande, wenn der Kunde die Bestellung über den Bezahldienst Stripe abschließt.
        </p>
      )}
      {!beta && (
      <p>
        Jeder neue Workspace kann {TRIAL_DAYS} Tage kostenlos mit allen Funktionen genutzt werden. Danach gilt der Free-Tarif, bis ein
        kostenpflichtiger Tarif gebucht wird; Daten werden dabei nicht gelöscht. Hat der Workspace mehr Personen, als der aktuelle Tarif
        erlaubt, können sich alle weiter anmelden, bestehende Buchungen sehen und stornieren, aber keine neuen Buchungen oder Einladungen
        anlegen, bis ein größerer Tarif gebucht ist oder Personen entfernt sind. Der kostenpflichtige Vertrag kommt mit Abschluss der
        Bestellung über den Bezahldienst Stripe zustande.
      </p>
      )}

      <h2>4. Preise und Zahlung</h2>
      <p>
        Es gelten die bei der Bestellung angezeigten Preise zuzüglich der gesetzlichen Umsatzsteuer. Die Abrechnung erfolgt monatlich oder
        jährlich im Voraus. Schlägt eine Zahlung fehl, versucht Stripe sie mehrmals erneut; bleibt sie erfolglos, endet der
        kostenpflichtige Tarif und der Workspace wechselt in den Free-Tarif. Daten werden dabei nicht gelöscht.
      </p>

      <h2>5. Laufzeit und Kündigung</h2>
      <p>
        Verträge laufen je nach Wahl einen Monat oder ein Jahr und verlängern sich automatisch um denselben Zeitraum. Sie können jederzeit
        zum Ende des laufenden Zeitraums in der Abrechnung des Workspaces gekündigt werden. Danach läuft der Workspace im Free-Tarif weiter
        und seine Daten bleiben erhalten, bis der Kunde den Workspace löscht. Mit dem Löschen des Workspaces endet auch ein laufendes Abo.
        Das Recht zur außerordentlichen Kündigung bleibt unberührt.
      </p>

      <h2>6. Pflichten des Kunden</h2>
      <p>
        Der Kunde lädt nur Personen ein, die zu seinem Team gehören, hält Zugangsdaten geheim und ist für die Rechtmäßigkeit der
        eingegebenen Daten verantwortlich, insbesondere gegenüber seinen Mitarbeitenden.
      </p>

      <h2>7. Datenschutz</h2>
      <p>
        Soweit der Anbieter personenbezogene Daten im Auftrag des Kunden verarbeitet, gilt der{" "}
        <a href={avv}>Auftragsverarbeitungsvertrag</a>, der mit diesen AGB vereinbart wird. Eingesetzte Unterauftragsverarbeiter:{" "}
        {SUBPROCESSORS.filter((s) => s.dpa).map((s) => s.name).join(", ")}.
      </p>

      <h2>8. Haftung</h2>
      <p>
        Der Anbieter haftet unbeschränkt bei Vorsatz, grober Fahrlässigkeit und für Schäden aus der Verletzung des Lebens, des Körpers oder
        der Gesundheit. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vertragstypischen,
        vorhersehbaren Schaden begrenzt, höchstens auf die in den letzten zwölf Monaten gezahlten Entgelte. Im Übrigen ist die Haftung
        ausgeschlossen. Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.
      </p>

      <h2>9. Änderungen</h2>
      <p>
        Der Anbieter kann diese AGB mit einer Frist von sechs Wochen ändern und teilt das per E-Mail mit. Widerspricht der Kunde nicht
        innerhalb der Frist, gelten die Änderungen als angenommen; darauf weist der Anbieter in der Mitteilung hin.
      </p>

      <h2>10. Schlussbestimmungen</h2>
      <p>
        Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist, soweit zulässig, der Sitz des Anbieters. Sollte eine
        Bestimmung unwirksam sein, bleibt der Rest des Vertrags wirksam.
      </p>
    </LegalPage>
  );
}
