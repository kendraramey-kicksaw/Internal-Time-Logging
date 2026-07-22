"use client";

import { useMemo, useState } from "react";

type PricingStructure = "Capacity" | "T&M" | "Hybrid" | "Internal";
type RecordTypeDeveloperName = "Client_Work" | "Internal_Project" | "Internal_Work";
type SuggestionSource = "Calendar" | "Manual";

type Project = {
  id: string;
  label: string;
  idPricingStructure: string;
  pricingStructure: PricingStructure;
};

type TimeEntry = {
  id: string;
  date: string;
  projectValue: string;
  projectLabel: string;
  hours: number;
  billable: boolean;
  activityType: string;
  notes: string;
  source: SuggestionSource;
};

type SalesforceTimeEntry = Omit<TimeEntry, "source"> & {
  recordId: string;
  category: string;
  timeType: string;
};

type CalendarDiagnostic = {
  date: string;
  pulled: number;
  included: number;
  ignoredHome: number;
  ignoredOoo: number;
  ignoredFocus: number;
  ignoredDeclined: number;
  soloWorkBlocks: number;
  notes: string;
};

const monthStart = "2026-07-01";
const monthEnd = "2026-07-31";
const defaultSuggestionStart = "2026-07-11";
const defaultSuggestionEnd = "2026-07-21";
const ownerId = "0054T000001in8HQAQ";

const RECORD_TYPE_IDS: Record<RecordTypeDeveloperName, string> = {
  Client_Work: "012Qh000002bDl7IAE",
  Internal_Project: "012Qh000002bDDFIA2",
  Internal_Work: "012Qh000002bDDGIA2",
};

const CRISIS_PROJECT = project(
  "a0uQh000004SaXhIAK",
  "Crisis24 - OnSolve Migration - (SOPS)",
  "Capacity",
);

const INTERNAL_PROJECT = project(
  "a0uQh000007aLujIAE",
  "Kicksaw - Internal Time Tracking",
  "Internal",
);

const projectOptions: Project[] = [
  project("a0uQh000008VNTZIA4", "340B Direct (DBA Zion's Financial Bank) - Document Package - COPS", "T&M"),
  project("a0uQh000008VN5NIAW", "340B Direct (DBA Zion's Financial Bank) - Managed Services COPS", "T&M"),
  project("a0uQh000008q4R7IAI", "Aardvark Compare (AARDY): Agentforce Jumpstart (AOD)", "T&M"),
  project("a0uQh000009GvhtIAC", "Abby Care: Maps Jumpstart (SOPS)", "T&M"),
  project("a0uQh000007cMjUIAU", "All About You Adult Foster Care - Managed Services (AOD)", "T&M"),
  project("a0uQh000008saLFIAY", "Allen Edwin Homes: Agentforce Jumpstart (AOD)", "T&M"),
  project("a0uQh000008mx1BIAQ", "Altus: Revenue Cloud Enhancement - Discovery [SOPS]", "Capacity"),
  project("a0uQh000009Gu97IAC", "Aluris: Jumpstart (SOPS)", "T&M"),
  project("a0uQh000009CA3FIAW", "Amstar - SOPS", "Capacity"),
  project("a0uQh0000089MPhIAM", "Analysis Group: Consulting", "T&M"),
  CRISIS_PROJECT,
  project("a0uQh000005vgm1IAA", "Crisis24 - OnSolve Migration - (EOPS)", "Capacity"),
  project("a0uQh000007ZQYHIA4", "Crisis24 - Agentforce POC (SOPS)", "T&M"),
  project("a0uQh000005gx0nIAA", "Crisis24 - GSOC/PSG Portal Project (EOPS)", "Capacity"),
  project("a0uQh000006hdqfIAA", "Crisis24 - OnSolve Workato Support", "T&M"),
  INTERNAL_PROJECT,
  project("a0uQh000005y8UTIAY", "Kicksaw - Marketing Support", "Internal"),
  project("a0uQh0000097SC5IAM", "Sight Sciences - Managed Services - July 2026", "T&M"),
  project("a0uQh000008MrYvIAK", "Sault College - Managed Services", "T&M"),
  project("a0uQh000008grOHIAY", "SBMA Benefits - Managed Services", "T&M"),
  project("a0uQh000007cMkaIAE", "Valor Technical Cleaning - Managed Services (AOD)", "T&M"),
  project("a0uQh000007oL3eIAE", "Vapi - Managed Services (AOD)", "T&M"),
  project("a0uQh000008HBLpIAO", "Vidal Construction - MS", "T&M"),
].sort((a, b) => a.label.localeCompare(b.label));

