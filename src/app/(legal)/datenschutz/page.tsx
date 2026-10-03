import type { Metadata } from "next";
import { LegalPage, legalHref, legalLocale, Operator, SubprocessorList } from "@/components/legal";
import { messagesFor } from "@/lib/i18n";

export async function generateMetadata({ searchParams }: PageProps<"/datenschutz">): Promise<Metadata> {
  const { locale } = await legalLocale(searchParams);
  return { title: messagesFor(locale).legal.titles.privacy };
}

export default async function PrivacyPage({ searchParams }: PageProps<"/datenschutz">) {
  const { locale, forced } = await legalLocale(searchParams);
  const avv = legalHref("/avv", locale, forced);
  if (locale === "en") {
    return (
      <LegalPage locale="en" path="/datenschutz" title="Privacy policy" updated="2026-10-03">
        <h2>1. Controller</h2>
        <p>The controller responsible for data processing on this website and for the accounts of workspace administrators is:</p>
        <Operator locale="en" />
        <p>
          For the data a company manages about its employees in Vacation Planner (vacations, absences, allowances), that company is the
          controller. We process this data on its behalf under Art. 28 GDPR; see the <a href={avv}>data processing agreement</a>.
        </p>

        <h2>2. What data we process</h2>
        <ul>
          <li>Account: email address, name, time of sign-in, session data (one technically necessary cookie).</li>
          <li>
            Workspace: team name, members and roles, vacation allowances, working days, start date, federal state for public holidays,
            bookings with period and type (“Vacation” or “Other absence”).
          </li>
          <li>
            We deliberately do not record sick days or free-text notes, and therefore no health data or other special categories of data
            under Art. 9 GDPR.
          </li>
          <li>Payments: company name, billing address and VAT ID of paying customers; card details are processed exclusively by Stripe.</li>
          <li>Server logs: IP address, time and page requested, for security and troubleshooting, stored for no longer than 30 days.</li>
        </ul>

        <h2>3. Purposes and legal bases</h2>
        <ul>
          <li>Providing the service and sign-in via email link: Art. 6(1)(b) GDPR (contract).</li>
          <li>Billing and retention of invoices: Art. 6(1)(c) GDPR (legal obligations under the HGB and AO).</li>
          <li>Security, abuse prevention and troubleshooting: Art. 6(1)(f) GDPR (legitimate interest).</li>
        </ul>
        <p>We do not use advertising or tracking cookies, nor any analytics tools that build profiles.</p>

        <h2>4. Hosting and recipients</h2>
        <p>The application and the database run in data centres in Frankfurt am Main (EU). We use the following processors:</p>
        <SubprocessorList locale="en" />

        <h2>5. Retention period</h2>
        <p>
          We store account data until the account is deleted. We automatically delete bookings three years after they end, as well as the
          data of people who were removed from a workspace three years ago; completed invitations after 30 days. When a workspace is
          deleted, all of its data is deleted immediately; it disappears from backups after 30 days at the latest. We keep billing data for
          as long as commercial and tax law requires (up to 10 years).
        </p>

        <h2>6. Your rights</h2>
        <p>
          You have the right of access, rectification, erasure, restriction of processing, data portability and objection (Art. 15 to 21
          GDPR). In your profile you can download your data and delete your account yourself at any time. You can also lodge a complaint
          with a data protection supervisory authority.
        </p>
        <p>
          If your account is part of your employer’s workspace, please contact your employer first with questions about your vacation data;
          we support them in this.
        </p>
      </LegalPage>
    );
  }
  return (
    <LegalPage locale="de" path="/datenschutz" title="Datenschutzerklärung" updated="2026-10-03">
      <h2>1. Verantwortlicher</h2>
      <p>Verantwortlich für die Datenverarbeitung auf dieser Website und für Konten von Workspace-Administratoren ist:</p>
      <Operator locale="de" />
      <p>
        Für die Daten, die ein Unternehmen über seine Mitarbeitenden im Vacation Planner verwaltet (Urlaube, Abwesenheiten, Kontingente),
        ist das jeweilige Unternehmen Verantwortlicher. Wir verarbeiten diese Daten in seinem Auftrag nach Art. 28 DSGVO; siehe den{" "}
        <a href={avv}>Auftragsverarbeitungsvertrag</a>.
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Konto: E-Mail-Adresse, Name, Zeitpunkt der Anmeldung, Sitzungsdaten (ein technisch notwendiges Cookie).</li>
        <li>
          Workspace: Name des Teams, Mitglieder und Rollen, Urlaubskontingente, Arbeitstage, Eintrittsdatum, Bundesland für Feiertage,
          Buchungen mit Zeitraum und Art („Urlaub“ oder „Sonstige Abwesenheit“).
        </li>
        <li>
          Wir erfassen bewusst keine Krankheitstage und keine Freitext-Notizen, also keine Gesundheitsdaten oder andere besondere Kategorien
          nach Art. 9 DSGVO.
        </li>
        <li>Zahlungen: Firmenname, Rechnungsadresse und USt-ID der zahlenden Kunden; Kartendaten verarbeitet ausschließlich Stripe.</li>
        <li>
          Server-Protokolle: IP-Adresse, Zeitpunkt und aufgerufene Seite, zur Sicherheit und Fehlersuche, höchstens 30 Tage gespeichert.
        </li>
      </ul>

      <h2>3. Zwecke und Rechtsgrundlagen</h2>
      <ul>
        <li>Bereitstellung des Dienstes und Anmeldung per E-Mail-Link: Art. 6 Abs. 1 lit. b DSGVO (Vertrag).</li>
        <li>Abrechnung und Aufbewahrung von Rechnungen: Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Pflichten nach HGB und AO).</li>
        <li>Sicherheit, Missbrauchsschutz und Fehlersuche: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).</li>
      </ul>
      <p>Wir verwenden keine Werbe- oder Tracking-Cookies und keine Analyse-Tools, die Profile bilden.</p>

      <h2>4. Hosting und Empfänger</h2>
      <p>Die Anwendung und die Datenbank laufen in Rechenzentren in Frankfurt am Main (EU). Wir setzen folgende Auftragsverarbeiter ein:</p>
      <SubprocessorList locale="de" />

      <h2>5. Speicherdauer</h2>
      <p>
        Kontodaten speichern wir, bis das Konto gelöscht wird. Buchungen löschen wir automatisch drei Jahre nach ihrem Ende, ebenso die
        Daten von Personen, die seit drei Jahren aus einem Workspace entfernt sind; erledigte Einladungen nach 30 Tagen. Wird ein Workspace
        gelöscht, werden alle seine Daten sofort gelöscht; aus Sicherungskopien verschwinden sie spätestens nach 30 Tagen. Rechnungsdaten
        bewahren wir so lange auf, wie es das Handels- und Steuerrecht verlangt (bis zu 10 Jahre).
      </p>

      <h2>6. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art.
        15 bis 21 DSGVO). Im Profil können Sie Ihre Daten jederzeit selbst herunterladen und Ihr Konto löschen. Außerdem können Sie sich bei
        einer Datenschutz-Aufsichtsbehörde beschweren.
      </p>
      <p>
        Ist Ihr Konto Teil des Workspaces Ihres Arbeitgebers, wenden Sie sich für Fragen zu Ihren Urlaubsdaten bitte zuerst an Ihren
        Arbeitgeber; wir unterstützen ihn dabei.
      </p>
    </LegalPage>
  );
}
