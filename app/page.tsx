"use client";

import { useMemo, useState } from "react";

type Project = {
  id: string;
  label: string;
};

type TimeEntry = {
  id: string;
  date: string;
  projectId: string;
  projectLabel: string;
  hours: number;
  billable: boolean;
  activityType: string;
  notes: string;
  source: "Calendar" | "Manual";
};

type SalesforceTimeEntry = Omit<TimeEntry, "source"> & {
  recordId: string;
  category: string;
  type: string;
};

const monthStart = "2026-07-01";
const monthEnd = "2026-07-21";
const defaultSuggestionStart = "2026-07-11";
const defaultSuggestionEnd = "2026-07-21";

const CRISIS_PROJECT: Project = {
  id: "a0uQh000004SaXhIAK",
  label: "Crisis24 - OnSolve Migration - (SOPS)",
};

const INTERNAL_PROJECT: Project = {
  id: "a0uQh000007aLujIAE",
  label: "Kicksaw - Internal Time Tracking",
};

const projectOptions: Project[] = [
  CRISIS_PROJECT,
  INTERNAL_PROJECT,
  { id: "a0uQh000005vgm1IAA", label: "Crisis24 - OnSolve Migration - (EOPS)" },
  { id: "a0uQh000007ZQYHIA4", label: "Crisis24 - Agentforce POC (SOPS)" },
  { id: "a0uQh000005gx0nIAA", label: "Crisis24 - GSOC/PSG Portal Project (EOPS)" },
  { id: "a0uQh000006hdqfIAA", label: "Crisis24 - OnSolve Workato Support" },
  { id: "a0uQh000005y8UTIAY", label: "Kicksaw - Marketing Support" },
  { id: "a0uQh000008VNTZIA4", label: "340B Direct (DBA Zion's Financial Bank) - Document Package - COPS" },
  { id: "a0uQh000008VN5NIAW", label: "340B Direct (DBA Zion's Financial Bank) - Managed Services COPS" },
  { id: "a0uQh000008q4R7IAI", label: "Aardvark Compare (AARDY): Agentforce Jumpstart (AOD)" },
  { id: "a0uQh000009GvhtIAC", label: "Abby Care: Maps Jumpstart (SOPS)" },
  { id: "a0uQh000007cMjUIAU", label: "All About You Adult Foster Care - Managed Services (AOD)" },
  { id: "a0uQh000008saLFIAY", label: "Allen Edwin Homes: Agentforce Jumpstart (AOD)" },
  { id: "a0uQh000008mx1BIAQ", label: "Altus: Revenue Cloud Enhancement - Discovery [SOPS]" },
  { id: "a0uQh000009Gu97IAC", label: "Aluris: Jumpstart (SOPS)" },
  { id: "a0uQh000009CA3FIAW", label: "Amstar - SOPS" },
  { id: "a0uQh0000089MPhIAM", label: "Analysis Group: Consulting" },
  { id: "a0uQh0000097SC5IAM", label: "Sight Sciences - Managed Services - July 2026" },
  { id: "a0uQh000008MrYvIAK", label: "Sault College - Managed Services" },
  { id: "a0uQh000008grOHIAY", label: "SBMA Benefits - Managed Services" },
  { id: "a0uQh000007cMkaIAE", label: "Valor Technical Cleaning - Managed Services (AOD)" },
  { id: "a0uQh000007oL3eIAE", label: "Vapi - Managed Services (AOD)" },
  { id: "a0uQh000008HBLpIAO", label: "Vidal Construction - MS" },
].sort((a, b) => a.label.localeCompare(b.label));

const activityTypes = [
  "Meeting",
  "Coding and Configuration",
  "People and Team Activities",
  "PTO",
  "Build",
  "Release",
  "Design",
  "Documentation",
  "Admin and Overhead",
  "Learning and Development",
  "Communications",
  "Presales",
  "Recruiting",
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
  suggested("2026-07-13", INTERNAL_PROJECT, 16, false, "PTO", "Out of office"),
  suggested("2026-07-14", INTERNAL_PROJECT, 24, false, "PTO", "Out of office"),
  suggested("2026-07-15", INTERNAL_PROJECT, 24, false, "PTO", "Out of office"),
  suggested("2026-07-16", INTERNAL_PROJECT, 24, false, "PTO", "Out of office"),
  suggested("2026-07-17", INTERNAL_PROJECT, 20, false, "PTO", "Out of office"),
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

function sf(
  recordId: string,
  date: string,
  project: Project,
  hours: number,
  billable: boolean,
  activityType: string,
  notes: string,
  category: string,
  type: string,
): SalesforceTimeEntry {
  return {
    id: recordId,
    recordId,
    date,
    projectId: project.id,
    projectLabel: project.label,
    hours,
    billable,
    activityType,
    notes,
    category,
    type,
  };
}

function suggested(
  date: string,
  project: Project,
  hours: number,
  billable: boolean,
  activityType: string,
  notes: string,
): TimeEntry {
  return {
    id: `${date}-${activityType}-${notes}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    date,
    projectId: project.id,
    projectLabel: project.label,
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
    projectId: CRISIS_PROJECT.id,
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
  return projectOptions.find((project) => project.label === label);
}

function toSalesforcePayload(entries: TimeEntry[]) {
  return entries.map((entry) => ({
    attributes: { type: "TASKRAY__trTaskTime__c" },
    TASKRAY__Date__c: entry.date,
    TASKRAY__Project__c: entry.projectId,
    TASKRAY__Hours__c: Number(entry.hours.toFixed(2)),
    TASKRAY__Billable__c: entry.billable,
    Activity_Type__c: entry.activityType,
    TASKRAY__Notes__c: entry.notes,
  }));
}

function ProjectLookup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (project: Project) => void;
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
          onChange(selectedProject ?? { id: "", label: nextLabel });
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
  const [salesforceEnd, setSalesforceEnd] = useState("2026-07-31");
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

  const totals = useMemo(() => {
    const suggestedHours = filteredSuggestions.reduce((sum, entry) => sum + entry.hours, 0);
    const salesforceHours = filteredSalesforceRows.reduce((sum, entry) => sum + entry.hours, 0);
    const flaggedSuggestions = filteredSuggestions.filter((entry) => entry.hours > 12 || !entry.projectId).length;
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
        {projectOptions.map((project) => (
          <option key={project.id} value={project.label} />
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
          Default starts the day after the last Salesforce entry. Meetings that overlapped Out of
          Office blocks were excluded from the suggestion set.
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
              </tr>
            </thead>
            <tbody>
              {filteredSuggestions.map((entry) => (
                <tr key={entry.id} className={entry.hours > 12 || !entry.projectId ? "review-row" : ""}>
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
                      onChange={(project) =>
                        updateSuggestion(entry.id, {
                          projectId: project.id,
                          projectLabel: project.label,
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
                </tr>
              ))}
            </tbody>
          </table>
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
            onChange={(project) =>
              setManualDraft({ ...manualDraft, projectId: project.id, projectLabel: project.label })
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
          Read-only pull from KicksawProd for TaskRay Time records owned by Kendra Ramey. Sorted by
          Date descending, then Project and Activity Type.
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
