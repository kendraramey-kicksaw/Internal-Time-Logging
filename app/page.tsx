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
  taskId?: string;
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
const defaultSuggestionEnd = "2026-07-23";
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

const PROJECT_TASK_IDS: Record<string, string> = {
  a0u4T000001kCBqQAM: "a0tQh00000QFxNNIA1",
  a0uQh000000VuVlIAK: "a0tQh00000R6yoMIAR",
  a0uQh000001psDtIAI: "a0tQh00000Ol611IAB",
  a0uQh000001psIjIAI: "a0tQh00000KWvG0IAL",
  a0uQh000001psKLIAY: "a0tQh00000LfuWnIAJ",
  a0uQh000001V8f3IAC: "a0tQh00000GQLlzIAH",
  a0uQh000001YnTxIAK: "a0tQh00000dvFn8IAE",
  a0uQh000002132jIAA: "a0tQh00000MWtJHIA1",
  a0uQh000002J9T3IAK: "a0tQh00000P7QKLIA3",
  a0uQh000002Jo9dIAC: "a0tQh00000PAD0rIAH",
  a0uQh000002tmNpIAI: "a0tQh00000dvNccIAE",
  a0uQh000002WajxIAC: "a0tQh00000PwqW5IAJ",
  a0uQh000003bx4DIAQ: "a0tQh00000TB1szIAD",
  a0uQh000003EX2PIAW: "a0tQh00000S5H0CIAV",
  a0uQh000003K0YPIA0: "a0tQh00000SLB6qIAH",
  a0uQh000004e8NxIAI: "a0tQh00000pNDgnIAG",
  a0uQh000004F2btIAC: "a0tQh00000Usk6FIAR",
  a0uQh000004jjUvIAI: "a0tQh00000X6HHpIAN",
  a0uQh000004SaXhIAK: "a0tQh00000pN8R9IAK",
  a0uQh000004SAYPIA4: "a0tQh00000VmZKzIAN",
  a0uQh000004W6MXIA0: "a0tQh00000W4Tx5IAF",
  a0uQh000005C9xVIAS: "a0tQh00000ZC12bIAD",
  a0uQh000005CsHuIAK: "a0tQh00000ZFeYyIAL",
  a0uQh000005CsszIAC: "a0tQh00000ZFvQ1IAL",
  a0uQh000005FwVRIA0: "a0tQh00000ZUYcnIAH",
  a0uQh000005gx0nIAA: "a0tQh00000bOc0bIAC",
  a0uQh000005qCQPIA2: "a0tQh00000bwXj9IAE",
  a0uQh000005vgm1IAA: "a0tQh00000cHizdIAC",
  a0uQh000005y8UTIAY: "a0tQh00000fiaxpIAA",
  a0uQh0000062zDdIAI: "a0tQh00000cs6LvIAI",
  a0uQh000006e9p7IAA: "a0tQh00000fbyqRIAQ",
  a0uQh000006hdqfIAA: "a0tQh00000fobZTIAY",
  a0uQh000006N9tZIAS: "a0tQh00000eVBHwIAO",
  a0uQh000006UlndIAC: "a0tQh00000f3fNGIAY",
  a0uQh000006WDrVIAW: "a0tQh00000fAMVvIAO",
  a0uQh000006WDwLIAW: "a0tQh00000fADamIAG",
  a0uQh000006zRnqIAE: "a0tQh00000gin9tIAA",
  a0uQh0000078e97IAA: "a0tQh00000hLRhKIAW",
  a0uQh000007aLujIAE: "a0tQh00000pNVP9IAO",
  a0uQh000007cMjaIAE: "a0tQh00000ipd3xIAA",
  a0uQh000007cMjeIAE: "a0tQh00000ipd31IAA",
  a0uQh000007cMjfIAE: "a0tQh00000ipd3XIAQ",
  a0uQh000007cMjgIAE: "a0tQh00000ipd3JIAQ",
  a0uQh000007cMjhIAE: "a0tQh00000ipd3mIAA",
  a0uQh000007cMjnIAE: "a0tQh00000ipd3jIAA",
  a0uQh000007cMjoIAE: "a0tQh00000ipd2zIAA",
  a0uQh000007cMjpIAE: "a0tQh00000ipd2vIAA",
  a0uQh000007cMjsIAE: "a0tQh00000ipd3dIAA",
  a0uQh000007cMjUIAU: "a0tQh00000ipd3ZIAQ",
  a0uQh000007cMjvIAE: "a0tQh00000ipd2rIAA",
  a0uQh000007cMjWIAU: "a0tQh00000ipd3WIAQ",
  a0uQh000007cMjxIAE: "a0tQh00000ipd3cIAA",
  a0uQh000007cMjXIAU: "a0tQh00000ipd3OIAQ",
  a0uQh000007cMjYIAU: "a0tQh00000ipd3MIAQ",
  a0uQh000007cMjzIAE: "a0tQh00000ipd3sIAA",
  a0uQh000007cMjZIAU: "a0tQh00000ipd2oIAA",
  a0uQh000007cMk0IAE: "a0tQh00000ipd2uIAA",
  a0uQh000007cMk1IAE: "a0tQh00000ipd39IAA",
  a0uQh000007cMk4IAE: "a0tQh00000ipd3fIAA",
  a0uQh000007cMk5IAE: "a0tQh00000ipd3gIAA",
  a0uQh000007cMk6IAE: "a0tQh00000ipd3pIAA",
  a0uQh000007cMk7IAE: "a0tQh00000ipd2nIAA",
  a0uQh000007cMkaIAE: "a0tQh00000ipd3tIAA",
  a0uQh000007cMkAIAU: "a0tQh00000ipd3CIAQ",
  a0uQh000007cMkcIAE: "a0tQh00000iqTnnIAE",
  a0uQh000007cMkDIAU: "a0tQh00000ipd3RIAQ",
  a0uQh000007cMkFIAU: "a0tQh00000ipd33IAA",
  a0uQh000007cMkKIAU: "a0tQh00000ipd3QIAQ",
  a0uQh000007cMkMIAU: "a0tQh00000ipd35IAA",
  a0uQh000007cMkOIAU: "a0tQh00000ipd3vIAA",
  a0uQh000007cMkQIAU: "a0tQh00000ipd3lIAA",
  a0uQh000007cMkRIAU: "a0tQh00000ipd3bIAA",
  a0uQh000007cMkSIAU: "a0tQh00000ipd3UIAQ",
  a0uQh000007fgDlIAI: "a0tQh00000iyQZOIA2",
  a0uQh000007fhD3IAI: "a0tQh00000iyVCTIA2",
  a0uQh000007noSfIAI: "a0tQh00000jKfpwIAC",
  a0uQh000007noSgIAI: "a0tQh00000jKfpxIAC",
  a0uQh000007nx69IAA: "a0tQh00000jKvDDIA0",
  a0uQh000007nyzvIAA: "a0tQh00000jKz79IAC",
  a0uQh000007nyzxIAA: "a0tQh00000jKz7BIAS",
  a0uQh000007nyzyIAA: "a0tQh00000jKz7CIAS",
  a0uQh000007nyzzIAA: "a0tQh00000jKz7DIAS",
  a0uQh000007nz05IAA: "a0tQh00000jKz7JIAS",
  a0uQh000007nz06IAA: "a0tQh00000jKz7KIAS",
  a0uQh000007nz0BIAQ: "a0tQh00000jKz7PIAS",
  a0uQh000007nz0CIAQ: "a0tQh00000jKz7QIAS",
  a0uQh000007nz0DIAQ: "a0tQh00000jKz7RIAS",
  a0uQh000007nz0EIAQ: "a0tQh00000jKz7SIAS",
  a0uQh000007nz0FIAQ: "a0tQh00000jKz7TIAS",
  a0uQh000007nz0GIAQ: "a0tQh00000jKz7UIAS",
  a0uQh000007nz0HIAQ: "a0tQh00000jKz7VIAS",
  a0uQh000007nz0IIAQ: "a0tQh00000jKz7WIAS",
  a0uQh000007nz0JIAQ: "a0tQh00000jKz7XIAS",
  a0uQh000007nz0KIAQ: "a0tQh00000jKz7YIAS",
  a0uQh000007nz0MIAQ: "a0tQh00000jKz7aIAC",
  a0uQh000007nz0NIAQ: "a0tQh00000jKz7bIAC",
  a0uQh000007nz0OIAQ: "a0tQh00000jKz7cIAC",
  a0uQh000007nz0QIAQ: "a0tQh00000jKz7eIAC",
  a0uQh000007nz0RIAQ: "a0tQh00000jKz7fIAC",
  a0uQh000007oL3eIAE: "a0tQh00000jM3S5IAK",
  a0uQh000007oQphIAE: "a0tQh00000jMFN2IAO",
  a0uQh000007oTijIAE: "a0tQh00000jMEdiIAG",
  a0uQh000007rfVdIAI: "a0tQh00000jVhgLIAS",
  a0uQh000007RRUjIAO: "a0tQh00000iFqxrIAC",
  a0uQh000007scDxIAI: "a0tQh00000jYQ6NIAW",
  a0uQh000007sdErIAI: "a0tQh00000jYR8pIAG",
  a0uQh000007wiRFIAY: "a0tQh00000jjBevIAE",
  a0uQh000007wkmPIAQ: "a0tQh00000jj8SfIAI",
  a0uQh000007ZOUuIAO: "a0tQh00000ihDdNIAU",
  a0uQh000007ZQYHIA4: "a0tQh00000ihCRBIA2",
  a0uQh000007ZTcbIAG: "a0tQh00000ihLcXIAU",
  a0uQh0000086NQLIA2: "a0tQh00000kCsyVIAS",
  a0uQh0000086SbJIAU: "a0tQh00000kDd97IAC",
  a0uQh0000089ihxIAA: "a0tQh00000kT2tnIAC",
  a0uQh0000089ijZIAQ: "a0tQh00000kT9wnIAC",
  a0uQh0000089MPhIAM: "a0tQh00000kRNJ1IAO",
  a0uQh000008a2TKIAY: "a0tQh00000mJJTFIA4",
  a0uQh000008a4enIAA: "a0tQh00000mJPwnIAG",
  a0uQh000008C9ZBIA0: "a0tQh00000kcbLrIAI",
  a0uQh000008cDCXIA2: "a0tQh00000mRyajIAC",
  a0uQh000008cDFlIAM: "a0tQh00000mRyxJIAS",
  a0uQh000008DNDbIAO: "a0tQh00000khxDiIAI",
  a0uQh000008DQjIIAW: "a0tQh00000khccTIAQ",
  a0uQh000008eiTxIAI: "a0tQh00000mbzQhIAI",
  a0uQh000008FdIzIAK: "a0tQh00000kqI1dIAE",
  a0uQh000008grOHIAY: "a0tQh00000mjnc5IAA",
  a0uQh000008HBLpIAO: "a0tQh00000kwkBHIAY",
  a0uQh000008jGAUIA2: "a0tQh00000mv44tIAA",
  a0uQh000008JyrtIAC: "a0tQh00000l83k9IAA",
  a0uQh000008mo5xIAA: "a0tQh00000n87JRIAY",
  a0uQh000008mofRIAQ: "a0tQh00000n89jTIAQ",
  a0uQh000008MrYvIAK: "a0tQh00000lUtR1IAK",
  a0uQh000008MtCXIA0: "a0tQh00000lVBnLIAW",
  a0uQh000008mx1BIAQ: "a0tQh00000n8f3OIAQ",
  a0uQh000008nAWHIA2: "a0tQh00000nASq1IAG",
  a0uQh000008nsNdIAI: "a0tQh00000nD4WgIAK",
  a0uQh000008nsXJIAY: "a0tQh00000nDK3CIAW",
  a0uQh000008PHNfIAO: "a0tQh00000leKgIIAU",
  a0uQh000008pmXSIAY: "a0tQh00000nLPGzIAO",
  a0uQh000008pqO9IAI: "a0tQh00000nLncbIAC",
  a0uQh000008pu3ZIAQ: "a0tQh00000nM2qAIAS",
  a0uQh000008Q1VJIA0: "a0tQh00000lgukLIAQ",
  a0uQh000008q4R7IAI: "a0tQh00000nMxF3IAK",
  a0uQh000008QxkbIAC: "a0tQh00000lkTTtIAM",
  a0uQh000008r8XVIAY: "a0tQh00000nRzcfIAC",
  a0uQh000008rH1JIAU: "a0tQh00000nSB9GIAW",
  a0uQh000008rLo5IAE: "a0tQh00000nTCo2IAG",
  a0uQh000008rLphIAE: "a0tQh00000nTG0OIAW",
  a0uQh000008rOkLIAU: "a0tQh00000nTcnJIAS",
  a0uQh000008RP8zIAG: "a0tQh00000lmIpDIAU",
  a0uQh000008saLFIAY: "a0tQh00000nYf4jIAC",
  a0uQh000008uFuDIAU: "a0tQh00000ng7DpIAI",
  a0uQh000008uvgXIAQ: "a0tQh00000njClZIAU",
  a0uQh000008vaRxIAI: "a0tQh00000nmGXkIAM",
  a0uQh000008vcbxIAA: "a0tQh00000nmZaLIAU",
  a0uQh000008vcLhIAI: "a0tQh00000nmI1fIAE",
  a0uQh000008vcrxIAA: "a0tQh00000nmO0dIAE",
  a0uQh000008vd1dIAA: "a0tQh00000nmQH1IAM",
  a0uQh000008vfkzIAA: "a0tQh00000nmkypIAA",
  a0uQh000008VM7hIAG: "a0tQh00000m1YwtIAE",
  a0uQh000008VN5NIAW: "a0tQh00000m1fDZIAY",
  a0uQh000008VNTZIA4: "a0tQh00000m1djhIAA",
  a0uQh000008vOgvIAE: "a0tQh00000nl5GDIAY",
  a0uQh000008vPbNIAU: "a0tQh00000nlDgmIAE",
  a0uQh000008vTgbIAE: "a0tQh00000nlYYNIA2",
  a0uQh000008VxqPIAS: "a0tQh00000m4FhbIAE",
  a0uQh000008XgzxIAC: "a0tQh00000mAAqaIAG",
  a0uQh000008XiX7IAK: "a0tQh00000mABBXIA4",
  a0uQh000008YhAnIAK: "a0tQh00000mEBg9IAG",
  a0uQh000008YSjdIAG: "a0tQh00000mD7eLIAS",
  a0uQh000008Z9S1IAK: "a0tQh00000mFlSoIAK",
  a0uQh000008z9TBIAY: "a0tQh00000o39jcIAA",
  a0uQh000008ZL9pIAG: "a0tQh00000mGKtjIAG",
  a0uQh000008ZU3RIAW: "a0tQh00000mHHvJIAW",
  a0uQh000008ZvhxIAC: "a0tQh00000mIjCjIAK",
  a0uQh0000090ZdJIAU: "a0tQh00000oAE1hIAG",
  a0uQh0000091zsIIAQ: "a0tQh00000oG97XIAS",
  a0uQh00000921IzIAI: "a0tQh00000oGISPIA4",
  a0uQh0000093I3FIAU: "a0tQh00000oLUmLIAW",
  a0uQh0000095GRxIAM: "a0tQh00000oTokgIAC",
  a0uQh0000097bIbIAI: "a0tQh00000oeb8zIAA",
  a0uQh0000097PMHIA2: "a0tQh00000odX7PIAU",
  a0uQh0000097SC5IAM: "a0tQh00000odrFnIAI",
  a0uQh0000097VGPIA2: "a0tQh00000oduX6IAI",
  a0uQh0000097ZiDIAU: "a0tQh00000oeT9oIAE",
  a0uQh0000098DJ3IAM: "a0tQh00000ohcwVIAQ",
  a0uQh0000098GGvIAM: "a0tQh00000ohfEQIAY",
  a0uQh0000098IYsIAM: "a0tQh00000oiBO4IAM",
  a0uQh000009AaY5IAK: "a0tQh00000osSiVIAU",
  a0uQh000009AlZzIAK: "a0tQh00000otxKTIAY",
  a0uQh000009AwDdIAK: "a0tQh00000ouvOdIAI",
  a0uQh000009AXjtIAG: "a0tQh00000osHaBIAU",
  a0uQh000009CA3FIAW: "a0tQh00000p0mFNIAY",
  a0uQh000009CiUjIAK: "a0tQh00000p3FLJIA2",
  a0uQh000009CjPBIA0: "a0tQh00000p3JbpIAE",
  a0uQh000009CZODIA4: "a0tQh00000p2RDFIA2",
  a0uQh000009D8sFIAS: "a0tQh00000p559nIAA",
  a0uQh000009DJNpIAO: "a0tQh00000p60BLIAY",
  a0uQh000009DKyEIAW: "a0tQh00000p6FyWIAU",
  a0uQh000009DNfxIAG: "a0tQh00000p6fxZIAQ",
  a0uQh000009DNHlIAO: "a0tQh00000p6KoQIAU",
  a0uQh000009DNw5IAG: "a0tQh00000p6bxDIAQ",
  a0uQh000009DPLBIA4: "a0tQh00000p6c74IAA",
  a0uQh000009DQabIAG: "a0tQh00000p6laGIAQ",
  a0uQh000009EvsTIAS: "a0tQh00000pDgfBIAS",
  a0uQh000009EvXVIA0: "a0tQh00000pDdpTIAS",
  a0uQh000009GOE5IAO: "a0tQh00000pK6wnIAC",
  a0uQh000009GOh8IAG: "a0tQh00000pKAu6IAG",
  a0uQh000009GOIvIAO: "a0tQh00000pKDexIAG",
  a0uQh000009GPRtIAO: "a0tQh00000pKFnFIAW",
  a0uQh000009Gu97IAC: "a0tQh00000pMNLdIAO",
  a0uQh000009GvhtIAC: "a0tQh00000pMFxyIAG",
  a0uQh000009HSM5IAO: "a0tQh00000pP8EjIAK",
  a0uQh000009KF5lIAG: "a0tQh00000pbcs9IAA",
  a0uQh000009KG9tIAG: "a0tQh00000pbhdJIAQ",
  a0uQh000009KHifIAG: "a0tQh00000pbouxIAA",
  a0uQh000009KM7FIAW: "a0tQh00000pcPpfIAE",
  a0uQh000009KMf7IAG: "a0tQh00000pcVWrIAM",
  a0uQh000009KN05IAG: "a0tQh00000pcZ5vIAE",
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
  project("a0uQh000007nz06IAA", "API - CFS / Document Package Solution (COPS)", "T&M"),
  project("a0uQh000007nx69IAA", "Arcoro - Sales Process Revamp (COPS)", "T&M"),
  project("a0uQh0000098DJ3IAM", "Ark Diagnostics: Jumpstart (MOPS)", "T&M"),
  project("a0uQh000008vOgvIAE", "Aspen Hope Center - Salesforce Discovery Initiative", "Capacity"),
  project("a0uQh000009AaY5IAK", "Atrium - Apollo.io Integration", "T&M"),
  project("a0uQh000007nz05IAA", "Badge Enterprises - Managed Services (COPS)", "T&M"),
  project("a0uQh000008pmXSIAY", "Bambee Human Resources: Jumpstart (AOD)", "T&M"),
  project("a0uQh000007cMjWIAU", "Bang Realty - Managed Services (AOD)", "T&M"),
  project("a0uQh000009D8sFIAS", "BEST Contracting Services - Composer Support", "Capacity"),
  project("a0uQh000007cMjXIAU", "Boreal Education - Managed Services (AOD)", "T&M"),
  project("a0uQh000009KN05IAG", "Brandes Investment Partners - Additional hours for Jumpstart (AOD)", "T&M"),
  project("a0uQh000007cMjYIAU", "Brandes Investment Partners - BOH (AOD)", "T&M"),
  project("a0uQh000008mofRIAQ", "Brandes Investment Partners - Managed Services", "T&M"),
  project("a0uQh000007cMjZIAU", "Brandes Investment Partners - Managed Services (AOD) - Bridgehouse", "T&M"),
  project("a0uQh0000091zsIIAQ", "Brandes Investment Partners & Co.: Jumpstart (AOD)", "T&M"),
  project("a0uQh000008vaRxIAI", "Bridgehouse - MS - June 2026", "T&M"),
  project("a0uQh000009AlZzIAK", "Cable Labs: Jumpstart (AOD) - Agentforce for Service", "T&M"),
  project("a0uQh000008pqO9IAI", "Cal Pacific Homes - AOD & MOD - 6mo Support", "T&M"),
  project("a0uQh000008r8XVIAY", "California Pacific Homes - Marketing Cloud Implementation", "Capacity"),
  project("a0uQh000009DPLBIA4", "Caplin Steriles: Jumpstart (AOD)", "T&M"),
  project("a0uQh000006N9tZIAS", "Cascade Orthopedic Supply: Agentforce (Jumpstart/AOD)", "T&M"),
  project("a0uQh000007cMjaIAE", "CertifID - Managed Services (AOD) - BOH", "T&M"),
  project("a0uQh000007rfVdIAI", "Chan Zuckerberg Initiative - CFS - COPS", "Capacity"),
  project("a0uQh000009DKyEIAW", "City of Chicago: AOD", "T&M"),
  project("a0uQh000009AXjtIAG", "City of Chicago: Mulesoft", "Capacity"),
  project("a0uQh0000089ihxIAA", "Clearwater Security - CFS, CPQ (COPS)", "T&M"),
  project("a0uQh0000089ijZIAQ", "Clearwater Security - Managed Services (COPS)", "T&M"),
  project("a0uQh000009KG9tIAG", "CNECT - Agentforce Phase One", "Capacity"),
  project("a0uQh000009KHifIAG", "CNECT: Managed Services - Sep 26 to Nov 26", "T&M"),
  project("a0uQh0000095GRxIAM", "Connect Service Solutions: Jumpstart (MOPS)", "T&M"),
  project("a0uQh000008Q1VJIA0", "Convergence Care- Managed Services (AOD)", "T&M"),
  project("a0uQh000007cMjeIAE", "Coralisle Group Ltd - Managed Services (AOD)", "T&M"),
  project("a0uQh000007cMjfIAE", "Corby Pools - Managed Services (AOD)", "T&M"),
  project("a0uQh000007ZQYHIA4", "Crisis24 - Agentforce POC (SOPS)", "Capacity"),
  project("a0uQh000005gx0nIAA", "Crisis24 - GSOC/PSG Portal Project (EOPS)", "Capacity"),
  project("a0uQh000005vgm1IAA", "Crisis24 - OnSolve Migration - (EOPS)", "Capacity"),
  project("a0uQh000004SaXhIAK", "Crisis24 - OnSolve Migration - (SOPS)", "Capacity"),
  project("a0uQh000006hdqfIAA", "Crisis24 - OnSolve Workato Support", "T&M"),
  project("a0uQh000007cMjgIAE", "CST Savings - Managed Services (AOD) - 360 HRs", "T&M"),
  project("a0uQh000007cMjhIAE", "CST Savings - Managed Services (AOD) - Sales Planner, One Vest, Consent Status", "T&M"),
  project("a0uQh000008rOkLIAU", "Czinger - MCG Quickstart", "Capacity"),
  project("a0uQh000008rH1JIAU", "CZinger - MOD & AOD (Managed Services)", "T&M"),
  project("a0uQh000006e9p7IAA", "Datavant - Org Merge (EOPS)", "Capacity"),
  project("a0uQh000006UlndIAC", "Datavant - Org Merge (SOPS)", "Capacity"),
  project("a0uQh000006WDwLIAW", "Datavant (ENG)", "Capacity"),
  project("a0uQh000006WDrVIAW", "Datavant- AOD-Admins", "Capacity"),
  project("a0uQh000008QxkbIAC", "Dellwood Insurance - Composer API", "T&M"),
  project("a0uQh000007nz0RIAQ", "Diversified Portfolios, Inc. - Managed Services (COPS)", "T&M"),
  project("a0uQh000002tmNpIAI", "Dompe - Managed Services (AOD)", "T&M"),
  project("a0uQh000008pu3ZIAQ", "Driscoll's Children's Hospital - Echo Integration", "T&M"),
  project("a0uQh000007wkmPIAQ", "Dry Box - MOPs AOD Post Go Live", "T&M"),
  project("a0uQh000007fgDlIAI", "DSPC - Managed Services (AOD)", "Capacity"),
  project("a0uQh000009CjPBIA0", "East Point Energy: Jumpstart (AOD)", "T&M"),
  project("a0uQh000008a2TKIAY", "Easypark - 6 Month AOD - 30hr / mo", "Capacity"),
  project("a0uQh000008a4enIAA", "EasyPark.ca - Engineering - T2 Flex Integration", "T&M"),
  project("a0uQh000007wiRFIAY", "EdgePoint Wealth Management Inc. - Managed Services (AOD)", "T&M"),
  project("a0uQh000009KMf7IAG", "Electromed - Agent Manager Sales Agent (SOPS)", "Capacity"),
  project("a0uQh000006zRnqIAE", "Electromed - Agentforce/IDP (SOPS)", "Capacity"),
  project("a0uQh000009DNfxIAG", "Electromed - Distributed Marketing (MOPS)", "Capacity"),
  project("a0uQh000005CsszIAC", "Electromed - Managed Services (AOD)", "T&M"),
  project("a0uQh000005CsHuIAK", "Electromed - Managed Services (ENG)", "T&M"),
  project("a0uQh000007oTijIAE", "Electromed - Non-Home Care HealthCloud (SOPS)", "Capacity"),
  project("a0uQh000007cMjnIAE", "Empire Life - Managed Services (AOD)", "T&M"),
  project("a0uQh000007nyzvIAA", "Envolve Communities - Managed Services (COPS)", "T&M"),
  project("a0uQh0000062zDdIAI", "ESA - Sales Cloud (AOD)", "T&M"),
  project("a0uQh000007nz0DIAQ", "Evercore - Managed Services (COPS)", "T&M"),
  project("a0uQh0000090ZdJIAU", "Flourish - June-July Managed Services (SOPs)", "T&M"),
  project("a0uQh000007cMjpIAE", "Flourish Ventures  - Managed Services (AOD)", "T&M"),
  project("a0uQh000008VxqPIAS", "Foresight Mental Health - AthenaHealth/AdvancedMD Integration to HC", "Capacity"),
  project("a0uQh0000098IYsIAM", "Forever: Jumpstart (AOD)", "T&M"),
  project("a0uQh000009GOE5IAO", "Forge Health: Jumpstart (AOD)", "T&M"),
  project("a0uQh000002132jIAA", "Fortress Risk - Admin On Demand Support (AOD)", "T&M"),
  project("a0uQh000003bx4DIAQ", "Fred Hutchinson Cancer Center - Managed Services (AOD)", "T&M"),
  project("a0uQh000008jGAUIA2", "Fred Hutchinson Cancer Center - SC Implementation (SOPS)", "Capacity"),
  project("a0uQh000007fhD3IAI", "Getty Images - Outreach Support (AOD) - 6mo", "T&M"),
  project("a0uQh000008C9ZBIA0", "Global X - Managed Services", "T&M"),
  project("a0uQh000007nz0CIAQ", "Goodpack IBC (Singapore) Pte Ltd - Managed Services (COPS)", "T&M"),
  project("a0uQh000008nAWHIA2", "Goodwin Recruiting - Conga Composer + Negotiator - COPS", "Capacity"),
  project("a0uQh0000097PMHIA2", "Grace Hill / Realync - SF Org Integration(s) - SOPS", "T&M"),
  project("a0uQh000008z9TBIAY", "Grail - GoMeddo RFP (SOPS)", "Capacity"),
  project("a0uQh000007cMjsIAE", "Graphika Technologies  - Managed Services (AOD)", "T&M"),
  project("a0uQh000008ZvhxIAC", "Healthcare Legal Solutions - Health Cloud Claims Mgmt", "Capacity"),
  project("a0uQh000007sdErIAI", "Hogan - MS", "Capacity"),
  project("a0uQh000009CiUjIAK", "HomeTeam Homecare Services: Restart (AOD)", "T&M"),
  project("a0uQh000007cMjvIAE", "Imaginable Futures - Managed Services (AOD) - MS", "T&M"),
  project("a0uQh000007cMjxIAE", "Impinj - Managed Services (AOD)", "T&M"),
  project("a0uQh000005C9xVIAS", "Inception Fertility - IDP for Email Referrals (EOPS)", "T&M"),
  project("a0uQh000005FwVRIA0", "Inception Fertility - Managed Services Support", "T&M"),
  project("a0uQh000009GOIvIAO", "Industrial Software Solutions - Managed Services - COPS", "T&M"),
  project("a0uQh000008rLo5IAE", "Integrated Maintenance Solutions- Restart (Jumpstart/AOD)", "T&M"),
  project("a0uQh000009KF5lIAG", "Intelsat - CFS Support - COPS - Overage", "T&M"),
  project("a0uQh000007nz0JIAQ", "Intelsat - Managed Services COPS)", "T&M"),
  project("a0uQh000007cMjzIAE", "Interface Technical - Managed Services (AOD)", "T&M"),
  project("a0uQh000007cMk0IAE", "International Women’s Forum - Managed Services (AOD)", "T&M"),
  project("a0uQh000007cMk1IAE", "Iris Telehealth - Managed Services (AOD)", "T&M"),
  project("a0uQh0000078e97IAA", "ISM - Sales Cloud Implementation (SOPs)", "T&M"),
  project("a0uQh000009HSM5IAO", "ISO New England Inc: MS Jul 2026 to Jun 2027", "T&M"),
  project("a0uQh000007cMk4IAE", "iWave - Managed Services (AOD) - BOH", "T&M"),
  project("a0uQh000007cMk5IAE", "iWave - Managed Services (AOD) - MSP", "T&M"),
  project("a0uQh000007cMk6IAE", "J M Smith Corporation - BOH (AOD)", "T&M"),
  project("a0uQh000007cMk7IAE", "J M Smith Corporation - Managed Services (AOD)", "T&M"),
  project("a0uQh000007cMkKIAU", "K-Bro Linen Systems Inc. - Managed Services (AOD)", "T&M"),
  project("a0uQh000008uFuDIAU", "Kaseware - Org Merge with OSINT Combine - Phase 0-1", "Capacity"),
  project("a0uQh000002WajxIAC", "KBRA - Salesforce Support (AOD)", "T&M"),
  project("a0uQh000007aLujIAE", "Kicksaw - Internal Time Tracking", "Internal"),
  project("a0uQh000005y8UTIAY", "Kicksaw - Marketing Support", "Internal"),
  project("a0uQh000009GPRtIAO", "Kiniksa - Composer + Integration POC", "T&M"),
  project("a0uQh000008ZU3RIAW", "Kuali: Slack (Jumpstart/AOD)", "T&M"),
  project("a0uQh000008MtCXIA0", "Kula Group: Slack Launch (Jumpstart/MOPS)", "T&M"),
  project("a0uQh000007cMkAIAU", "Kymeta - Managed Services (AOD)", "T&M"),
  project("a0uQh000007cMjoIAE", "Level Access - Managed Services (AOD)", "T&M"),
  project("a0uQh000007nz0MIAQ", "Lifesci - Generic Support Hours (COPS)", "T&M"),
  project("a0uQh000009DNHlIAO", "Listen Labs - 3mo Managed Services - AOD & MOD", "T&M"),
  project("a0uQh000009AwDdIAK", "Listen Labs - Sales Cloud & Marketing Cloud - Migration from Attio", "Hybrid"),
  project("a0uQh000008vTgbIAE", "Longevity Health Plan - Health Cloud / Project Tracking Tool - SOPS", "Capacity"),
  project("a0uQh000003EX2PIAW", "Lucid Diagnostics - Sales Cloud Support (AOD)", "T&M"),
  project("a0uQh00000921IzIAI", "Magic AI, Inc: Jumpstart (AOD) - Sales Cloud", "T&M"),
  project("a0uQh000007cMkDIAU", "Maglin Site Furniture - Managed Services (AOD)", "T&M"),
  project("a0uQh000004jjUvIAI", "MGT Consulting - Org Migration (MOPS)", "Capacity"),
  project("a0uQh000004e8NxIAI", "MGT Consulting - Org Migration (SOPS)", "Capacity"),
  project("a0uQh000004SAYPIA4", "MGT Consulting - PM and Managed Services (AOD)", "T&M"),
  project("a0uQh000009DNw5IAG", "Midpoint Tech Group: Service Cloud Jumpstart (AOD)", "T&M"),
  project("a0uQh000007scDxIAI", "mJob - Conga Composer / Sign / Grid - Managed Services (COPS)", "T&M"),
  project("a0uQh000007nz0OIAQ", "Monster Energy - Managed Services (COPS)", "T&M"),
  project("a0uQh000007cMkFIAU", "Montis Financial - Managed Services (AOD)", "T&M"),
  project("a0uQh000008rLphIAE", "Moonwater Beverages: Sales Cloud Jumpstart (AOD)", "T&M"),
  project("a0uQh000008vfkzIAA", "Navvis: Jumpstart (AOD)", "T&M"),
  project("a0uQh0000086SbJIAU", "Nike - SCI Expansion - COPS", "T&M"),
  project("a0uQh0000093I3FIAU", "Nocturne Luxury Villas [SOPS]", "Capacity"),
  project("a0uQh000008vd1dIAA", "NURISE Software Design LLC: Agentforce Jumpstart (AOD)", "T&M"),
  project("a0uQh000008vcrxIAA", "NURISE Software Design LLC: Jumpstart (AOD)", "T&M"),
  project("a0uQh000008vcbxIAA", "NURISE Software Design LLC: Service Cloud Jumpstart (AOD)", "T&M"),
  project("a0uQh000004W6MXIA0", "Nuvation Bio - Managed Services (MOPS)", "T&M"),
  project("a0uQh000002Jo9dIAC", "NYC CFB - Admin Support (AOD)", "T&M"),
  project("a0uQh000002J9T3IAK", "NYC CFB - Managed Services (MOPS)", "T&M"),
  project("a0uQh000001psIjIAI", "NYC CFB - Public Affairs - Marketing Cloud Support (MOPS)", "T&M"),
  project("a0uQh000001psKLIAY", "NYC CFB - Public Affairs (EOPS)", "T&M"),
  project("a0uQh000001psDtIAI", "NYC CFB - Public Affairs (SOPS)", "T&M"),
  project("a0uQh000007nyzxIAA", "Olink Proteomics AB - Managed Services (COPS)", "T&M"),
  project("a0uQh000007nz0EIAQ", "Origami Risk - Managed Services (COPS)", "T&M"),
  project("a0uQh000009EvXVIA0", "ORR Protection Services - Conga Composer and Conga Grid", "Capacity"),
  project("a0uQh000009EvsTIAS", "ORR Protection Services - Managed Services", "T&M"),
  project("a0uQh000008vcLhIAI", "P3 - Org Shift Remediation (SOPs)", "Capacity"),
  project("a0uQh000008uvgXIAQ", "Palmetto - Conga Composer API - COPS", "Capacity"),
  project("a0uQh000009DJNpIAO", "Parish Logistics: Jumpstart (AOD)", "T&M"),
  project("a0uQh000007noSgIAI", "PatientNow - Dialpad Enhancements (COPS)", "T&M"),
  project("a0uQh000007noSfIAI", "PatientNow - Managed Services (COPS)", "T&M"),
  project("a0uQh000008JyrtIAC", "Peak American Financial Companies Inc: Apr - Dec BOH", "T&M"),
  project("a0uQh000008cDFlIAM", "Planit ROI: Agentforce (Jumpstart/AOD)", "T&M"),
  project("a0uQh000008cDCXIA2", "Planit ROI: Marketing Cloud Growth (Jumpstart/MOPS)", "T&M"),
  project("a0uQh000009CZODIA4", "Planit ROI: Restart (AOD)", "T&M"),
  project("a0uQh000008DQjIIAW", "playSTUDIOS: Restart (Jumpstart/AOD)", "T&M"),
  project("a0uQh000007nz0QIAQ", "PNW Railcars - CFS Quickstart (COPS)", "T&M"),
  project("a0uQh000007cMkMIAU", "Project Equity - Managed Services (AOD)", "T&M"),
  project("a0uQh0000097bIbIAI", "Pyx Health - June 2026", "T&M"),
  project("a0uQh000008nsXJIAY", "Reagan Consulting- Pardot Restart (Jumpstart/MOD)", "T&M"),
  project("a0uQh000007nz0GIAQ", "RealtyCom Partners - Managed Services (COPS)", "T&M"),
  project("a0uQh000007nyzyIAA", "Realync - Managed Services (COPS)", "T&M"),
  project("a0u4T000001kCBqQAM", "Regenexx - Admin on Demand (AOD)", "T&M"),
  project("a0uQh000009KM7FIAW", "Regenexx - Managed Services Jul 2026 - Jun 2027", "T&M"),
  project("a0uQh000007cMkOIAU", "Reliant Management - Managed Services (BOH)", "T&M"),
  project("a0uQh000007cMkQIAU", "RingSquared LLC - Managed Services (AOD)", "T&M"),
  project("a0uQh000004F2btIAC", "RiviaMind- Managed Services", "T&M"),
  project("a0uQh000007cMkRIAU", "Robert's Farm Equipment - Managed Services (AOD)", "T&M"),
  project("a0uQh000007cMkSIAU", "RODAN Energy Solutions - Managed Services (AOD)", "T&M"),
  project("a0uQh000008FdIzIAK", "Roof Squad: Agentforce (Jumpstart/AOD)", "T&M"),
  project("a0uQh000007ZOUuIAO", "Ross Video - Managed Services (AOD)", "Capacity"),
  project("a0uQh000008VM7hIAG", "SaaStr: MCA (Jumpstart/MOPS)", "T&M"),
  project("a0uQh0000098GGvIAM", "Salesforce - Proposal Strategy Team Renewal - SOPS", "T&M"),
  project("a0uQh000008MrYvIAK", "Sault College - Managed Services", "T&M"),
  project("a0uQh000008grOHIAY", "SBMA Benefits - Managed Services", "T&M"),
  project("a0uQh000007RRUjIAO", "Scottish Rite for Children - Managed Services (AOD)", "Capacity"),
  project("a0uQh000007nyzzIAA", "Seamon Whiteside - Managed Services (COPS)", "T&M"),
  project("a0uQh000007nz0HIAQ", "Sensiba - Managed Services (COPS)", "T&M"),
  project("a0uQh000007ZTcbIAG", "SFC Energy - Managed Services (AOD)", "T&M"),
  project("a0uQh000008eiTxIAI", "Shaker Logistics: Marketing Cloud Growth (Jumpstart/MOPS)", "T&M"),
  project("a0uQh000007nz0FIAQ", "Shelter Rock - Managed Services (COPS)", "T&M"),
  project("a0uQh000008mo5xIAA", "Sierra Circuits: Jumpstart (AOD)", "T&M"),
  project("a0uQh0000097SC5IAM", "Sight Sciences - Managed Services - July 2026", "T&M"),
  project("a0uQh000000VuVlIAK", "Sight Sciences - Salesforce Support (AOD)", "T&M"),
  project("a0uQh000009DQabIAG", "Sight Sciences: Mulesoft Implementation EOPS", "Capacity"),
  project("a0uQh000005qCQPIA2", "SimuTech Group: Restart (Jumpstart/AOD)", "T&M"),
  project("a0uQh000001YnTxIAK", "SK Pharmteco - Admin Support (AOD)", "T&M"),
  project("a0uQh0000086NQLIA2", "Solius - Phase 2", "Capacity"),
  project("a0uQh000008vPbNIAU", "Sono Bello - Hubbl Scan & AOD Hours", "Hybrid"),
  project("a0uQh000007nz0BIAQ", "Stonhard - Composer (COPS)", "T&M"),
  project("a0uQh000008PHNfIAO", "Sunrise Senior Living - Conga Composer and Sign API - COPS", "T&M"),
  project("a0uQh000008RP8zIAG", "Sunrise Senior Living - Managed Services - COPS", "T&M"),
  project("a0uQh000008XgzxIAC", "Sunstone Therapies: Restart (Jumpstart/AOD)", "T&M"),
  project("a0uQh000003K0YPIA0", "Telix- Engineering Managed Services (EOPS)", "T&M"),
  project("a0uQh000007oQphIAE", "Telix- Marketing Support (MOPS)", "T&M"),
  project("a0uQh000008DNDbIAO", "Telix- SAP Test Environment (ENG)", "T&M"),
  project("a0uQh000009GOh8IAG", "The Mather Group: SSO integration", "Hybrid"),
  project("a0uQh000008Z9S1IAK", "Third Way Health - Restart (SCV & AWS Connect)", "T&M"),
  project("a0uQh000007nz0KIAQ", "Tinuiti - Managed Services (COPS)", "T&M"),
  project("a0uQh000007nz0IIAQ", "Trepp - Managed Services (COPS)", "T&M"),
  project("a0uQh000008nsNdIAI", "Trustpoint- Agentforce Jumpstart (AOD)", "T&M"),
  project("a0uQh000001V8f3IAC", "Truveris - Ongoing Support (AOD)", "T&M"),
  project("a0uQh000007cMkaIAE", "Valor Technical Cleaning - Managed Services (AOD)", "T&M"),
  project("a0uQh000007oL3eIAE", "Vapi - Managed Services (AOD)", "T&M"),
  project("a0uQh000008HBLpIAO", "Vidal Construction - MS", "T&M"),
  project("a0uQh000008YSjdIAG", "Virtualitics - Migration from Hubspot Marketing - (MOPs)", "Capacity"),
  project("a0uQh000008XiX7IAK", "Virtualitics - MOPs & MOD - 6mo", "Capacity"),
  project("a0uQh000007cMkcIAE", "Vitalhub Corp - Managed Services (AOD)", "T&M"),
  project("a0uQh000007nz0NIAQ", "Washington State Housing Finance Commission - CFS Quick Start (COPS)", "T&M"),
  project("a0uQh0000097ZiDIAU", "Westlake Dermatology - ITSM", "T&M"),
  project("a0uQh0000097VGPIA2", "Westlake Dermatology- Managed Services 6mo", "T&M"),
  project("a0uQh000008ZL9pIAG", "World 50: Slack & Agentforce Catalyst Program + Slack Jumpstart/AOD/MS", "Hybrid"),
  project("a0uQh000008YhAnIAK", "WWCT - Org Health Reboot - SOPs", "Capacity"),
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
  calendarEvent("2026-07-23-home", "Home", "2026-07-23T00:00:00-04:00", "2026-07-24T00:00:00-04:00", CRISIS_PROJECT, "Coding and Configuration", true, null, "transparent"),
  calendarEvent("2026-07-23-standup", "OnSolve | Kicksaw - INTERNAL - Daily Stand-Up", "2026-07-23T09:30:00-04:00", "2026-07-23T10:00:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-23-uat-a", "OnSolve Crisis24 - Kicksaw - Daily UAT Triage", "2026-07-23T10:00:00-04:00", "2026-07-23T10:30:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-23-uat-b", "OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage", "2026-07-23T10:30:00-04:00", "2026-07-23T11:00:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-23-permissions", "Permission: Review and Reset", "2026-07-23T12:00:00-04:00", "2026-07-23T12:30:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-23-all-hands", "All Hands", "2026-07-23T12:30:00-04:00", "2026-07-23T13:30:00-04:00", INTERNAL_PROJECT, "People and Team Activities", false),
  calendarEvent("2026-07-23-kendra-adam", "Kendra / Adam", "2026-07-23T13:30:00-04:00", "2026-07-23T14:00:00-04:00", CRISIS_PROJECT, "Meeting"),
];

function project(id: string, label: string, pricingStructure: PricingStructure): Project {
  return {
    id,
    label,
    pricingStructure,
    taskId: PROJECT_TASK_IDS[id],
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

function taskIdForEntry(entry: Pick<TimeEntry, "projectValue" | "projectLabel">) {
  return projectForEntry(entry)?.taskId ?? PROJECT_TASK_IDS[projectIdFromValue(entry.projectValue)];
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
    TASKRAY__Task__c: taskIdForEntry(entry),
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
  showLabel = true,
}: {
  label: string;
  value: string;
  onChange: (selectedProject: Project) => void;
  showLabel?: boolean;
}) {
  const input = (
    <input
      aria-label={label}
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
  );

  if (!showLabel) return input;

  return (
    <label>
      {label}
      {input}
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
          <table className="suggested-table">
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
                        showLabel={false}
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
            showLabel={false}
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
