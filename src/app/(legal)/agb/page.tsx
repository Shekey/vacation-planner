import { LegalPage } from "@/components/legal";
import { OPERATOR, SUBPROCESSORS } from "@/lib/legal";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

export const metadata = { title: "AGB" };

export default function TermsPage() {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen" updated="3. Oktober 2026">
      <h2>1. Geltungsbereich</h2>
      <p>
        Diese AGB gelten für die Nutzung des Vacation Planner, angeboten von {OPERATOR.name}, {OPERATOR.address} („Anbieter“). Das Angebot
        richtet sich ausschließlich an Unternehmer im Sinne von § 14 BGB, nicht an Verbraucher. Abweichende Bedingungen des Kunden gelten nicht.
      </p>

      <h2>2. Leistungen</h2>
      <p>
        Der Anbieter stellt eine webbasierte Software zur Planung von Urlaub und Abwesenheiten im Team bereit. Der Leistungsumfang ergibt sich
        aus dem gewählten Tarif: Free bis {PLANS.FREE.maxMembers} Personen, Team bis {PLANS.TEAM.maxMembers} Personen, Business bis{" "}
        {PLANS.BUSINESS.maxMembers} Personen. Der Anbieter strebt eine Verfügbarkeit von 99 % im Monatsmittel an, ausgenommen angekündigte
        Wartungen und Störungen außerhalb seines Einflussbereichs.
      </p>

      <h2>3. Testphase und Vertragsschluss</h2>
      <p>
        Jeder neue Workspace kann {TRIAL_DAYS} Tage kostenlos mit allen Funktionen genutzt werden. Danach gilt der Free-Tarif, bis ein
        kostenpflichtiger Tarif gebucht wird. Der kostenpflichtige Vertrag kommt mit Abschluss der Bestellung über den Bezahldienst Stripe
        zustande.
      </p>

      <h2>4. Preise und Zahlung</h2>
      <p>
        Es gelten die bei der Bestellung angezeigten Preise zuzüglich der gesetzlichen Umsatzsteuer. Die Abrechnung erfolgt monatlich oder
        jährlich im Voraus. Bei Zahlungsverzug kann der Anbieter den Workspace nach Ankündigung auf den Free-Tarif zurückstufen.
      </p>

      <h2>5. Laufzeit und Kündigung</h2>
      <p>
        Verträge laufen je nach Wahl einen Monat oder ein Jahr und verlängern sich automatisch um denselben Zeitraum. Sie können jederzeit zum
        Ende des laufenden Zeitraums in der Abrechnung des Workspaces gekündigt werden. Das Recht zur außerordentlichen Kündigung bleibt
        unberührt.
      </p>

      <h2>6. Pflichten des Kunden</h2>
      <p>
        Der Kunde lädt nur Personen ein, die zu seinem Team gehören, hält Zugangsdaten geheim und ist für die Rechtmäßigkeit der eingegebenen
        Daten verantwortlich, insbesondere gegenüber seinen Mitarbeitenden.
      </p>

      <h2>7. Datenschutz</h2>
      <p>
        Soweit der Anbieter personenbezogene Daten im Auftrag des Kunden verarbeitet, gilt der <a href="/avv">Auftragsverarbeitungsvertrag</a>,
        der mit diesen AGB vereinbart wird. Eingesetzte Unterauftragsverarbeiter: {SUBPROCESSORS.map((s) => s.name).join(", ")}.
      </p>

      <h2>8. Haftung</h2>
      <p>
        Der Anbieter haftet unbeschränkt bei Vorsatz, grober Fahrlässigkeit und für Schäden aus der Verletzung des Lebens, des Körpers oder der
        Gesundheit. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vertragstypischen, vorhersehbaren
        Schaden begrenzt, höchstens auf die in den letzten zwölf Monaten gezahlten Entgelte. Im Übrigen ist die Haftung ausgeschlossen. Die
        Haftung nach dem Produkthaftungsgesetz bleibt unberührt.
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
