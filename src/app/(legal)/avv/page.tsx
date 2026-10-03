import { LegalPage, Operator } from "@/components/legal";
import { SUBPROCESSORS } from "@/lib/legal";

export const metadata = { title: "Auftragsverarbeitungsvertrag" };

export default function DpaPage() {
  return (
    <LegalPage title="Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO" updated="3. Oktober 2026">
      <p>
        Dieser Vertrag gilt zwischen dem Kunden, der einen Workspace im Vacation Planner nutzt („Verantwortlicher“), und dem folgenden Anbieter
        („Auftragsverarbeiter“). Er wird mit der Nutzung des Dienstes gemäß den <a href="/agb">AGB</a> geschlossen.
      </p>
      <Operator />

      <h2>1. Gegenstand und Dauer</h2>
      <p>
        Der Auftragsverarbeiter betreibt für den Verantwortlichen eine Software zur Urlaubs- und Abwesenheitsplanung. Der Vertrag läuft so lange
        wie die Nutzung des Dienstes.
      </p>

      <h2>2. Art der Daten und betroffene Personen</h2>
      <ul>
        <li>Betroffene: Mitarbeitende und Administratoren des Verantwortlichen.</li>
        <li>
          Daten: Name, E-Mail-Adresse, Rolle, Urlaubskontingent, Arbeitstage, Eintrittsdatum, Region für Feiertage, Buchungen mit Art, Zeitraum
          und Notiz.
        </li>
        <li>Besondere Kategorien: Angaben zu Krankheitstagen (Gesundheitsdaten), ohne Diagnosen, sofern Nutzer keine in Notizen eintragen.</li>
      </ul>

      <h2>3. Weisungen</h2>
      <p>
        Der Auftragsverarbeiter verarbeitet die Daten nur auf dokumentierte Weisung des Verantwortlichen; die Einstellungen im Workspace gelten
        als solche Weisungen. Hält er eine Weisung für rechtswidrig, informiert er den Verantwortlichen unverzüglich.
      </p>

      <h2>4. Vertraulichkeit und Sicherheit</h2>
      <p>Personen mit Zugriff auf die Daten sind zur Vertraulichkeit verpflichtet. Technische und organisatorische Maßnahmen (Art. 32 DSGVO):</p>
      <ul>
        <li>Hosting und Datenbank in der EU (Frankfurt am Main), Verschlüsselung bei der Übertragung (TLS) und im Ruhezustand.</li>
        <li>Anmeldung ohne Passwörter über zeitlich begrenzte E-Mail-Links, Begrenzung von Anmeldeversuchen.</li>
        <li>Strikte Trennung der Workspaces, Rechte nach Rollen, Krankheitstage für Kollegen standardmäßig verborgen.</li>
        <li>Sicherheits-Header, regelmäßige Updates von Abhängigkeiten, tägliche Sicherungen mit Wiederherstellung zu einem Zeitpunkt.</li>
      </ul>

      <h2>5. Unterauftragsverarbeiter</h2>
      <p>Der Verantwortliche genehmigt die folgenden Unterauftragsverarbeiter:</p>
      <ul>
        {SUBPROCESSORS.map((s) => (
          <li key={s.name}>
            {s.name}: {s.purpose}. Ort: {s.location}.
          </li>
        ))}
      </ul>
      <p>
        Über neue Unterauftragsverarbeiter informiert der Auftragsverarbeiter mindestens 30 Tage vorher per E-Mail; der Verantwortliche kann
        aus wichtigem Grund widersprechen und in diesem Fall außerordentlich kündigen.
      </p>

      <h2>6. Unterstützung und Meldungen</h2>
      <p>
        Der Auftragsverarbeiter unterstützt den Verantwortlichen bei Anfragen Betroffener (u. a. durch Datenexport und Löschung im Produkt) und
        meldet Verletzungen des Schutzes personenbezogener Daten unverzüglich, spätestens innerhalb von 48 Stunden nach Kenntnis.
      </p>

      <h2>7. Löschung und Rückgabe</h2>
      <p>
        Nach Vertragsende oder wenn der Verantwortliche den Workspace löscht, werden alle Daten gelöscht; aus Sicherungskopien spätestens nach 30
        Tagen. Vorher kann der Verantwortliche jede Person ihre Daten exportieren lassen.
      </p>

      <h2>8. Kontrollen</h2>
      <p>
        Der Auftragsverarbeiter stellt die zum Nachweis der Pflichten nötigen Informationen bereit und ermöglicht Überprüfungen nach
        angemessener Vorankündigung, in der Regel durch schriftliche Auskunft.
      </p>
    </LegalPage>
  );
}
