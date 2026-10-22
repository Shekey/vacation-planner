import type { Metadata } from "next";
import { LegalPage, legalHref, legalLocale, Operator, SubprocessorList } from "@/components/legal";
import { messagesFor } from "@/lib/i18n";
import { OPERATOR } from "@/lib/legal";

export async function generateMetadata({ searchParams }: PageProps<"/datenschutz">): Promise<Metadata> {
  const { locale } = await legalLocale(searchParams);
  return { title: messagesFor(locale).legal.titles.privacy };
}

export default async function PrivacyPage({ searchParams }: PageProps<"/datenschutz">) {
  const { locale, forced } = await legalLocale(searchParams);
  const avv = legalHref("/avv", locale, forced);
  if (locale === "en") {
    return (
      <LegalPage locale="en" path="/datenschutz" title="Privacy policy" updated="2026-10-21">
        <h2>1. Controller</h2>
        <p>The controller responsible for data processing on this website and for the accounts of workspace administrators is:</p>
        <Operator locale="en" />
        <p>
          For the data a company manages about its employees in Urlaubflow (vacations, absences, allowances), that company is the
          controller. We process this data on its behalf under Art. 28 GDPR; see the <a href={avv}>data processing agreement</a>.
        </p>

        <h2>2. What data we process</h2>
        <ul>
          <li>Account: email address, name, preferred language, time of sign-in, session data.</li>
          <li>
            Cookies: only technically necessary ones (§ 25(2) no. 2 TDDDG): the session cookie that keeps you signed in, two cookies that
            protect the sign-in form (CSRF protection and return address), and a cookie with your chosen language.
          </li>
          <li>
            Workspace: team name, members and roles, vacation allowances, working days, start date, federal state for public holidays,
            bookings with period and type (“Vacation” or “Other absence”), who approved or declined a request and when, and, if you turn it
            on, a secret link for your personal calendar feed.
          </li>
          <li>
            Activity log: for administrators of a workspace we record who removed or restored a person, changed a role, cancelled,
            restored, approved or declined a booking, and deleted or restored the workspace, with the names involved and the date. This
            serves traceability and the resolution of mistakes and disputes (Art. 6(1)(f) GDPR). It holds no notes.
          </li>
          <li>
            Emails: sign-in links, invitations, approval requests and decisions, and reminders to administrators before a trial ends. A note
            written when deciding on a request is only sent by email, not stored.
          </li>
          <li>
            Microsoft Teams and Slack: if a workspace connects a channel, names, periods and types of bookings are posted there, as well as a
            morning list of who is out.
          </li>
          <li>
            Sick days: only the dates on which someone is sick, never a diagnosis, a doctor&apos;s note or any other document. This is health
            data under Art. 9 GDPR, which the employer may process to administer the employment relationship (Art. 9(2)(b) GDPR, Section 26(3)
            BDSG). Only the person and the workspace&apos;s admins see them as sick; colleagues, Teams/Slack posts and calendar feeds show
            them as other time off. Sick days are deleted twelve months after they end. We do not record free-text notes.
          </li>
          <li>
            Payments: company name, billing address and VAT ID of paying customers; payment details (card or bank account for SEPA direct
            debit) are processed exclusively by Stripe. We only store the Stripe customer number and the status of the subscription.
          </li>
          <li>Server logs: IP address, time and page requested, for security and troubleshooting, stored for no longer than 30 days.</li>
          <li>
            Sign-in requests: a keyed hash of the email address and of the IP address with the time, to limit how many sign-in links are
            sent, deleted after two days at the latest.
          </li>
          <li>
            Usage statistics (PostHog, EU cloud): on the public pages (home page, sign-in, legal texts) we count visits and clicks and
            record anonymous session replays in which every input field is masked; inside the app we only count that a page was opened,
            with names, workspace addresses and identifiers removed from the address, and no replay. Nothing is stored in your browser
            (no cookies, no local storage), nobody is identified, no email address or user ID is sent, and the IP address is discarded.
            Visitors who send the browser signal “Do Not Track” are not counted. In the operator area nothing is measured.
          </li>
          <li>
            Error monitoring (Sentry, EU region): when an error occurs, a technical report (error message, place in the code, browser and
            device type, page without query parameters) is sent. Before sending, email addresses, tokens, cookies, IP address and
            request contents are removed.
          </li>
        </ul>

        <h2>3. Purposes and legal bases</h2>
        <ul>
          <li>Providing the service and sign-in via email link: Art. 6(1)(b) GDPR (contract).</li>
          <li>Billing and retention of invoices: Art. 6(1)(c) GDPR (legal obligations under the HGB and AO).</li>
          <li>Security, abuse prevention and troubleshooting: Art. 6(1)(f) GDPR (legitimate interest).</li>
          <li>
            Usage statistics and error monitoring: Art. 6(1)(f) GDPR (legitimate interest in improving the service and fixing errors
            quickly). You can object at any time with the “Do Not Track” setting of your browser or by writing to us.
          </li>
        </ul>
        <p>
          We use no advertising or tracking cookies, and none of our tools stores anything on your device. Statistics are anonymous and
          never combined into profiles of individual people.
        </p>

        <h2>4. Hosting and recipients</h2>
        <p>The application and the database run in data centres in Frankfurt am Main (EU). We use the following processors:</p>
        <SubprocessorList locale="en" />

        <h2>5. Retention period</h2>
        <p>
          We store account data until the account is deleted. In a monthly clean-up we automatically delete bookings three years after they
          end (sick days twelve months after they end), the data of people who were removed from a workspace three years ago, completed invitations 30 days after they were sent,
          and expired sessions and sign-in links, and activity log entries after 12 months. When a paid plan or the trial ends, the workspace
          moves to the free plan and nothing is deleted. People removed from a workspace, cancelled bookings and deleted workspaces can be
          restored for 30 days; deleted workspaces are removed for good after that. Once a deleted
          workspace is past those 30 days, all of its data is deleted; it disappears from backups after 30 days at the latest. We keep billing data for
          as long as commercial and tax law requires (up to 10 years).
        </p>

        <h2>6. Your rights</h2>
        <p>
          You have the right of access, rectification, erasure, restriction of processing, data portability and objection (Art. 15 to 21
          GDPR). In your profile you can download your data and delete your account yourself at any time. You can also lodge a complaint
          with a data protection supervisory authority, for example the one responsible for us: {OPERATOR.supervisoryAuthority}.
        </p>
        <p>
          If your account is part of your employer’s workspace, please contact your employer first with questions about your vacation data;
          we support them in this.
        </p>
      </LegalPage>
    );
  }
  return (
    <LegalPage locale="de" path="/datenschutz" title="Datenschutzerklärung" updated="2026-10-21">
      <h2>1. Verantwortlicher</h2>
      <p>Verantwortlich für die Datenverarbeitung auf dieser Website und für Konten von Workspace-Administratoren ist:</p>
      <Operator locale="de" />
      <p>
        Für die Daten, die ein Unternehmen über seine Mitarbeitenden in Urlaubflow verwaltet (Urlaube, Abwesenheiten, Kontingente),
        ist das jeweilige Unternehmen Verantwortlicher. Wir verarbeiten diese Daten in seinem Auftrag nach Art. 28 DSGVO; siehe den{" "}
        <a href={avv}>Auftragsverarbeitungsvertrag</a>.
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Konto: E-Mail-Adresse, Name, bevorzugte Sprache, Zeitpunkt der Anmeldung, Sitzungsdaten.</li>
        <li>
          Cookies: nur technisch notwendige (§ 25 Abs. 2 Nr. 2 TDDDG): das Sitzungs-Cookie, das Sie angemeldet hält, zwei Cookies, die das
          Anmeldeformular schützen (CSRF-Schutz und Rücksprungadresse), und ein Cookie mit der gewählten Sprache.
        </li>
        <li>
          Workspace: Name des Teams, Mitglieder und Rollen, Urlaubskontingente, Arbeitstage, Eintrittsdatum, Bundesland für Feiertage,
          Buchungen mit Zeitraum und Art („Urlaub“ oder „Sonstige Abwesenheit“), wer einen Antrag wann genehmigt oder abgelehnt hat, und,
          wenn Sie ihn einschalten, ein geheimer Link für Ihren persönlichen Kalender-Feed.
        </li>
        <li>
          Verlauf: Für Administratoren eines Workspaces protokollieren wir, wer eine Person entfernt oder wiederhergestellt, eine Rolle
          geändert, eine Buchung storniert, wiederhergestellt, genehmigt oder abgelehnt und den Workspace gelöscht oder wiederhergestellt
          hat, mit den beteiligten Namen und dem Datum. Das dient der Nachvollziehbarkeit und der Klärung von Fehlern und Streitfällen (Art.
          6 Abs. 1 lit. f DSGVO). Notizen enthält es nicht.
        </li>
        <li>
          E-Mails: Anmeldelinks, Einladungen, Urlaubsanträge und Entscheidungen sowie Erinnerungen an Administratoren vor Ende der
          Testphase. Eine Notiz zur Entscheidung über einen Antrag wird nur per E-Mail verschickt, nicht gespeichert.
        </li>
        <li>
          Microsoft Teams und Slack: Verbindet ein Workspace einen Kanal, werden Namen, Zeitraum und Art von Buchungen dorthin gesendet,
          dazu morgens eine Liste, wer fehlt.
        </li>
        <li>
          Krankheitstage: nur die Tage, an denen jemand krank ist, nie eine Diagnose, eine Krankmeldung oder ein anderes Dokument. Das sind
          Gesundheitsdaten nach Art. 9 DSGVO, die der Arbeitgeber zur Durchführung des Beschäftigungsverhältnisses verarbeiten darf (Art. 9
          Abs. 2 lit. b DSGVO, § 26 Abs. 3 BDSG). Als Krankheit sehen sie nur die Person selbst und die Admins des Workspace; Kolleginnen und
          Kollegen, Teams-/Slack-Nachrichten und Kalender-Feeds zeigen sie als sonstige Abwesenheit. Krankheitstage werden zwölf Monate nach
          ihrem Ende gelöscht. Freitext-Notizen erfassen wir nicht.
        </li>
        <li>
          Zahlungen: Firmenname, Rechnungsadresse und USt-ID der zahlenden Kunden; Zahlungsdaten (Karte oder Bankverbindung für
          SEPA-Lastschrift) verarbeitet ausschließlich Stripe. Wir speichern nur die Stripe-Kundennummer und den Status des Abos.
        </li>
        <li>
          Server-Protokolle: IP-Adresse, Zeitpunkt und aufgerufene Seite, zur Sicherheit und Fehlersuche, höchstens 30 Tage gespeichert.
        </li>
        <li>
          Anmeldeanfragen: ein mit einem geheimen Schlüssel gebildeter Hashwert der E-Mail-Adresse und der IP-Adresse mit Zeitpunkt, um die Zahl der
          versendeten Anmeldelinks zu begrenzen, spätestens nach zwei Tagen gelöscht.
        </li>
        <li>
          Nutzungsstatistik (PostHog, EU-Cloud): Auf den öffentlichen Seiten (Startseite, Anmeldung, Rechtstexte) zählen wir Besuche und
          Klicks und zeichnen anonyme Sitzungswiedergaben auf, in denen jedes Eingabefeld unkenntlich gemacht ist; in der App zählen wir
          nur, dass eine Seite geöffnet wurde, wobei Namen, Workspace-Adressen und Kennungen aus der Adresse entfernt sind, und zeichnen
          nichts auf. Es wird nichts in Ihrem Browser gespeichert (keine Cookies, kein Local Storage), niemand wird identifiziert, es
          werden weder E-Mail-Adresse noch Nutzer-ID gesendet, und die IP-Adresse wird verworfen. Besucher, die das Browser-Signal „Do
          Not Track“ senden, werden nicht gezählt. Im Betreiberbereich wird nichts gemessen.
        </li>
        <li>
          Fehlerüberwachung (Sentry, EU-Region): Tritt ein Fehler auf, wird ein technischer Bericht gesendet (Fehlermeldung, Stelle im
          Code, Browser- und Gerätetyp, Seite ohne Query-Parameter). Vor dem Senden werden E-Mail-Adressen, Tokens, Cookies,
          IP-Adresse und Anfrageinhalte entfernt.
        </li>
      </ul>

      <h2>3. Zwecke und Rechtsgrundlagen</h2>
      <ul>
        <li>Bereitstellung des Dienstes und Anmeldung per E-Mail-Link: Art. 6 Abs. 1 lit. b DSGVO (Vertrag).</li>
        <li>Abrechnung und Aufbewahrung von Rechnungen: Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Pflichten nach HGB und AO).</li>
        <li>Sicherheit, Missbrauchsschutz und Fehlersuche: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).</li>
        <li>
          Nutzungsstatistik und Fehlerüberwachung: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Verbesserung des Dienstes und
          der schnellen Behebung von Fehlern). Sie können jederzeit widersprechen, mit der Einstellung „Do Not Track“ Ihres Browsers oder
          per E-Mail an uns.
        </li>
      </ul>
      <p>
        Wir verwenden keine Werbe- oder Tracking-Cookies, und keines unserer Werkzeuge speichert etwas auf Ihrem Gerät. Statistiken sind
        anonym und werden nie zu Profilen einzelner Personen zusammengeführt.
      </p>

      <h2>4. Hosting und Empfänger</h2>
      <p>Die Anwendung und die Datenbank laufen in Rechenzentren in Frankfurt am Main (EU). Wir setzen folgende Auftragsverarbeiter ein:</p>
      <SubprocessorList locale="de" />

      <h2>5. Speicherdauer</h2>
      <p>
        Kontodaten speichern wir, bis das Konto gelöscht wird. Bei einem monatlichen Löschlauf löschen wir automatisch Buchungen drei Jahre
        nach ihrem Ende (Krankheitstage zwölf Monate nach ihrem Ende), die Daten von Personen, die seit drei Jahren aus einem Workspace entfernt sind, erledigte Einladungen 30 Tage nach
        dem Versand, abgelaufene Sitzungen und Anmeldelinks sowie Einträge des Verlaufs nach 12 Monaten. Endet ein bezahlter Tarif oder die
        Testphase, wechselt der Workspace in den Free-Tarif; dabei wird nichts gelöscht. Entfernte Personen, stornierte Buchungen und
        gelöschte Workspaces lassen sich 30 Tage lang wiederherstellen. Ist ein gelöschter Workspace älter als diese 30 Tage, werden alle seine Daten gelöscht; aus Sicherungskopien verschwinden sie
        spätestens nach 30 Tagen. Rechnungsdaten bewahren wir so lange auf, wie es das Handels- und Steuerrecht verlangt (bis zu 10 Jahre).
      </p>

      <h2>6. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art.
        15 bis 21 DSGVO). Im Profil können Sie Ihre Daten jederzeit selbst herunterladen und Ihr Konto löschen. Außerdem können Sie sich bei
        einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der für uns zuständigen: {OPERATOR.supervisoryAuthority}.
      </p>
      <p>
        Ist Ihr Konto Teil des Workspaces Ihres Arbeitgebers, wenden Sie sich für Fragen zu Ihren Urlaubsdaten bitte zuerst an Ihren
        Arbeitgeber; wir unterstützen ihn dabei.
      </p>
    </LegalPage>
  );
}
