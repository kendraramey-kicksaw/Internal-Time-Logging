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
  recordName: string;
  category: string;
  timeType: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  project: Project;
  activityType: "Meeting" | "Coding and Configuration" | "People and Team Activities";
  billable: boolean;
  responseStatus?: "accepted" | "declined" | null;
  transparency?: "opaque" | "transparent";
};

type SortDirection = "asc" | "desc";
type SuggestedSortKey = "date" | "projectLabel" | "hours" | "billable" | "activityType" | "notes";
type SalesforceSortKey =
  | "date"
  | "recordName"
  | "projectLabel"
  | "hours"
  | "billable"
  | "activityType"
  | "timeType"
  | "notes";

type SortConfig<Key extends string> = {
  key: Key;
  direction: SortDirection;
};

type SalesforceColumnKey =
  | "date"
  | "recordName"
  | "projectLabel"
  | "hours"
  | "billable"
  | "activityType"
  | "timeType"
  | "notes";

const monthStart = "2026-07-01";
const monthEnd = "2026-07-31";
const defaultSuggestionStart = "2026-07-11";
const defaultSuggestionEnd = "2026-07-21";
const ownerId = "0054T000001in8HQAQ";
const salesforceBaseUrl = "https://kicksaw.my.salesforce.com";
const initialSalesforceColumnWidths: Record<SalesforceColumnKey, number> = {
  date: 126,
  recordName: 128,
  projectLabel: 260,
  hours: 84,
  billable: 86,
  activityType: 168,
  timeType: 128,
  notes: 580,
};

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
  sf("a1JQh00000I95R8MAJ", "TIME-178790", "2026-07-10", CRISIS_PROJECT, 5.25, true, "Coding and Configuration", "Build -Deployments to PC", "", "Engagement Fee"),
  sf("a1JQh00000I95R7MAJ", "TIME-178789", "2026-07-10", CRISIS_PROJECT, 2, true, "Meeting", "Meetings -Metrics & things, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, Kendra / Ben", "", "Engagement Fee"),
  sf("a1JQh00000I95R9MAJ", "TIME-178791", "2026-07-10", INTERNAL_PROJECT, 0.5, false, "People and Team Activities", "Delivery AI Lounge (Optional Series)", "Internal", "Internal"),
  sf("a1JQh00000I8Nl4MAF", "TIME-178414", "2026-07-09", CRISIS_PROJECT, 5.5, true, "Coding and Configuration", "Build -Deployments, OS Data Audit", "", "Engagement Fee"),
  sf("a1JQh00000I8Nl3MAF", "TIME-178413", "2026-07-09", CRISIS_PROJECT, 2, true, "Meeting", "Meetings -OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, OS Data Fix Debrief", "", "Engagement Fee"),
  sf("a1JQh00000I8NI3MAN", "TIME-178410", "2026-07-08", CRISIS_PROJECT, 5, true, "Coding and Configuration", "Build -Opp Line Migration Prep, Deployments, OS Data fix", "", "Engagement Fee"),
  sf("a1JQh00000I8NI2MAN", "TIME-178409", "2026-07-08", CRISIS_PROJECT, 5.5, true, "Meeting", "Meetings -OnSolve | Kicksaw - INTERNAL - Daily Stand-Up, OnSolve Tech Team | Kicksaw - Metrics Review, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, OS Data Fix Review, OS Data Fix Party", "", "Engagement Fee"),
  sf("a1JQh00000I8NI4MAN", "TIME-178411", "2026-07-08", INTERNAL_PROJECT, 0.5, false, "People and Team Activities", "Kendra / DJ (Bi-weekly, 1:1, until 8/10)", "Internal", "Internal"),
  sf("a1JQh00000I8NTKMA3", "TIME-178407", "2026-07-07", CRISIS_PROJECT, 6.25, true, "Coding and Configuration", "Build -Tickets, Migration Price Validation, Data fix", "", "Engagement Fee"),
  sf("a1JQh00000I8NTJMA3", "TIME-178406", "2026-07-07", CRISIS_PROJECT, 2, true, "Meeting", "Meetings -OnSolve | Kicksaw - INTERNAL - Daily Stand-Up, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, Closing Process Flow, CPQ Migration Challenges/Changes", "", "Engagement Fee"),
  sf("a1JQh00000I8NJeMAN", "TIME-178405", "2026-07-06", CRISIS_PROJECT, 5.5, true, "Coding and Configuration", "Build -Deployments", "", "Engagement Fee"),
  sf("a1JQh00000I8NJdMAN", "TIME-178404", "2026-07-06", CRISIS_PROJECT, 3.5, true, "Meeting", "Meetings - Ginny Chat, INTERNAL OnSolve | Crisis24 - Weekly Team Planning, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, OnSolve | Kicsaw Metrics Follow-Up", "", "Engagement Fee"),
  sf("a1JQh00000Hzhj0MAB", "TIME-177063", "2026-07-02", CRISIS_PROJECT, 4, true, "Coding and Configuration", "UAT", "", "Engagement Fee"),
  sf("a1JQh00000HzhizMAB", "TIME-177062", "2026-07-02", CRISIS_PROJECT, 4, true, "Meeting", "Meetings - OnSolve | Kicksaw - INTERNAL - Daily Stand-Up, OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage, OnSolve | Kicksaw - Full2 Data Migration (Resolved Issues & Logic), Metrics Alternate Approach", "", "Engagement Fee"),
  sf("a1JQh00000HzhnpMAB", "TIME-177064", "2026-07-01", CRISIS_PROJECT, 2, true, "Coding and Configuration", "Deployments to PC", "", "Engagement Fee"),
];

