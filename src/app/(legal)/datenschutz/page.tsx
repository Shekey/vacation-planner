import { LegalPage, Operator } from "@/components/legal";
import { SUBPROCESSORS } from "@/lib/legal";

export const metadata = { title: "Datenschutzerklärung" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Datenschutzerklärung" updated="3. Oktober 2026">
      <h2>1. Verantwortlicher</h2>
      <p>Verantwortlich für die Datenverarbeitung auf dieser Website und für Konten von Workspace-Administratoren ist:</p>
      <Operator />
      <p>
        Für die Daten, die ein Unternehmen über seine Mitarbeitenden im Vacation Planner verwaltet (Urlaube, Abwesenheiten, Kontingente), ist
        das jeweilige Unternehmen Verantwortlicher. Wir verarbeiten diese Daten in seinem Auftrag nach Art. 28 DSGVO; siehe den{" "}
        <a href="/avv">Auftragsverarbeitungsvertrag</a>.
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Konto: E-Mail-Adresse, Name, Zeitpunkt der Anmeldung, Sitzungsdaten (ein technisch notwendiges Cookie).</li>
        <li>
          Workspace: Name des Teams, Mitglieder und Rollen, Urlaubskontingente, Arbeitstage, Eintrittsdatum, Bundesland für Feiertage, Buchungen
          mit Zeitraum und Art („Urlaub“ oder „Sonstige Abwesenheit“).
        </li>
        <li>
          Wir erfassen bewusst keine Krankheitstage und keine Freitext-Notizen, also keine Gesundheitsdaten oder andere besondere Kategorien
          nach Art. 9 DSGVO.
        </li>
        <li>Zahlungen: Firmenname, Rechnungsadresse und USt-ID der zahlenden Kunden; Kartendaten verarbeitet ausschließlich Stripe.</li>
        <li>Server-Protokolle: IP-Adresse, Zeitpunkt und aufgerufene Seite, zur Sicherheit und Fehlersuche, höchstens 30 Tage gespeichert.</li>
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
      <ul>
        {SUBPROCESSORS.map((s) => (
          <li key={s.name}>
            {s.name}: {s.purpose}. Ort: {s.location}.
          </li>
        ))}
      </ul>

      <h2>5. Speicherdauer</h2>
      <p>
        Kontodaten speichern wir, bis das Konto gelöscht wird. Buchungen löschen wir automatisch drei Jahre nach ihrem Ende, ebenso die Daten
        von Personen, die seit drei Jahren aus einem Workspace entfernt sind; erledigte Einladungen nach 30 Tagen. Wird ein Workspace gelöscht, werden alle seine Daten sofort gelöscht; aus
        Sicherungskopien verschwinden sie spätestens nach 30 Tagen. Rechnungsdaten bewahren wir so lange auf, wie es das Handels- und
        Steuerrecht verlangt (bis zu 10 Jahre).
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
