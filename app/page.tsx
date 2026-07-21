"use client";

import { useMemo, useState } from "react";

type ProjectKey = "client" | "internal";

type TimeEntry = {
  id: string;
  date: string;
  projectKey: ProjectKey;
  projectId: string;
  projectName: string;
  hours: number;
  billable: true;
  activityType: string;
  notes: string;
  source: string;
};

const CLIENT_PROJECT = {
  key: "client" as const,
  id: "a0uQh000004SaXhIAK",
  name: "Project Work",
};

const INTERNAL_PROJECT = {
  key: "internal" as const,
  id: "a0uQh000007aLujIAE",
  name: "Kicksaw - Internal Time Tracking",
};

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

const seedEntries: TimeEntry[] = [
  entry("2026-07-01", "internal", 13, "PTO", "Canada Day", "Calendar"),
  entry("2026-07-01", "client", 2, "Coding and Configuration", "PC Deployments", "Calendar"),
  entry(
    "2026-07-02",
    "client",
    2.5,
    "Meeting",
    "OnSolve | Kicksaw - INTERNAL - Daily Stand-Up, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, OnSolve Tech Team | Kicksaw - Metrics Review",
    "Calendar",
  ),
  entry(
    "2026-07-02",
    "client",
    5.5,
    "Coding and Configuration",
    "Metrics fun, UAT, Closed Opp Flow",
    "Calendar",
  ),
  entry(
    "2026-07-06",
    "client",
    3.5,
    "Meeting",
    "Ginny Chat, INTERNAL OnSolve | Crisis24 - Weekly Team Planning, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, OnSolve | Kicsaw Metrics Follow-Up",
    "Calendar",
  ),
  entry("2026-07-06", "client", 5.5, "Coding and Configuration", "Deployments", "Calendar"),
  entry(
    "2026-07-07",
    "client",
    2,
    "Meeting",
    "OnSolve | Kicksaw - INTERNAL - Daily Stand-Up, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, Closing Process Flow, CPQ Migration Challenges/Changes",
    "Calendar",
  ),
  entry(
    "2026-07-07",
    "client",
    6.25,
    "Coding and Configuration",
    "Tickets, Migration Price Validation, Data fix",
    "Calendar",
  ),
  entry(
    "2026-07-08",
    "client",
    3.5,
    "Meeting",
    "OnSolve | Kicksaw - INTERNAL - Daily Stand-Up, OnSolve Tech Team | Kicksaw - Metrics Review, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, OS Data Fix Review",
    "Calendar",
  ),
  entry(
    "2026-07-08",
    "client",
    7,
    "Coding and Configuration",
    "Opp Line Migration Prep, Deployments, OS Data fix, OS Data Fix Party",
    "Calendar",
  ),
  entry(
    "2026-07-08",
    "internal",
    0.5,
    "People and Team Activities",
    "Kendra / DJ (Bi-weekly, 1:1, until 8/10)",
    "Calendar",
  ),
  entry(
    "2026-07-09",
    "client",
    2,
    "Meeting",
    "OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, OS Data Fix Debrief",
    "Calendar",
  ),
  entry("2026-07-09", "client", 5, "Coding and Configuration", "Deployments, OS Data Audit", "Calendar"),
  entry("2026-07-09", "internal", 1, "PTO", "Out of office", "Calendar"),
  entry(
    "2026-07-10",
    "client",
    1.5,
    "Meeting",
    "OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, Kendra / Ben",
    "Calendar",
  ),
  entry(
    "2026-07-10",
    "client",
    5.75,
    "Coding and Configuration",
    "Metrics & things, Deployments to PC",
    "Calendar",
  ),
  entry("2026-07-10", "internal", 0.75, "People and Team Activities", "Delivery AI Lounge (Optional Series)", "Calendar"),
  entry("2026-07-10", "internal", 1, "PTO", "Out of office", "Calendar"),
  entry(
    "2026-07-13",
    "client",
    1.5,
    "Meeting",
    "INTERNAL OnSolve | Crisis24 - Weekly Team Planning, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage",
    "Calendar",
  ),
  entry("2026-07-13", "internal", 16, "PTO", "Out of office", "Calendar"),
  entry(
    "2026-07-14",
    "client",
    1,
    "Meeting",
    "OnSolve | Kicksaw - INTERNAL - Daily Stand-Up, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage",
    "Calendar",
  ),
  entry("2026-07-14", "internal", 24, "PTO", "Out of office", "Calendar"),
  entry(
    "2026-07-15",
    "client",
    1,
    "Meeting",
    "OnSolve | Kicksaw - INTERNAL - Daily Stand-Up, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage",
    "Calendar",
  ),
  entry("2026-07-15", "internal", 24, "PTO", "Out of office", "Calendar"),
  entry(
    "2026-07-16",
    "client",
    1,
    "Meeting",
    "OnSolve | Kicksaw - INTERNAL - Daily Stand-Up, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage",
    "Calendar",
  ),
  entry("2026-07-16", "internal", 24, "PTO", "Out of office", "Calendar"),
  entry(
    "2026-07-17",
    "client",
    1,
    "Meeting",
    "OnSolve | Kicksaw - INTERNAL - Daily Stand-Up, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage",
    "Calendar",
  ),
  entry("2026-07-17", "internal", 1, "People and Team Activities", "July Delivery All Hands", "Calendar"),
  entry("2026-07-17", "internal", 20, "PTO", "Out of office", "Calendar"),
  entry(
    "2026-07-20",
    "client",
    3,
    "Meeting",
    "INTERNAL OnSolve | Crisis24 - Weekly Team Planning, OnSolve | Crisis24 - Data Migration Daily Check-In, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, Kayleigh / Ben - App demo, Ben/Kendra - C24 Migration",
    "Calendar",
  ),
  entry(
    "2026-07-21",
    "client",
    1,
    "Meeting",
    "OnSolve | Kicksaw - INTERNAL - Daily Stand-Up, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage",
    "Calendar",
  ),
];