const calendarEventSeed: CalendarEvent[] = [
  calendarEvent("2026-07-20-home", "Home", "2026-07-20T00:00:00-04:00", "2026-07-21T00:00:00-04:00", CRISIS_PROJECT, "Coding and Configuration", true, null, "transparent"),
  calendarEvent("2026-07-20-planning", "INTERNAL OnSolve | Crisis24 - Weekly Team Planning", "2026-07-20T09:00:00-04:00", "2026-07-20T10:00:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-20-migration-checkin", "OnSolve | Crisis24 - Data Migration Daily Check-In", "2026-07-20T10:00:00-04:00", "2026-07-20T10:30:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-20-uat", "OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage", "2026-07-20T10:30:00-04:00", "2026-07-20T11:00:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-20-demo", "Kayleigh / Ben - App demo", "2026-07-20T11:00:00-04:00", "2026-07-20T11:30:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-20-feature-pc-a", "Feature & PC Sync", "2026-07-20T11:30:00-04:00", "2026-07-20T12:30:00-04:00", CRISIS_PROJECT, "Coding and Configuration"),
  calendarEvent("2026-07-20-ben-kendra", "Ben/Kendra - C24 Migration", "2026-07-20T12:30:00-04:00", "2026-07-20T13:00:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-20-feature-pc-b", "Feature & PC Sync", "2026-07-20T13:00:00-04:00", "2026-07-20T16:30:00-04:00", CRISIS_PROJECT, "Coding and Configuration"),
  calendarEvent("2026-07-21-home", "Home", "2026-07-21T00:00:00-04:00", "2026-07-22T00:00:00-04:00", CRISIS_PROJECT, "Coding and Configuration", true, null, "transparent"),
  calendarEvent("2026-07-21-gearset-ronak", "Gearset with Ronak", "2026-07-21T09:00:00-04:00", "2026-07-21T09:30:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-21-standup", "OnSolve | Kicksaw - INTERNAL - Daily Stand-Up", "2026-07-21T09:30:00-04:00", "2026-07-21T10:00:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-21-review", "Migration Review", "2026-07-21T10:00:00-04:00", "2026-07-21T10:30:00-04:00", CRISIS_PROJECT, "Coding and Configuration"),
  calendarEvent("2026-07-21-uat", "OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage", "2026-07-21T10:30:00-04:00", "2026-07-21T11:00:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-21-troubleshooting", "Migration troubleshooting, Smoke Testing PC, Gearset", "2026-07-21T11:00:00-04:00", "2026-07-21T16:30:00-04:00", CRISIS_PROJECT, "Coding and Configuration"),
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
  recordName: string,
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
    recordName,
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

function calendarEvent(
  id: string,
  title: string,
  start: string,
  end: string,
  selectedProject: Project,
  activityType: CalendarEvent["activityType"],
  billable = true,
  responseStatus: CalendarEvent["responseStatus"] = "accepted",
  transparency: CalendarEvent["transparency"] = "opaque",
): CalendarEvent {
  return {
    id,
    title,
    start,
    end,
    project: selectedProject,
    activityType,
    billable,
    responseStatus,
    transparency,
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
  const effectiveBillable = billableForProject(selectedProject, billable);

  return {
    id: `${date}-${selectedProject.id}-${activityType}-${notes}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    date,
    projectValue: selectedProject.idPricingStructure,
    projectLabel: selectedProject.label,
    hours,
    billable: effectiveBillable,
    activityType,
    notes,
    source: "Calendar",
  };
}

function dateFromEvent(event: CalendarEvent) {
  return event.start.slice(0, 10);
}

function eventHours(event: CalendarEvent) {
  return (new Date(event.end).getTime() - new Date(event.start).getTime()) / 3_600_000;
}

function shouldIgnoreCalendarEvent(event: CalendarEvent) {
  const title = event.title.toLowerCase();
  return (
    event.responseStatus === "declined" ||
    event.transparency === "transparent" ||
    title.includes("focus time") ||
    title.includes("ooo") ||
    title.includes("out of office")
  );
}

function buildCalendarSuggestions(startDate: string, endDate: string) {
  const grouped = new Map<string, { entry: TimeEntry; titles: Set<string> }>();

  for (const event of calendarEventSeed) {
    const date = dateFromEvent(event);
    if (date < startDate || date > endDate || shouldIgnoreCalendarEvent(event)) continue;

    const groupKey = [
      date,
      event.project.idPricingStructure,
      event.activityType,
      billableForProject(event.project, event.billable) ? "billable" : "nonbillable",
    ].join("|");
    const existing = grouped.get(groupKey);

    if (existing) {
      existing.entry.hours += eventHours(event);
      existing.titles.add(event.title);
      existing.entry.notes = Array.from(existing.titles).join(", ");
    } else {
      grouped.set(groupKey, {
        entry: suggested(date, event.project, eventHours(event), event.billable, event.activityType, event.title),
        titles: new Set([event.title]),
      });
    }
  }

  return Array.from(grouped.values()).map(({ entry }) => ({
    ...entry,
    hours: Number(entry.hours.toFixed(2)),
  }));
}

function blankEntry(): TimeEntry {
  return {
    id: "manual-draft",
    date: defaultSuggestionEnd,
    projectValue: CRISIS_PROJECT.idPricingStructure,
    projectLabel: CRISIS_PROJECT.label,
    hours: 0,
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

function locksBillable(projectLabel: string) {
  return projectLabel.includes("Kicksaw");
}

function billableForProject(project: Pick<Project, "label">, requestedBillable: boolean) {
  return locksBillable(project.label) ? false : requestedBillable;
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
  const billable = locksBillable(entry.projectLabel) ? false : entry.billable;
  const nonBillableReason = billable || locksBillable(entry.projectLabel) ? undefined : "Not Applicable";
  const notes = entry.notes.trim();

  return {
    attributes: { type: "TASKRAY__trTaskTime__c" },
    RecordTypeId: RECORD_TYPE_IDS[recordTypeDeveloperName],
    TASKRAY__Owner__c: ownerId,
    TASKRAY__Date__c: entry.date,
    TASKRAY__Project__c: projectIdFromValue(entry.projectValue),
    TASKRAY__Hours__c: Number(entry.hours.toFixed(2)),
    TASKRAY__Billable__c: billable,
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

function recordUrl(recordId: string) {
  return `${salesforceBaseUrl}/lightning/r/TASKRAY__trTaskTime__c/${recordId}/view`;
}

function compareValues(left: string | number | boolean, right: string | number | boolean) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  if (typeof left === "boolean" && typeof right === "boolean") return Number(left) - Number(right);
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
}

function sortedSuggestions(entries: TimeEntry[], sortConfig: SortConfig<SuggestedSortKey>) {
  return [...entries].sort((a, b) => {
    const primary = compareValues(a[sortConfig.key], b[sortConfig.key]);
    const fallback = sortSuggested(a, b);
    return (primary || fallback) * (sortConfig.direction === "asc" ? 1 : -1);
  });
}

function sortedSalesforceRows(entries: SalesforceTimeEntry[], sortConfig: SortConfig<SalesforceSortKey>) {
  return [...entries].sort((a, b) => {
    const primary = compareValues(a[sortConfig.key], b[sortConfig.key]);
    const fallback =
      b.date.localeCompare(a.date) ||
      a.projectLabel.localeCompare(b.projectLabel) ||
      a.activityType.localeCompare(b.activityType);
    return (primary || fallback) * (sortConfig.direction === "asc" ? 1 : -1);
  });
}

function nextSort<Key extends string>(current: SortConfig<Key>, key: Key): SortConfig<Key> {
  return {
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  };
}

function SortHeader<Key extends string>({
  label,
  sortKey,
  sortConfig,
  onSort,
}: {
  label: string;
  sortKey: Key;
  sortConfig: SortConfig<Key>;
  onSort: (key: Key) => void;
}) {
  const active = sortConfig.key === sortKey;
  const indicator = active ? (sortConfig.direction === "asc" ? "Asc" : "Desc") : "";

  return (
    <th>
      <button
        type="button"
        className={active ? "sort-button active" : "sort-button"}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <span aria-hidden="true">{indicator}</span>
      </button>
    </th>
  );
}

function ResizableSortHeader<Key extends SalesforceSortKey>({
  label,
  sortKey,
  sortConfig,
  onSort,
  onResizeStart,
}: {
  label: string;
  sortKey: Key;
  sortConfig: SortConfig<SalesforceSortKey>;
  onSort: (key: Key) => void;
  onResizeStart: (key: SalesforceColumnKey, clientX: number) => void;
}) {
  const active = sortConfig.key === sortKey;
  const indicator = active ? (sortConfig.direction === "asc" ? "Asc" : "Desc") : "";

  return (
    <th>
      <button
        type="button"
        className={active ? "sort-button active" : "sort-button"}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <span aria-hidden="true">{indicator}</span>
      </button>
      <span
        aria-hidden="true"
        className="column-resizer"
        onMouseDown={(event) => {
          event.preventDefault();
          onResizeStart(sortKey as SalesforceColumnKey, event.clientX);
        }}
      />
    </th>
  );
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
  const [suggestions, setSuggestions] = useState(() =>
    buildCalendarSuggestions(defaultSuggestionStart, defaultSuggestionEnd),
  );
  const [manualDraft, setManualDraft] = useState(blankEntry());
  const [suggestionSort, setSuggestionSort] = useState<SortConfig<SuggestedSortKey>>({
    key: "date",
    direction: "asc",
  });
  const [salesforceSort, setSalesforceSort] = useState<SortConfig<SalesforceSortKey>>({
    key: "date",
    direction: "desc",
  });
  const [salesforceColumnWidths, setSalesforceColumnWidths] = useState(initialSalesforceColumnWidths);

  const filteredSuggestions = useMemo(
    () =>
      sortedSuggestions(
        suggestions.filter((entry) => inRange(entry, suggestionStart, suggestionEnd)),
        suggestionSort,
      ),
    [suggestions, suggestionEnd, suggestionSort, suggestionStart],
  );

  const filteredSalesforceRows = useMemo(
    () =>
      sortedSalesforceRows(
        salesforceRows.filter((entry) => inRange(entry, salesforceStart, salesforceEnd)),
        salesforceSort,
      ),
    [salesforceEnd, salesforceSort, salesforceStart],
  );

  const totals = useMemo(() => {
    const suggestedHours = filteredSuggestions.reduce((sum, entry) => sum + entry.hours, 0);
    const salesforceHours = filteredSalesforceRows.reduce((sum, entry) => sum + entry.hours, 0);
    const rowsToReview = filteredSuggestions.length;
    const lastSalesforceDate = salesforceRows.reduce(
      (latest, entry) => (entry.date > latest ? entry.date : latest),
      "",
    );

    return { suggestedHours, salesforceHours, rowsToReview, lastSalesforceDate };
  }, [filteredSalesforceRows, filteredSuggestions]);

  function updateSuggestion(id: string, updates: Partial<TimeEntry>) {
    setSuggestions((current) =>
      current.map((entry) => {
        if (entry.id !== id) return entry;
        const updated = { ...entry, ...updates };
        return locksBillable(updated.projectLabel) ? { ...updated, billable: false } : updated;
      }),
    );
  }

  function removeSuggestion(id: string) {
    setSuggestions((current) => current.filter((entry) => entry.id !== id));
  }

  function addManualEntry() {
    setSuggestions((current) =>
      [
        ...current,
        {
          ...manualDraft,
          id: `manual-${crypto.randomUUID()}`,
          billable: locksBillable(manualDraft.projectLabel) ? false : manualDraft.billable,
          source: "Manual",
        },
      ].sort(sortSuggested),
    );
    setManualDraft(blankEntry());
  }

  function refreshCalendarSuggestions() {
    const manualEntries = suggestions.filter((entry) => entry.source === "Manual");
    setSuggestions([...manualEntries, ...buildCalendarSuggestions(suggestionStart, suggestionEnd)]);
  }

  function startSalesforceColumnResize(key: SalesforceColumnKey, clientX: number) {
    const startingWidth = salesforceColumnWidths[key];

    function resize(event: MouseEvent) {
      const nextWidth = Math.max(72, startingWidth + event.clientX - clientX);
      setSalesforceColumnWidths((current) => ({ ...current, [key]: nextWidth }));
    }

    function stopResize() {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResize);
    }

    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResize);
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
        <div className={totals.rowsToReview ? "needs-review" : ""}>
          <span>Rows To Review</span>
          <strong>{totals.rowsToReview}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
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
          <button type="button" onClick={refreshCalendarSuggestions}>
            Refresh Calendar
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortHeader label="Date" sortKey="date" sortConfig={suggestionSort} onSort={(key) => setSuggestionSort((current) => nextSort(current, key))} />
                <SortHeader label="Project" sortKey="projectLabel" sortConfig={suggestionSort} onSort={(key) => setSuggestionSort((current) => nextSort(current, key))} />
                <SortHeader label="Hours" sortKey="hours" sortConfig={suggestionSort} onSort={(key) => setSuggestionSort((current) => nextSort(current, key))} />
                <SortHeader label="Billable" sortKey="billable" sortConfig={suggestionSort} onSort={(key) => setSuggestionSort((current) => nextSort(current, key))} />
                <SortHeader label="Activity Type" sortKey="activityType" sortConfig={suggestionSort} onSort={(key) => setSuggestionSort((current) => nextSort(current, key))} />
                <SortHeader label="Notes" sortKey="notes" sortConfig={suggestionSort} onSort={(key) => setSuggestionSort((current) => nextSort(current, key))} />
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuggestions.map((entry) => {
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
                            billable: billableForProject(selected, entry.billable),
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
                        disabled={locksBillable(entry.projectLabel)}
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
                    <td>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeSuggestion(entry.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
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
                billable: billableForProject(selectedProject, manualDraft.billable),
              })
            }
          />
          <label>
            Hours
            <input
              type="number"
              min="0"
              step="0.25"
              value={manualDraft.hours || ""}
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
              disabled={locksBillable(manualDraft.projectLabel)}
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
        <div className="table-wrap">
          <table className="salesforce-table">
            <colgroup>
              <col style={{ width: salesforceColumnWidths.date }} />
              <col style={{ width: salesforceColumnWidths.recordName }} />
              <col style={{ width: salesforceColumnWidths.projectLabel }} />
              <col style={{ width: salesforceColumnWidths.hours }} />
              <col style={{ width: salesforceColumnWidths.billable }} />
              <col style={{ width: salesforceColumnWidths.activityType }} />
              <col style={{ width: salesforceColumnWidths.timeType }} />
              <col style={{ width: salesforceColumnWidths.notes }} />
            </colgroup>
            <thead>
              <tr>
                <ResizableSortHeader label="Date" sortKey="date" sortConfig={salesforceSort} onResizeStart={startSalesforceColumnResize} onSort={(key) => setSalesforceSort((current) => nextSort(current, key))} />
                <ResizableSortHeader label="Record" sortKey="recordName" sortConfig={salesforceSort} onResizeStart={startSalesforceColumnResize} onSort={(key) => setSalesforceSort((current) => nextSort(current, key))} />
                <ResizableSortHeader label="Project" sortKey="projectLabel" sortConfig={salesforceSort} onResizeStart={startSalesforceColumnResize} onSort={(key) => setSalesforceSort((current) => nextSort(current, key))} />
                <ResizableSortHeader label="Hours" sortKey="hours" sortConfig={salesforceSort} onResizeStart={startSalesforceColumnResize} onSort={(key) => setSalesforceSort((current) => nextSort(current, key))} />
                <ResizableSortHeader label="Billable" sortKey="billable" sortConfig={salesforceSort} onResizeStart={startSalesforceColumnResize} onSort={(key) => setSalesforceSort((current) => nextSort(current, key))} />
                <ResizableSortHeader label="Activity Type" sortKey="activityType" sortConfig={salesforceSort} onResizeStart={startSalesforceColumnResize} onSort={(key) => setSalesforceSort((current) => nextSort(current, key))} />
                <ResizableSortHeader label="Time Type" sortKey="timeType" sortConfig={salesforceSort} onResizeStart={startSalesforceColumnResize} onSort={(key) => setSalesforceSort((current) => nextSort(current, key))} />
                <ResizableSortHeader label="Notes" sortKey="notes" sortConfig={salesforceSort} onResizeStart={startSalesforceColumnResize} onSort={(key) => setSalesforceSort((current) => nextSort(current, key))} />
              </tr>
            </thead>
            <tbody>
              {filteredSalesforceRows.map((entry) => (
                <tr key={entry.recordId}>
                  <td>{entry.date}</td>
                  <td className="record-id">
                    <a href={recordUrl(entry.recordId)} target="_blank" rel="noreferrer">
                      {entry.recordName}
                    </a>
                  </td>
                  <td>{entry.projectLabel}</td>
                  <td className="numeric">{formatHours(entry.hours)}</td>
                  <td className="checkbox-cell">
                    <input
                      aria-label={`Billable ${entry.recordId}`}
                      type="checkbox"
                      checked={entry.billable}
                      readOnly
                    />
                  </td>
                  <td>{entry.activityType}</td>
                  <td>{entry.timeType || "-"}</td>
                  <td>{entry.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