const activityTypes = [
  "Admin and Overhead",
  "Build",
  "Coding and Configuration",
  "Communications",
  "Design",
  "Documentation",
  "Learning and Development",
  "Meeting",
  "People and Team Activities",
  "Presales",
  "Recruiting",
  "Release",
  "Travel",
];

const salesforceRows: SalesforceTimeEntry[] = [
  sf("a1JQh00000I95R8MAJ", "2026-07-10", CRISIS_PROJECT, 5.25, true, "Coding and Configuration", "", "", "Engagement Fee"),
  sf("a1JQh00000I95R7MAJ", "2026-07-10", CRISIS_PROJECT, 2, true, "Meeting", "", "", "Engagement Fee"),
  sf("a1JQh00000I95R9MAJ", "2026-07-10", INTERNAL_PROJECT, 0.5, false, "People and Team Activities", "", "Internal", "Internal"),
  sf("a1JQh00000I8Nl4MAF", "2026-07-09", CRISIS_PROJECT, 5.5, true, "Coding and Configuration", "", "", "Engagement Fee"),
  sf("a1JQh00000I8Nl3MAF", "2026-07-09", CRISIS_PROJECT, 2, true, "Meeting", "", "", "Engagement Fee"),
  sf("a1JQh00000I8NI3MAN", "2026-07-08", CRISIS_PROJECT, 5, true, "Coding and Configuration", "", "", "Engagement Fee"),
  sf("a1JQh00000I8NI2MAN", "2026-07-08", CRISIS_PROJECT, 5.5, true, "Meeting", "", "", "Engagement Fee"),
  sf("a1JQh00000I8NI4MAN", "2026-07-08", INTERNAL_PROJECT, 0.5, false, "People and Team Activities", "", "Internal", "Internal"),
  sf("a1JQh00000I8NTKMA3", "2026-07-07", CRISIS_PROJECT, 6.25, true, "Coding and Configuration", "", "", "Engagement Fee"),
  sf("a1JQh00000I8NTJMA3", "2026-07-07", CRISIS_PROJECT, 2, true, "Meeting", "", "", "Engagement Fee"),
  sf("a1JQh00000I8NJeMAN", "2026-07-06", CRISIS_PROJECT, 5.5, true, "Coding and Configuration", "", "", "Engagement Fee"),
  sf("a1JQh00000I8NJdMAN", "2026-07-06", CRISIS_PROJECT, 3.5, true, "Meeting", "", "", "Engagement Fee"),
  sf("a1JQh00000Hzhj0MAB", "2026-07-02", CRISIS_PROJECT, 4, true, "Coding and Configuration", "", "", "Engagement Fee"),
  sf("a1JQh00000HzhizMAB", "2026-07-02", CRISIS_PROJECT, 4, true, "Meeting", "", "", "Engagement Fee"),
  sf("a1JQh00000HzhnpMAB", "2026-07-01", CRISIS_PROJECT, 2, true, "Coding and Configuration", "", "", "Engagement Fee"),
].sort(sortSalesforce);

const calendarSuggestionSeed: TimeEntry[] = [
  suggested(
    "2026-07-20",
    CRISIS_PROJECT,
    3,
    true,
    "Meeting",
    "INTERNAL OnSolve | Crisis24 - Weekly Team Planning, OnSolve | Crisis24 - Data Migration Daily Check-In, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, Kayleigh / Ben - App demo, Ben/Kendra - C24 Migration",
  ),
  suggested(
    "2026-07-21",
    CRISIS_PROJECT,
    1,
    true,
    "Meeting",
    "OnSolve | Kicksaw - INTERNAL - Daily Stand-Up, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage",
  ),
];