function entry(
  date: string,
  projectKey: ProjectKey,
  hours: number,
  activityType: string,
  notes: string,
  source: string,
): TimeEntry {
  const project = projectKey === "client" ? CLIENT_PROJECT : INTERNAL_PROJECT;

  return {
    id: `${date}-${activityType}-${notes}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    date,
    projectKey,
    projectId: project.id,
    projectName: project.name,
    hours,
    billable: true,
    activityType,
    notes,
    source,
  };
}

function blankEntry(): TimeEntry {
  return entry(new Date().toISOString().slice(0, 10), "client", 0.25, "Meeting", "", "Manual");
}

function formatHours(hours: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(hours);
}

function toCsv(entries: TimeEntry[]) {
  const rows = [
    ["Date", "Project", "Hours", "Billable", "Activity Type", "Notes"],
    ...entries.map((entryRow) => [
      entryRow.date,
      entryRow.projectId,
      entryRow.hours.toString(),
      "TRUE",
      entryRow.activityType,
      entryRow.notes,
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell);
          return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
        })
        .join(","),
    )
    .join("\n");
}

function toSalesforcePayload(entries: TimeEntry[]) {
  return entries.map((entryRow) => ({
    attributes: { type: "TASKRAY__trTaskTime__c" },
    TASKRAY__Date__c: entryRow.date,
    TASKRAY__Project__c: entryRow.projectId,
    TASKRAY__Hours__c: Number(entryRow.hours.toFixed(2)),
    TASKRAY__Billable__c: true,
    Activity_Type__c: entryRow.activityType,
    TASKRAY__Notes__c: entryRow.notes,
  }));
}

export default function Home() {
  const [entries, setEntries] = useState(seedEntries);
  const [draft, setDraft] = useState(blankEntry());
  const [filter, setFilter] = useState("all");

  const visibleEntries = useMemo(() => {
    if (filter === "all") {
      return entries;
    }

    return entries.filter((entryRow) => entryRow.activityType === filter);
  }, [entries, filter]);

  const totals = useMemo(() => {
    const billableHours = entries.reduce((sum, entryRow) => sum + entryRow.hours, 0);
    const clientHours = entries
      .filter((entryRow) => entryRow.projectKey === "client")
      .reduce((sum, entryRow) => sum + entryRow.hours, 0);
    const internalHours = billableHours - clientHours;
    const reviewRows = entries.filter((entryRow) => entryRow.hours > 12).length;

    return { billableHours, clientHours, internalHours, reviewRows };
  }, [entries]);

  function updateEntry(id: string, updates: Partial<TimeEntry>) {
    setEntries((current) =>
      current.map((entryRow) => {
        if (entryRow.id !== id) {
          return entryRow;
        }

        const next = { ...entryRow, ...updates };
        if (updates.projectKey) {
          const project = updates.projectKey === "client" ? CLIENT_PROJECT : INTERNAL_PROJECT;
          next.projectId = project.id;
          next.projectName = project.name;
        }

        return next;
      }),
    );
  }

  function addManualEntry() {
    const project = draft.projectKey === "client" ? CLIENT_PROJECT : INTERNAL_PROJECT;
    setEntries((current) => [
      ...current,
      {
        ...draft,
        id: `manual-${crypto.randomUUID()}`,
        projectId: project.id,
        projectName: project.name,
        billable: true,
        source: "Manual",
      },
    ]);
    setDraft(blankEntry());
  }

  function duplicateEntry(entryRow: TimeEntry) {
    setEntries((current) => [
      ...current,
      { ...entryRow, id: `copy-${crypto.randomUUID()}`, source: "Manual copy" },
    ]);
  }

  function copyPayload() {
    navigator.clipboard.writeText(JSON.stringify(toSalesforcePayload(entries), null, 2));
  }

  function downloadCsv() {
    const blob = new Blob([toCsv(entries)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "july-time-entries.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">KicksawProd review workspace</p>
          <h1>Calendar Time Entries</h1>
          <p className="subtle">
            Seeded from Google Calendar for July 1-21, 2026. Declined events,
            transparent Home blocks, and Focus Time are excluded.
          </p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => setEntries(seedEntries)}>
            Reset
          </button>
          <button type="button" onClick={downloadCsv}>
            Export CSV
          </button>
          <button type="button" className="primary" onClick={copyPayload}>
            Copy Salesforce Payload
          </button>
        </div>
      </header>

      <section className="metrics" aria-label="Totals">
        <div>
          <span>Total Hours</span>
          <strong>{formatHours(totals.billableHours)}</strong>
        </div>
        <div>
          <span>Project Work</span>
          <strong>{formatHours(totals.clientHours)}</strong>
        </div>
        <div>
          <span>Internal / PTO</span>
          <strong>{formatHours(totals.internalHours)}</strong>
        </div>
        <div className={totals.reviewRows ? "needs-review" : ""}>
          <span>Rows To Review</span>
          <strong>{totals.reviewRows}</strong>
        </div>
      </section>

      <section className="toolbar" aria-label="Table controls">
        <label>
          Activity
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All activity types</option>
            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <p>
          Multi-day PTO rows over 12 hours are marked for review because the
          source calendar block spans overnight.
        </p>
      </section>

      <section className="table-wrap" aria-label="Editable time entries">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Project</th>
              <th>Hours</th>
              <th>Billable</th>
              <th>Activity Type</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleEntries.map((entryRow) => (
              <tr key={entryRow.id} className={entryRow.hours > 12 ? "review-row" : ""}>
                <td>
                  <input
                    type="date"
                    value={entryRow.date}
                    onChange={(event) => updateEntry(entryRow.id, { date: event.target.value })}
                  />
                </td>
                <td>
                  <select
                    value={entryRow.projectKey}
                    onChange={(event) =>
                      updateEntry(entryRow.id, { projectKey: event.target.value as ProjectKey })
                    }
                  >
                    <option value="client">{CLIENT_PROJECT.id}</option>
                    <option value="internal">{INTERNAL_PROJECT.id}</option>
                  </select>
                </td>
                <td>
                  <input
                    className="hours"
                    type="number"
                    min="0"
                    step="0.25"
                    value={entryRow.hours}
                    onChange={(event) =>
                      updateEntry(entryRow.id, { hours: Number(event.target.value) })
                    }
                  />
                </td>
                <td>
                  <span className="pill">True</span>
                </td>
                <td>
                  <select
                    value={entryRow.activityType}
                    onChange={(event) =>
                      updateEntry(entryRow.id, { activityType: event.target.value })
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
                    value={entryRow.notes}
                    onChange={(event) => updateEntry(entryRow.id, { notes: event.target.value })}
                  />
                </td>
                <td>
                  <div className="row-actions">
                    <button type="button" onClick={() => duplicateEntry(entryRow)}>
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        setEntries((current) => current.filter((item) => item.id !== entryRow.id))
                      }
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="manual-entry" aria-label="Add manual time entry">
        <div>
          <p className="eyebrow">Manual entry</p>
          <h2>Add a time entry</h2>
        </div>
        <div className="manual-grid">
          <label>
            Date
            <input
              type="date"
              value={draft.date}
              onChange={(event) => setDraft({ ...draft, date: event.target.value })}
            />
          </label>
          <label>
            Project
            <select
              value={draft.projectKey}
              onChange={(event) =>
                setDraft({ ...draft, projectKey: event.target.value as ProjectKey })
              }
            >
              <option value="client">{CLIENT_PROJECT.id}</option>
              <option value="internal">{INTERNAL_PROJECT.id}</option>
            </select>
          </label>
          <label>
            Hours
            <input
              type="number"
              min="0"
              step="0.25"
              value={draft.hours}
              onChange={(event) => setDraft({ ...draft, hours: Number(event.target.value) })}
            />
          </label>
          <label>
            Billable
            <input type="text" value="True" readOnly />
          </label>
          <label>
            Activity Type
            <select
              value={draft.activityType}
              onChange={(event) => setDraft({ ...draft, activityType: event.target.value })}
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
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              placeholder="Describe the work for Salesforce notes"
            />
          </label>
        </div>
        <button type="button" className="primary add-button" onClick={addManualEntry}>
          Add Entry
        </button>
      </section>

      <section className="payload" aria-label="Salesforce field mapping">
        <h2>Salesforce Mapping</h2>
        <dl>
          <div>
            <dt>Object</dt>
            <dd>TASKRAY__trTaskTime__c</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>TASKRAY__Date__c</dd>
          </div>
          <div>
            <dt>Project</dt>
            <dd>TASKRAY__Project__c</dd>
          </div>
          <div>
            <dt>Hours</dt>
            <dd>TASKRAY__Hours__c</dd>
          </div>
          <div>
            <dt>Billable</dt>
            <dd>TASKRAY__Billable__c</dd>
          </div>
          <div>
            <dt>Activity Type</dt>
            <dd>Activity_Type__c</dd>
          </div>
          <div>
            <dt>Notes</dt>
            <dd>TASKRAY__Notes__c</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
