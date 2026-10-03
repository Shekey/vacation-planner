import type { Metadata } from "next";
import { LegalPage, legalHref, legalLocale, Operator, SubprocessorList } from "@/components/legal";
import { messagesFor } from "@/lib/i18n";

export async function generateMetadata({ searchParams }: PageProps<"/avv">): Promise<Metadata> {
  const { locale } = await legalLocale(searchParams);
  return { title: messagesFor(locale).legal.titles.dpa };
}

export default async function DpaPage({ searchParams }: PageProps<"/avv">) {
  const { locale, forced } = await legalLocale(searchParams);
  const agb = legalHref("/agb", locale, forced);
  if (locale === "en") {
    return (
      <LegalPage locale="en" path="/avv" title="Data Processing Agreement (DPA) pursuant to Art. 28 GDPR" updated="2026-10-03">
        <p>
          This agreement applies between the customer that uses a workspace in Vacation Planner (“Controller”) and the following provider
          (“Processor”). It is concluded through use of the service in accordance with the <a href={agb}>terms and conditions</a>.
        </p>
        <Operator locale="en" />

        <h2>1. Subject matter and duration</h2>
        <p>
          The Processor operates software for planning vacation and absences on behalf of the Controller. The agreement runs for as long as
          the service is used.
        </p>

        <h2>2. Types of data and data subjects</h2>
        <ul>
          <li>Data subjects: employees and administrators of the Controller.</li>
          <li>
            Data: name, email address, role, vacation allowance, working days, start date, region for public holidays, bookings with period
            and type (vacation or other absence).
          </li>
          <li>Special categories (Art. 9 GDPR): none. The service does not record sick days or free-text notes.</li>
        </ul>

        <h2>3. Instructions</h2>
        <p>
          The Processor processes the data only on documented instructions from the Controller; the settings in the workspace count as such
          instructions. If the Processor considers an instruction to be unlawful, it informs the Controller without undue delay.
        </p>

        <h2>4. Confidentiality and security</h2>
        <p>Persons with access to the data are bound to confidentiality. Technical and organisational measures (Art. 32 GDPR):</p>
        <ul>
          <li>Hosting and database in the EU (Frankfurt am Main), encryption in transit (TLS) and at rest.</li>
          <li>Sign-in without passwords via time-limited email links, limits on sign-in attempts.</li>
          <li>
            Strict separation of workspaces, role-based permissions, data minimisation (no sick days, no notes, automatic deletion after
            three years).
          </li>
          <li>Security headers, regular updates of dependencies, daily backups with point-in-time recovery.</li>
        </ul>

        <h2>5. Subprocessors</h2>
        <p>The Controller approves the following subprocessors:</p>
        <SubprocessorList locale="en" />
        <p>
          The Processor informs the Controller of new subprocessors by email at least 30 days in advance; the Controller may object for good
          cause and in that case terminate the agreement for cause.
        </p>

        <h2>6. Assistance and notifications</h2>
        <p>
          The Processor assists the Controller with requests from data subjects (among other things through data export and deletion in the
          product) and reports personal data breaches without undue delay, at the latest within 48 hours of becoming aware of them.
        </p>

        <h2>7. Deletion and return</h2>
        <p>
          After the end of the agreement, or when the Controller deletes the workspace, all data is deleted; from backups after 30 days at
          the latest. Before that, the Controller can have each person export their data.
        </p>

        <h2>8. Audits</h2>
        <p>
          The Processor provides the information needed to demonstrate compliance with its obligations and allows audits after reasonable
          advance notice, as a rule by way of written information.
        </p>
      </LegalPage>
    );
  }
  return (
    <LegalPage locale="de" path="/avv" title="Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO" updated="2026-10-03">
      <p>
        Dieser Vertrag gilt zwischen dem Kunden, der einen Workspace im Vacation Planner nutzt („Verantwortlicher“), und dem folgenden
        Anbieter („Auftragsverarbeiter“). Er wird mit der Nutzung des Dienstes gemäß den <a href={agb}>AGB</a> geschlossen.
      </p>
      <Operator locale="de" />

      <h2>1. Gegenstand und Dauer</h2>
      <p>
        Der Auftragsverarbeiter betreibt für den Verantwortlichen eine Software zur Urlaubs- und Abwesenheitsplanung. Der Vertrag läuft so
        lange wie die Nutzung des Dienstes.
      </p>

      <h2>2. Art der Daten und betroffene Personen</h2>
      <ul>
        <li>Betroffene: Mitarbeitende und Administratoren des Verantwortlichen.</li>
        <li>
          Daten: Name, E-Mail-Adresse, Rolle, Urlaubskontingent, Arbeitstage, Eintrittsdatum, Region für Feiertage, Buchungen mit Zeitraum
          und Art (Urlaub oder sonstige Abwesenheit).
        </li>
        <li>Besondere Kategorien (Art. 9 DSGVO): keine. Der Dienst erfasst keine Krankheitstage und keine Freitext-Notizen.</li>
      </ul>

      <h2>3. Weisungen</h2>
      <p>
        Der Auftragsverarbeiter verarbeitet die Daten nur auf dokumentierte Weisung des Verantwortlichen; die Einstellungen im Workspace
        gelten als solche Weisungen. Hält er eine Weisung für rechtswidrig, informiert er den Verantwortlichen unverzüglich.
      </p>

      <h2>4. Vertraulichkeit und Sicherheit</h2>
      <p>
        Personen mit Zugriff auf die Daten sind zur Vertraulichkeit verpflichtet. Technische und organisatorische Maßnahmen (Art. 32 DSGVO):
      </p>
      <ul>
        <li>Hosting und Datenbank in der EU (Frankfurt am Main), Verschlüsselung bei der Übertragung (TLS) und im Ruhezustand.</li>
        <li>Anmeldung ohne Passwörter über zeitlich begrenzte E-Mail-Links, Begrenzung von Anmeldeversuchen.</li>
        <li>
          Strikte Trennung der Workspaces, Rechte nach Rollen, Datensparsamkeit (keine Krankheitstage, keine Notizen, automatische Löschung
          nach drei Jahren).
        </li>
        <li>Sicherheits-Header, regelmäßige Updates von Abhängigkeiten, tägliche Sicherungen mit Wiederherstellung zu einem Zeitpunkt.</li>
      </ul>

      <h2>5. Unterauftragsverarbeiter</h2>
      <p>Der Verantwortliche genehmigt die folgenden Unterauftragsverarbeiter:</p>
      <SubprocessorList locale="de" />
      <p>
        Über neue Unterauftragsverarbeiter informiert der Auftragsverarbeiter mindestens 30 Tage vorher per E-Mail; der Verantwortliche kann
        aus wichtigem Grund widersprechen und in diesem Fall außerordentlich kündigen.
      </p>

      <h2>6. Unterstützung und Meldungen</h2>
      <p>
        Der Auftragsverarbeiter unterstützt den Verantwortlichen bei Anfragen Betroffener (u. a. durch Datenexport und Löschung im Produkt)
        und meldet Verletzungen des Schutzes personenbezogener Daten unverzüglich, spätestens innerhalb von 48 Stunden nach Kenntnis.
      </p>

      <h2>7. Löschung und Rückgabe</h2>
      <p>
        Nach Vertragsende oder wenn der Verantwortliche den Workspace löscht, werden alle Daten gelöscht; aus Sicherungskopien spätestens
        nach 30 Tagen. Vorher kann der Verantwortliche jede Person ihre Daten exportieren lassen.
      </p>

      <h2>8. Kontrollen</h2>
      <p>
        Der Auftragsverarbeiter stellt die zum Nachweis der Pflichten nötigen Informationen bereit und ermöglicht Überprüfungen nach
        angemessener Vorankündigung, in der Regel durch schriftliche Auskunft.
      </p>
    </LegalPage>
  );
}