const calendarDiagnostics: CalendarDiagnostic[] = [
  {
    date: "2026-07-21",
    pulled: 3,
    included: 2,
    ignoredHome: 1,
    ignoredOoo: 0,
    ignoredFocus: 0,
    ignoredDeclined: 0,
    soloWorkBlocks: 0,
    notes: "Primary calendar returned Home plus two accepted meetings; no solo coding/configuration blocks were returned for the full local day.",
  },
  {
    date: "2026-07-20",
    pulled: 5,
    included: 5,
    ignoredHome: 0,
    ignoredOoo: 0,
    ignoredFocus: 0,
    ignoredDeclined: 0,
    soloWorkBlocks: 0,
    notes: "Included meeting titles were consolidated into one same-day suggestion row.",
  },
];

function project(id: string, label: string, pricingStructure: PricingStructure): Project {
  return {
    id,
    label,
    pricingStructure,
    idPricingStructure: `${id}-${pricingStructure}`,
  };
}

function sf(
  recordId: string,
  date: string,
  selectedProject: Project,
  hours: number,
  billable: boolean,
  activityType: string,
  notes: string,
  category: string,
  timeType: string,
): SalesforceTimeEntry {
  return {
    id: recordId,
    recordId,
    date,
    projectValue: selectedProject.idPricingStructure,
    projectLabel: selectedProject.label,
    hours,
    billable,
    activityType,
    notes,
    category,
    timeType,
  };
}

function suggested(
  date: string,
  selectedProject: Project,
  hours: number,
  billable: boolean,
  activityType: string,
  notes: string,
): TimeEntry {
  return {
    id: `${date}-${selectedProject.id}-${activityType}-${notes}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    date,
    projectValue: selectedProject.idPricingStructure,
    projectLabel: selectedProject.label,
    hours,
    billable,
    activityType,
    notes,
    source: "Calendar",
  };
}

function blankEntry(): TimeEntry {
  return {
    id: "manual-draft",
    date: defaultSuggestionEnd,
    projectValue: CRISIS_PROJECT.idPricingStructure,
    projectLabel: CRISIS_PROJECT.label,
    hours: 0.25,
    billable: true,
    activityType: "Meeting",
    notes: "",
    source: "Manual",
  };
}

function sortSuggested(a: TimeEntry, b: TimeEntry) {
  return (
    a.date.localeCompare(b.date) ||
    a.projectLabel.localeCompare(b.projectLabel) ||
    a.activityType.localeCompare(b.activityType)
  );
}

function sortSalesforce(a: SalesforceTimeEntry, b: SalesforceTimeEntry) {
  return (
    b.date.localeCompare(a.date) ||
    a.projectLabel.localeCompare(b.projectLabel) ||
    a.activityType.localeCompare(b.activityType)
  );
}

function inRange(entry: { date: string }, startDate: string, endDate: string) {
  return entry.date >= startDate && entry.date <= endDate;
}

function formatHours(hours: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(hours);
}

function projectForLabel(label: string) {
  return projectOptions.find((candidate) => candidate.label === label);
}

function projectForEntry(entry: Pick<TimeEntry, "projectValue" | "projectLabel">) {
  return (
    projectOptions.find((candidate) => candidate.idPricingStructure === entry.projectValue) ??
    projectForLabel(entry.projectLabel)
  );
}

function pricingStructureForEntry(entry: Pick<TimeEntry, "projectValue" | "projectLabel">) {
  const selectedProject = projectForEntry(entry);
  if (selectedProject) return selectedProject.pricingStructure;
  const parts = entry.projectValue.split("-");
  return (parts[parts.length - 1] || "Capacity") as PricingStructure;
}

function projectIdFromValue(projectValue: string) {
  return projectValue.slice(0, 18);
}

function recordTypeForEntry(entry: Pick<TimeEntry, "projectLabel">): RecordTypeDeveloperName {
  if (entry.projectLabel === INTERNAL_PROJECT.label) return "Internal_Work";
  if (entry.projectLabel.includes("Kicksaw")) return "Internal_Project";
  return "Client_Work";
}

function timeTypeForEntry(entry: Pick<TimeEntry, "projectValue" | "projectLabel">) {
  const pricingStructure = pricingStructureForEntry(entry);
  if (pricingStructure === "Capacity") return "Engagement Fee";
  if (pricingStructure === "T&M") return "Hands-on-Keyboard";
  if (pricingStructure === "Hybrid") return "Engagement Fee";
  return "Internal";
}

function categoryForEntry(entry: Pick<TimeEntry, "projectLabel">) {
  return entry.projectLabel.includes("Kicksaw") ? "Internal" : "";
}

function compactPayloadRecord(entry: TimeEntry) {
  const recordTypeDeveloperName = recordTypeForEntry(entry);
  const nonBillableReason = entry.billable ? undefined : "Not Applicable";
  const notes = entry.notes.trim();

  return {
    attributes: { type: "TASKRAY__trTaskTime__c" },
    RecordTypeId: RECORD_TYPE_IDS[recordTypeDeveloperName],
    TASKRAY__Owner__c: ownerId,
    TASKRAY__Date__c: entry.date,
    TASKRAY__Project__c: projectIdFromValue(entry.projectValue),
    TASKRAY__Hours__c: Number(entry.hours.toFixed(2)),
    TASKRAY__Billable__c: entry.billable,
    TASKRAY__trTimeType__c: timeTypeForEntry(entry),
    Category__c: categoryForEntry(entry) || undefined,
    Non_Billable_Reason__c: nonBillableReason,
    Activity_Type__c: entry.activityType,
    Notes__c: notes.slice(0, 255),
    Notes_Long_Text__c: notes,
  };
}

function toSalesforcePayload(entries: TimeEntry[]) {
  return entries.map(compactPayloadRecord);
}

function ProjectLookup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (selectedProject: Project) => void;
}) {
  return (
    <label>
      {label}
      <input
        list="project-options"
        value={value}
        onChange={(event) => {
          const nextLabel = event.target.value;
          const selectedProject = projectForLabel(nextLabel);
          onChange(
            selectedProject ?? {
              id: "",
              label: nextLabel,
              idPricingStructure: "",
              pricingStructure: "Capacity",
            },
          );
        }}
        placeholder="Start typing a project name"
      />
    </label>
  );
}

export default function Home() {
  const [suggestionStart, setSuggestionStart] = useState(defaultSuggestionStart);
  const [suggestionEnd, setSuggestionEnd] = useState(defaultSuggestionEnd);
  const [salesforceStart, setSalesforceStart] = useState(monthStart);
  const [salesforceEnd, setSalesforceEnd] = useState(monthEnd);
  const [suggestions, setSuggestions] = useState(calendarSuggestionSeed);
  const [manualDraft, setManualDraft] = useState(blankEntry());

  const filteredSuggestions = useMemo(
    () => suggestions.filter((entry) => inRange(entry, suggestionStart, suggestionEnd)).sort(sortSuggested),
    [suggestions, suggestionEnd, suggestionStart],
  );

  const filteredSalesforceRows = useMemo(
    () => salesforceRows.filter((entry) => inRange(entry, salesforceStart, salesforceEnd)).sort(sortSalesforce),
    [salesforceEnd, salesforceStart],
  );

  const filteredDiagnostics = useMemo(
    () => calendarDiagnostics.filter((entry) => inRange(entry, suggestionStart, suggestionEnd)),
    [suggestionEnd, suggestionStart],
  );

  const totals = useMemo(() => {
    const suggestedHours = filteredSuggestions.reduce((sum, entry) => sum + entry.hours, 0);
    const salesforceHours = filteredSalesforceRows.reduce((sum, entry) => sum + entry.hours, 0);
    const flaggedSuggestions = filteredSuggestions.filter(
      (entry) => entry.hours > 12 || !entry.projectValue || entry.notes.trim().length === 0,
    ).length;
    const lastSalesforceDate = salesforceRows.reduce(
      (latest, entry) => (entry.date > latest ? entry.date : latest),
      "",
    );

    return { suggestedHours, salesforceHours, flaggedSuggestions, lastSalesforceDate };
  }, [filteredSalesforceRows, filteredSuggestions]);

  function updateSuggestion(id: string, updates: Partial<TimeEntry>) {
    setSuggestions((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)),
    );
  }

  function addManualEntry() {
    setSuggestions((current) =>
      [
        ...current,
        {
          ...manualDraft,
          id: `manual-${crypto.randomUUID()}`,
          source: "Manual",
        },
      ].sort(sortSuggested),
    );
    setManualDraft(blankEntry());
  }

  function copyPayload() {
    navigator.clipboard.writeText(JSON.stringify(toSalesforcePayload(filteredSuggestions), null, 2));
  }

  return (
    <main className="shell">
      <datalist id="project-options">
        {projectOptions.map((candidate) => (
          <option key={candidate.idPricingStructure} value={candidate.label} />
        ))}
      </datalist>
      <header className="topbar">
        <div>
          <p className="eyebrow">Month to date</p>
          <h1>Calendar Time Entries</h1>
          <p className="subtle">
            Review Salesforce time already entered, then tune calendar-suggested rows for the dates
            after the latest TaskRay Time record.
          </p>
        </div>
        <button type="button" className="primary" onClick={copyPayload}>
          Copy Salesforce Payload
        </button>
      </header>

      <section className="metrics" aria-label="Month to date totals">
        <div>
          <span>Latest Salesforce Entry</span>
          <strong>{totals.lastSalesforceDate}</strong>
        </div>
        <div>
          <span>Suggested Hours</span>
          <strong>{formatHours(totals.suggestedHours)}</strong>
        </div>
        <div>
          <span>Salesforce Hours</span>
          <strong>{formatHours(totals.salesforceHours)}</strong>
        </div>
        <div className={totals.flaggedSuggestions ? "needs-review" : ""}>
          <span>Rows To Review</span>
          <strong>{totals.flaggedSuggestions}</strong>
        </div>
      </section>

      <section className="rules-strip" aria-label="Current automation rules">
        <div>
          <strong>Project source</strong>
          <span>Flow filters: active, non-parent, non-template TaskRay projects; label is Name, value is Id_Pricing_Structure__c.</span>
        </div>
        <div>
          <strong>Calendar filters</strong>
          <span>Declined, Focus Time, Home, and OOO entries are ignored before suggestions are built.</span>
        </div>
        <div>
          <strong>Payload logic</strong>
          <span>Record type and time type are derived from project label and pricing structure.</span>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Table 1</p>
            <h2>Suggested Time Entries</h2>
          </div>
          <div className="date-filters">
            <label>
              Start
              <input
                type="date"
                value={suggestionStart}
                onChange={(event) => setSuggestionStart(event.target.value)}
              />
            </label>
            <label>
              End
              <input
                type="date"
                value={suggestionEnd}
                onChange={(event) => setSuggestionEnd(event.target.value)}
              />
            </label>
          </div>
        </div>
        <p className="table-note">
          OOO is no longer suggested as time. Same-day calendar entries with the same title should be
          consolidated into one row before review.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Hours</th>
                <th>Billable</th>
                <th>Activity Type</th>
                <th>Notes</th>
                <th>Derived</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuggestions.map((entry) => {
                const selectedProject = projectForEntry(entry);
                return (
                  <tr key={entry.id} className={entry.hours > 12 || !entry.projectValue ? "review-row" : ""}>
                    <td>
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(event) => updateSuggestion(entry.id, { date: event.target.value })}
                      />
                    </td>
                    <td>
                      <ProjectLookup
                        label="Project"
                        value={entry.projectLabel}
                        onChange={(selected) =>
                          updateSuggestion(entry.id, {
                            projectValue: selected.idPricingStructure,
                            projectLabel: selected.label,
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="hours"
                        type="number"
                        min="0"
                        step="0.25"
                        value={entry.hours}
                        onChange={(event) =>
                          updateSuggestion(entry.id, { hours: Number(event.target.value) })
                        }
                      />
                    </td>
                    <td className="checkbox-cell">
                      <input
                        aria-label={`Billable ${entry.projectLabel}`}
                        type="checkbox"
                        checked={entry.billable}
                        onChange={(event) =>
                          updateSuggestion(entry.id, { billable: event.target.checked })
                        }
                      />
                    </td>
                    <td>
                      <select
                        value={entry.activityType}
                        onChange={(event) =>
                          updateSuggestion(entry.id, { activityType: event.target.value })
                        }
                      >
                        {activityTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <textarea
                        value={entry.notes}
                        onChange={(event) => updateSuggestion(entry.id, { notes: event.target.value })}
                      />
                    </td>
                    <td className="derived-cell">
                      <span>{selectedProject?.pricingStructure ?? "Unmatched project"}</span>
                      <span>{timeTypeForEntry(entry)}</span>
                      <span>{recordTypeForEntry(entry).replaceAll("_", " ")}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel diagnostics-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Calendar Diagnostics</p>
            <h2>Source Check</h2>
          </div>
        </div>
        <p className="table-note">
          This shows what the calendar pull saw for the selected suggestion dates, so missing coding
          blocks are visible as source gaps instead of silently disappearing.
        </p>
        <div className="diagnostics-grid">
          {filteredDiagnostics.map((entry) => (
            <article key={entry.date} className="diagnostic-card">
              <div>
                <strong>{entry.date}</strong>
                <span>{entry.notes}</span>
              </div>
              <dl>
                <div>
                  <dt>Pulled</dt>
                  <dd>{entry.pulled}</dd>
                </div>
                <div>
                  <dt>Included</dt>
                  <dd>{entry.included}</dd>
                </div>
                <div>
                  <dt>Solo work</dt>
                  <dd>{entry.soloWorkBlocks}</dd>
                </div>
                <div>
                  <dt>Ignored</dt>
                  <dd>{entry.ignoredHome + entry.ignoredOoo + entry.ignoredFocus + entry.ignoredDeclined}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Table 2</p>
            <h2>Manual Entry</h2>
          </div>
          <button type="button" className="primary" onClick={addManualEntry}>
            Add Entry
          </button>
        </div>
        <div className="manual-grid">
          <label>
            Date
            <input
              type="date"
              value={manualDraft.date}
              onChange={(event) => setManualDraft({ ...manualDraft, date: event.target.value })}
            />
          </label>
          <ProjectLookup
            label="Project"
            value={manualDraft.projectLabel}
            onChange={(selectedProject) =>
              setManualDraft({
                ...manualDraft,
                projectValue: selectedProject.idPricingStructure,
                projectLabel: selectedProject.label,
              })
            }
          />
          <label>
            Hours
            <input
              type="number"
              min="0"
              step="0.25"
              value={manualDraft.hours}
              onChange={(event) =>
                setManualDraft({ ...manualDraft, hours: Number(event.target.value) })
              }
            />
          </label>
          <label className="manual-checkbox">
            Billable
            <input
              type="checkbox"
              checked={manualDraft.billable}
              onChange={(event) =>
                setManualDraft({ ...manualDraft, billable: event.target.checked })
              }
            />
          </label>
          <label>
            Activity Type
            <select
              value={manualDraft.activityType}
              onChange={(event) =>
                setManualDraft({ ...manualDraft, activityType: event.target.value })
              }
            >
              {activityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="notes-field">
            Notes
            <textarea
              value={manualDraft.notes}
              onChange={(event) => setManualDraft({ ...manualDraft, notes: event.target.value })}
              placeholder="Describe the work for Salesforce notes"
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Table 3</p>
            <h2>Salesforce TaskRay Time</h2>
          </div>
          <div className="date-filters">
            <label>
              Start
              <input
                type="date"
                value={salesforceStart}
                onChange={(event) => setSalesforceStart(event.target.value)}
              />
            </label>
            <label>
              End
              <input
                type="date"
                value={salesforceEnd}
                onChange={(event) => setSalesforceEnd(event.target.value)}
              />
            </label>
          </div>
        </div>
        <p className="table-note">
          Read-only TaskRay Time rows are sorted by Date descending, then Project and Activity Type.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Hours</th>
                <th>Billable</th>
                <th>Activity Type</th>
                <th>Time Type</th>
                <th>Notes</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalesforceRows.map((entry) => (
                <tr key={entry.recordId}>
                  <td>{entry.date}</td>
                  <td>{entry.projectLabel}</td>
                  <td className="numeric">{formatHours(entry.hours)}</td>
                  <td>{entry.billable ? "True" : "False"}</td>
                  <td>{entry.activityType}</td>
                  <td>{entry.timeType || "-"}</td>
                  <td>{entry.notes || "-"}</td>
                  <td className="record-id">{entry.recordId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
