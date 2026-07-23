"use client";

import { useEffect, useMemo, useState } from "react";

type PricingStructure = "Capacity" | "T&M" | "Hybrid" | "Internal";
type RecordTypeDeveloperName = "Client_Work" | "Internal_Project" | "Internal_Work";
type SuggestionSource = "Calendar" | "Manual";
type DeliveryTeam = "AOD" | "SOPS" | "COPS" | "MOPS" | "Engineering";

type Project = {
  id: string;
  label: string;
  idPricingStructure: string;
  pricingStructure: PricingStructure;
  taskId?: string;
  deliveryTeam?: string;
  websiteDomain?: string;
};

type TimeEntry = {
  id: string;
  date: string;
  projectValue: string;
  projectLabel: string;
  projectWebsiteDomain?: string;
  hours: number;
  billable: boolean;
  activityType: string;
  notes: string;
  source: SuggestionSource;
  taskId?: string;
};

type SalesforceTimeEntry = Omit<TimeEntry, "source"> & {
  recordId: string;
  recordName: string;
  category: string;
  timeType: string;
};

type SalesforceTimeEntryResponse = {
  records: SalesforceTimeEntry[];
};

type CalendarEventResponse = {
  records: CalendarEvent[];
  localFile?: string;
  lastSyncedAt?: string | null;
  warning?: string;
};

type ProjectResponse = {
  records: Project[];
};

type AppUpdateStatus = {
  local: boolean;
  gitAvailable?: boolean;
  updateAvailable: boolean;
  dirty: boolean;
  current?: string;
  latest?: string;
  message?: string;
};

type ProviderConnectionStatus = {
  configured: boolean;
  connected: boolean;
  fallbackConfigured?: boolean;
  localFile?: string;
  lastSyncedAt?: string | null;
};

type IntegrationStatusResponse = {
  user?: {
    email: string;
    name: string;
  };
  providers: {
    google: ProviderConnectionStatus;
    salesforce: ProviderConnectionStatus;
  };
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
const defaultSuggestionEnd = todayIso();
const ownerId = "0054T000001in8HQAQ";
const salesforceBaseUrl = "https://kicksaw.my.salesforce.com";
const localProxyBaseUrl = "http://127.0.0.1:8789";
const deliveryTeams: DeliveryTeam[] = ["AOD", "SOPS", "COPS", "MOPS", "Engineering"];
const defaultDeliveryTeam: DeliveryTeam = "SOPS";
const initialSalesforceColumnWidths: Record<SalesforceColumnKey, number> = {
  date: 112,
  recordName: 96,
  projectLabel: 190,
  hours: 70,
  billable: 70,
  activityType: 132,
  timeType: 108,
  notes: 420,
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

const clientActivityTypes = [
  "Meeting",
  "Documentation",
  "Coding and Configuration",
  "Communications",
  "Travel",
];

const internalTimeActivityTypes = [
  "Admin and Overhead",
  "Learning and Development",
  "People and Team Activities",
  "Presales",
  "Recruiting",
  "Travel",
];

const internalInitiativeActivityTypes = [
  "Design",
  "Build",
  "Release",
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
  calendarEvent("2026-07-22-home", "Home", "2026-07-22T00:00:00-04:00", "2026-07-23T00:00:00-04:00", CRISIS_PROJECT, "Coding and Configuration", true, null, "transparent"),
  calendarEvent("2026-07-22-standup", "OnSolve | Kicksaw - INTERNAL - Daily Stand-Up", "2026-07-22T09:30:00-04:00", "2026-07-22T10:00:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-22-data-migration", "Data Migration Meeting", "2026-07-22T10:00:00-04:00", "2026-07-22T10:30:00-04:00", CRISIS_PROJECT, "Meeting", true, null),
  calendarEvent("2026-07-22-uat-declined", "OnSolve Crisis24 - Kicksaw - Daily UAT Triage", "2026-07-22T10:00:00-04:00", "2026-07-22T10:30:00-04:00", CRISIS_PROJECT, "Meeting", true, "declined"),
  calendarEvent("2026-07-22-tech-uat", "OnSolve | Crisis24 | Kicksaw - Tech Team Daily UAT Triage", "2026-07-22T10:30:00-04:00", "2026-07-22T11:00:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-22-justin-kendra", "Justin / Kendra", "2026-07-22T11:00:00-04:00", "2026-07-22T11:30:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-22-uat-tickets-a", "UAT Tickets", "2026-07-22T11:30:00-04:00", "2026-07-22T12:00:00-04:00", CRISIS_PROJECT, "Coding and Configuration", true, null),
  calendarEvent("2026-07-22-august-kendra", "August / Kendra", "2026-07-22T12:00:00-04:00", "2026-07-22T12:30:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-22-uat-tickets-b", "UAT Tickets", "2026-07-22T12:30:00-04:00", "2026-07-22T13:30:00-04:00", CRISIS_PROJECT, "Coding and Configuration", true, null),
  calendarEvent("2026-07-22-data-chat", "Data Chat - C24 Migration Issues Doc", "2026-07-22T13:30:00-04:00", "2026-07-22T14:30:00-04:00", CRISIS_PROJECT, "Meeting"),
  calendarEvent("2026-07-22-leadership-declined", "Leadership Check-in", "2026-07-22T14:30:00-04:00", "2026-07-22T15:30:00-04:00", CRISIS_PROJECT, "Meeting", true, "declined"),
  calendarEvent("2026-07-22-uat-tickets-c", "UAT Tickets", "2026-07-22T14:30:00-04:00", "2026-07-22T16:30:00-04:00", CRISIS_PROJECT, "Coding and Configuration", true, null),
  calendarEvent("2026-07-22-kapil", "Call with Kapil/Migration Delta", "2026-07-22T21:00:00-04:00", "2026-07-22T21:30:00-04:00", CRISIS_PROJECT, "Meeting", true, null),
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
    projectWebsiteDomain: selectedProject.websiteDomain,
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
    projectWebsiteDomain: selectedProject.websiteDomain,
    hours,
    billable: effectiveBillable,
    activityType: activityTypeForProject(selectedProject.label, activityType),
    notes,
    source: "Calendar",
    taskId: selectedProject.taskId,
  };
}

function normalizeWebsiteDomain(value?: string) {
  return String(value ?? "").trim().toLowerCase().replace(/^www\./, "");
}

function sameAccountWebsiteDomain(left?: string, right?: string) {
  const leftDomain = normalizeWebsiteDomain(left);
  const rightDomain = normalizeWebsiteDomain(right);
  return Boolean(leftDomain && rightDomain && leftDomain === rightDomain);
}

function projectAccountKey(label?: string) {
  return String(label ?? "")
    .split(/\s+-\s+|:|\[/)[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function sameProjectAccount(leftLabel?: string, rightLabel?: string) {
  const leftAccount = projectAccountKey(leftLabel);
  const rightAccount = projectAccountKey(rightLabel);
  return Boolean(leftAccount && rightAccount && leftAccount === rightAccount);
}

function sameProjectDomainOrAccount(leftProject: Project, rightProject: Project) {
  return (
    sameAccountWebsiteDomain(leftProject.websiteDomain, rightProject.websiteDomain) ||
    sameProjectAccount(leftProject.label, rightProject.label)
  );
}

function shouldDefaultCalendarProject(event: CalendarEvent, defaultProject: Project) {
  if (!defaultProject.idPricingStructure) return false;
  if (event.activityType === "People and Team Activities") return false;
  if (event.project.id === INTERNAL_PROJECT.id || event.project.label.includes("Kicksaw")) return false;
  if (!event.project.idPricingStructure && !event.project.label.trim()) return true;
  return sameProjectDomainOrAccount(event.project, defaultProject);
}

function applyDefaultProjectToCalendarEvents(events: CalendarEvent[], defaultProject: Project) {
  return events.map((event) =>
    shouldDefaultCalendarProject(event, defaultProject)
      ? {
          ...event,
          project: defaultProject,
          billable: billableForProject(defaultProject, event.billable),
        }
      : event,
  );
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

function buildCalendarSuggestions(startDate: string, endDate: string, events: CalendarEvent[] = []) {
  const grouped = new Map<string, { entry: TimeEntry; titles: Set<string> }>();

  for (const event of events) {
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
    projectValue: "",
    projectLabel: "",
    hours: 0,
    billable: true,
    activityType: "Meeting",
    notes: "",
    source: "Manual",
  };
}

function entryIsComplete(entry: Pick<TimeEntry, "activityType" | "date" | "hours" | "notes" | "projectLabel" | "projectValue" | "taskId">) {
  return Boolean(
    entry.date &&
      entry.projectLabel.trim() &&
      entry.projectValue &&
      taskIdForEntry(entry) &&
      entry.hours > 0 &&
      entry.activityType.trim() &&
      entry.notes.trim(),
  );
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

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Toronto",
    year: "numeric",
  }).format(new Date());
}

function addDaysIso(date: string, days: number) {
  const nextDate = new Date(`${date}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function latestSalesforceDate(entries: Pick<SalesforceTimeEntry, "date">[]) {
  return entries.reduce((latest, entry) => (entry.date > latest ? entry.date : latest), "");
}

function weekStartIso(date: string) {
  const currentDate = new Date(`${date}T00:00:00Z`);
  const mondayOffset = (currentDate.getUTCDay() + 6) % 7;
  currentDate.setUTCDate(currentDate.getUTCDate() - mondayOffset);
  return currentDate.toISOString().slice(0, 10);
}

function defaultSuggestionStartFor(entries: Pick<SalesforceTimeEntry, "date">[]) {
  const latestDate = latestSalesforceDate(entries);
  return latestDate ? addDaysIso(latestDate, 1) : monthStart;
}

function formatHours(hours: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(hours);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not synced yet";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function fileAgeHours(value?: string | null) {
  if (!value) return null;
  return (Date.now() - new Date(value).getTime()) / 3_600_000;
}

function projectForLabel(label: string, options = projectOptions) {
  return options.find((candidate) => candidate.label === label);
}

function projectForEntry(entry: Pick<TimeEntry, "projectValue" | "projectLabel">, options = projectOptions) {
  return (
    options.find((candidate) => candidate.idPricingStructure === entry.projectValue) ??
    projectForLabel(entry.projectLabel, options)
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

function taskIdForEntry(entry: Pick<TimeEntry, "projectValue" | "projectLabel" | "taskId">) {
  return entry.taskId ?? projectForEntry(entry)?.taskId ?? PROJECT_TASK_IDS[projectIdFromValue(entry.projectValue)];
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

function activityTypesForProjectLabel(projectLabel: string) {
  if (projectLabel === INTERNAL_PROJECT.label) return internalTimeActivityTypes;
  if (projectLabel.includes("Kicksaw - ")) return internalInitiativeActivityTypes;
  return clientActivityTypes;
}

function activityTypeForProject(projectLabel: string, requestedActivityType: string) {
  const options = activityTypesForProjectLabel(projectLabel);
  return options.includes(requestedActivityType) ? requestedActivityType : options[0];
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

function apiUrl(path: string) {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return `${localProxyBaseUrl}${path}`;
  }

  return path;
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

function hoursByProject(entries: Pick<SalesforceTimeEntry, "hours" | "projectLabel">[]) {
  const grouped = new Map<string, number>();

  for (const entry of entries) {
    grouped.set(entry.projectLabel, (grouped.get(entry.projectLabel) ?? 0) + entry.hours);
  }

  return Array.from(grouped, ([projectLabel, hours]) => ({
    projectLabel,
    hours: Number(hours.toFixed(2)),
  })).sort((a, b) => b.hours - a.hours || a.projectLabel.localeCompare(b.projectLabel));
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
  const indicator = active ? (sortConfig.direction === "asc" ? "↑" : "↓") : "";

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
  const indicator = active ? (sortConfig.direction === "asc" ? "↑" : "↓") : "";

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
  options,
  onChange,
  required = false,
  showLabel = true,
}: {
  label: string;
  value: string;
  options: Project[];
  onChange: (selectedProject: Project) => void;
  required?: boolean;
  showLabel?: boolean;
}) {
  const input = (
    <input
      aria-label={label}
      list="project-options"
      required={required}
      value={value}
      onChange={(event) => {
        const nextLabel = event.target.value;
        const selectedProject = projectForLabel(nextLabel, options);
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

function storedDeliveryTeam(): DeliveryTeam {
  if (typeof window === "undefined") return defaultDeliveryTeam;
  const stored = window.localStorage.getItem("timeLogging.deliveryTeam");
  return deliveryTeams.includes(stored as DeliveryTeam) ? (stored as DeliveryTeam) : defaultDeliveryTeam;
}

function storedDefaultProject(): Project {
  if (typeof window === "undefined") return blankProject();
  try {
    const stored = window.localStorage.getItem("timeLogging.defaultProject");
    if (!stored) return blankProject();
    const parsed = JSON.parse(stored) as Partial<Project>;
    return {
      id: parsed.id ?? "",
      label: parsed.label ?? "",
      idPricingStructure: parsed.idPricingStructure ?? "",
      pricingStructure: parsed.pricingStructure ?? "Capacity",
      taskId: parsed.taskId,
      deliveryTeam: parsed.deliveryTeam,
      websiteDomain: parsed.websiteDomain,
    };
  } catch {
    return blankProject();
  }
}

function mergeProjectOptions(...projectLists: Project[][]) {
  const grouped = new Map<string, Project>();
  for (const projectList of projectLists) {
    for (const project of projectList) {
      const key = project.idPricingStructure || project.label;
      if (key) grouped.set(key, project);
    }
  }
  return Array.from(grouped.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function blankProject(): Project {
  return {
    id: "",
    label: "",
    idPricingStructure: "",
    pricingStructure: "Capacity",
  };
}

function shouldUseDefaultProject(entry: TimeEntry) {
  return (
    entry.source === "Calendar" &&
    entry.activityType !== "People and Team Activities" &&
    !entry.projectLabel.includes("Kicksaw")
  );
}

function applyDefaultProjectToEntry(entry: TimeEntry, defaultProject: Project) {
  const projectIsBlank = !entry.projectValue && !entry.projectLabel.trim();
  const shouldOverrideSameAccount =
    sameAccountWebsiteDomain(entry.projectWebsiteDomain, defaultProject.websiteDomain) ||
    sameProjectAccount(entry.projectLabel, defaultProject.label);
  if (!defaultProject.idPricingStructure || !shouldUseDefaultProject(entry) || (!projectIsBlank && !shouldOverrideSameAccount)) {
    return entry;
  }

  return {
    ...entry,
    projectValue: defaultProject.idPricingStructure,
    projectLabel: defaultProject.label,
    projectWebsiteDomain: defaultProject.websiteDomain,
    billable: billableForProject(defaultProject, entry.billable),
    activityType: activityTypeForProject(defaultProject.label, entry.activityType),
    taskId: defaultProject.taskId,
  };
}

function applyDefaultProjectToSuggestions(entries: TimeEntry[], defaultProject: Project) {
  return entries.map((entry) => applyDefaultProjectToEntry(entry, defaultProject));
}

export default function Home() {
  const [deliveryTeam, setDeliveryTeam] = useState<DeliveryTeam>(storedDeliveryTeam);
  const [availableProjects, setAvailableProjects] = useState(projectOptions);
  const [defaultProject, setDefaultProject] = useState<Project>(storedDefaultProject);
  const [suggestionStart, setSuggestionStart] = useState(() => defaultSuggestionStartFor(salesforceRows));
  const [suggestionEnd, setSuggestionEnd] = useState(defaultSuggestionEnd);
  const [salesforceStart, setSalesforceStart] = useState(monthStart);
  const [salesforceEnd, setSalesforceEnd] = useState(monthEnd);
  const [suggestions, setSuggestions] = useState<TimeEntry[]>([]);
  const [liveSalesforceRows, setLiveSalesforceRows] = useState(salesforceRows);
  const [manualDraft, setManualDraft] = useState(blankEntry());
  const [salesforceSyncStatus, setSalesforceSyncStatus] = useState("Salesforce snapshot loaded");
  const [calendarSyncStatus, setCalendarSyncStatus] = useState("Calendar snapshot loaded");
  const [importStatus, setImportStatus] = useState("");
  const [suggestedStatus, setSuggestedStatus] = useState("");
  const [manualStatus, setManualStatus] = useState("");
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatusResponse | null>(null);
  const [integrationMessage, setIntegrationMessage] = useState("Checking integrations...");
  const [appUpdateStatus, setAppUpdateStatus] = useState<AppUpdateStatus | null>(null);
  const [appUpdateMessage, setAppUpdateMessage] = useState("Checking app updates...");
  const [projectSyncStatus, setProjectSyncStatus] = useState("Project list pending");
  const [isImporting, setIsImporting] = useState(false);
  const [isRefreshingCalendar, setIsRefreshingCalendar] = useState(false);
  const [isRefreshingProjects, setIsRefreshingProjects] = useState(false);
  const [isUpdatingApp, setIsUpdatingApp] = useState(false);
  const [suggestionStartWasEdited, setSuggestionStartWasEdited] = useState(false);
  const [liveSalesforceDefaultApplied, setLiveSalesforceDefaultApplied] = useState(false);
  const [suggestionSort, setSuggestionSort] = useState<SortConfig<SuggestedSortKey>>({
    key: "date",
    direction: "asc",
  });
  const [salesforceSort, setSalesforceSort] = useState<SortConfig<SalesforceSortKey>>({
    key: "date",
    direction: "desc",
  });
  const [salesforceColumnWidths, setSalesforceColumnWidths] = useState(initialSalesforceColumnWidths);

  const projectLookupOptions = useMemo(
    () =>
      mergeProjectOptions(
        availableProjects,
        defaultProject.label ? [defaultProject] : [],
        suggestions
          .map((entry) => ({
            id: projectIdFromValue(entry.projectValue),
            label: entry.projectLabel,
            idPricingStructure: entry.projectValue,
            pricingStructure: pricingStructureForEntry(entry),
            taskId: entry.taskId,
            websiteDomain: entry.projectWebsiteDomain,
          }))
          .filter((project) => project.label),
      ),
    [availableProjects, defaultProject, suggestions],
  );
  const calendarFile = integrationStatus?.providers.google.localFile ?? ".local/calendar-events.json";
  const calendarLastSyncedAt = integrationStatus?.providers.google.lastSyncedAt ?? null;
  const calendarAgeHours = fileAgeHours(calendarLastSyncedAt);
  const usesLocalCalendarFile =
    Boolean(integrationStatus?.providers.google.localFile) || !integrationStatus?.providers.google.configured;
  const calendarFileState =
    !usesLocalCalendarFile
      ? "fresh"
      : calendarAgeHours === null
      ? "missing"
      : calendarAgeHours > 8
        ? "stale"
        : "fresh";

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
        liveSalesforceRows.filter((entry) => inRange(entry, salesforceStart, salesforceEnd)),
        salesforceSort,
      ),
    [liveSalesforceRows, salesforceEnd, salesforceSort, salesforceStart],
  );

  const totals = useMemo(() => {
    const suggestedHours = filteredSuggestions.reduce((sum, entry) => sum + entry.hours, 0);
    const salesforceHours = filteredSalesforceRows.reduce((sum, entry) => sum + entry.hours, 0);
    const rowsToReview = filteredSuggestions.length;
    const lastSalesforceDate = latestSalesforceDate(liveSalesforceRows);
    const weekStart = weekStartIso(defaultSuggestionEnd);
    const weekEnd = addDaysIso(weekStart, 6);
    const weeklySalesforceRows = liveSalesforceRows.filter((entry) => inRange(entry, weekStart, weekEnd));
    const monthlySalesforceRows = liveSalesforceRows.filter((entry) => inRange(entry, monthStart, monthEnd));
    const weekLoggedHours = weeklySalesforceRows.reduce((sum, entry) => sum + entry.hours, 0);
    const monthLoggedHours = monthlySalesforceRows.reduce((sum, entry) => sum + entry.hours, 0);
    const projectHours = hoursByProject(monthlySalesforceRows);

    return {
      suggestedHours,
      salesforceHours,
      rowsToReview,
      lastSalesforceDate,
      weekLoggedHours,
      monthLoggedHours,
      projectHours,
    };
  }, [filteredSalesforceRows, filteredSuggestions, liveSalesforceRows]);

  const largestProjectHours = totals.projectHours[0]?.hours ?? 0;

  useEffect(() => {
    const controller = new AbortController();
    loadSalesforceRows(controller.signal);
    return () => controller.abort();
  }, [salesforceEnd, salesforceStart]);

  useEffect(() => {
    loadIntegrationStatus();
    loadAppUpdateStatus();
    const url = new URL(window.location.href);
    const message = url.searchParams.get("message");
    const integration = url.searchParams.get("integration");
    if (message && integration) {
      setIntegrationMessage(`${integration}: ${message}`);
      window.history.replaceState({}, "", url.pathname);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("timeLogging.deliveryTeam", deliveryTeam);
    loadProjectOptions();
  }, [deliveryTeam]);

  useEffect(() => {
    if (!defaultProject.label.trim()) return;
    const hydratedProject = availableProjects.find(
      (project) =>
        project.idPricingStructure === defaultProject.idPricingStructure ||
        project.id === defaultProject.id ||
        project.label === defaultProject.label,
    );
    if (
      hydratedProject &&
      (hydratedProject.websiteDomain !== defaultProject.websiteDomain ||
        hydratedProject.taskId !== defaultProject.taskId ||
        hydratedProject.idPricingStructure !== defaultProject.idPricingStructure)
    ) {
      setDefaultProject(hydratedProject);
    }
  }, [availableProjects, defaultProject]);

  useEffect(() => {
    if (defaultProject.label.trim()) {
      window.localStorage.setItem("timeLogging.defaultProject", JSON.stringify(defaultProject));
    } else {
      window.localStorage.removeItem("timeLogging.defaultProject");
    }
    setSuggestions((current) => applyDefaultProjectToSuggestions(current, defaultProject));
  }, [defaultProject]);

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
    if (!entryIsComplete(manualDraft)) {
      setManualStatus("Manual entry needs Date, Project, TaskRay Task, Hours, Activity Type, and Notes.");
      return;
    }

    setManualStatus("");
    setSuggestions((current) =>
      [
        ...current,
        {
          ...manualDraft,
          id: `manual-${crypto.randomUUID()}`,
          billable: locksBillable(manualDraft.projectLabel) ? false : manualDraft.billable,
          source: "Manual" as SuggestionSource,
        },
      ].sort(sortSuggested),
    );
    setManualDraft(blankEntry());
    setImportStatus("Manual entry added to Suggested Time Entries.");
  }

  async function refreshCalendarSuggestions() {
    const manualEntries = suggestions.filter((entry) => entry.source === "Manual");
    setIsRefreshingCalendar(true);
    setCalendarSyncStatus("Refreshing Suggestions...");

    await loadCalendarSuggestionsForRange(suggestionStart, suggestionEnd, manualEntries);
    setIsRefreshingCalendar(false);
  }

  async function loadCalendarSuggestionsForRange(
    startDate: string,
    endDate: string,
    manualEntries = suggestions.filter((entry) => entry.source === "Manual"),
  ) {
    try {
      const response = await fetch(
        apiUrl(`/api/calendar/events?start=${startDate}&end=${endDate}&deliveryTeam=${deliveryTeam}`),
      );
      const body = await response.json();

      if (!response.ok) throw new Error(body.error ?? "Calendar refresh failed.");

      const calendarBody = body as CalendarEventResponse;
      setSuggestions([
        ...manualEntries,
        ...buildCalendarSuggestions(
          startDate,
          endDate,
          applyDefaultProjectToCalendarEvents(calendarBody.records, defaultProject),
        ),
      ]);
      if (calendarBody.lastSyncedAt || calendarBody.localFile) {
        setIntegrationStatus((current) =>
          current
            ? {
                ...current,
                providers: {
                  ...current.providers,
                  google: {
                    ...current.providers.google,
                    connected: Boolean(calendarBody.lastSyncedAt),
                    localFile: calendarBody.localFile ?? current.providers.google.localFile,
                    lastSyncedAt: calendarBody.lastSyncedAt ?? current.providers.google.lastSyncedAt,
                  },
                },
              }
            : current,
        );
      }
      setCalendarSyncStatus(calendarBody.warning ?? "Suggestions refreshed from local calendar file");
    } catch (error) {
      setCalendarSyncStatus(error instanceof Error ? error.message : "Suggestion refresh failed.");
    }
  }

  async function copyCodexCalendarSyncPrompt() {
    const prompt = [
      "Using my connected Google Calendar integration, fetch my primary calendar events for the Internal Time Logging app.",
      `Date range: ${monthStart} through ${monthEnd}.`,
      `The app will filter the month file to the current visible range: ${suggestionStart} through ${suggestionEnd}.`,
      `My selected Delivery Team is ${deliveryTeam}.`,
      `Write the result to ${calendarFile}.`,
      "Use JSON with a top-level \"records\" array.",
      "Each record must have: id, title, start, end, project, activityType, billable, responseStatus, transparency, and attendeeEmails.",
      "attendeeEmails must include every non-resource attendee email when available so the app can match external client domains to active Salesforce projects for my selected Delivery Team.",
      "Use these calendar rules:",
      "- Exclude declined events.",
      "- Exclude Focus Time.",
      "- Exclude OOO/out-of-office events.",
      "- Exclude transparent, birthday, and FYI events.",
      "- Mark internal culture/team events as People and Team Activities.",
      "- Mark meetings with DJ and me only as internal.",
      "- For external meetings, include attendeeEmails and leave project blank unless the attendees clearly identify the client.",
      "- For solo work blocks with no attendees, use Coding and Configuration and leave project blank unless the title clearly names a client or project.",
      "After writing the file, tell me to click Refresh Suggestions in the app.",
      "Do not edit app source code for this calendar sync.",
    ].join("\n");

    await navigator.clipboard.writeText(prompt);
    setCalendarSyncStatus("Codex calendar sync prompt copied.");
  }

  async function loadIntegrationStatus() {
    try {
      const response = await fetch(apiUrl("/api/integrations/status"));
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Integration status failed.");

      setIntegrationStatus(body as IntegrationStatusResponse);
      setIntegrationMessage("Integration status loaded.");
    } catch (error) {
      setIntegrationMessage(error instanceof Error ? error.message : "Integration status failed.");
    }
  }

  async function loadAppUpdateStatus() {
    try {
      const response = await fetch(apiUrl("/api/app/update-status"));
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Update check failed.");

      const status = body as AppUpdateStatus;
      setAppUpdateStatus(status);
      setAppUpdateMessage(
        status.updateAvailable
          ? "App is out of date"
          : status.message ?? (status.local ? "App is up to date" : "Hosted deployment controls updates"),
      );
    } catch (error) {
      setAppUpdateMessage(error instanceof Error ? error.message : "Update check failed.");
    }
  }

  async function updateApp() {
    setIsUpdatingApp(true);
    setAppUpdateMessage("Installing update...");
    try {
      const response = await fetch(apiUrl("/api/app/update"), { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Update failed.");

      setAppUpdateStatus(body as AppUpdateStatus);
      setAppUpdateMessage(body.message ?? "Update installed.");
    } catch (error) {
      setAppUpdateMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setIsUpdatingApp(false);
    }
  }

  async function loadProjectOptions() {
    setIsRefreshingProjects(true);
    setProjectSyncStatus(`Refreshing Salesforce projects for ${deliveryTeam}...`);
    try {
      const response = await fetch(apiUrl(`/api/salesforce/projects?deliveryTeam=${deliveryTeam}`));
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Project refresh failed.");

      const records = (body as ProjectResponse).records;
      setAvailableProjects(records);
      setProjectSyncStatus(`Loaded ${records.length} Salesforce project${records.length === 1 ? "" : "s"} for ${deliveryTeam}.`);
    } catch (error) {
      const fallbackProjects = projectOptions.filter(
        (project) =>
          project.id === INTERNAL_PROJECT.id ||
          project.label.includes(`(${deliveryTeam})`) ||
          project.label.includes(`[${deliveryTeam}]`) ||
          (deliveryTeam === "Engineering" && project.label.includes("(ENG)")),
      );
      setAvailableProjects(fallbackProjects);
      setProjectSyncStatus(
        error instanceof Error
          ? `${error.message}. Using ${fallbackProjects.length} fallback project${fallbackProjects.length === 1 ? "" : "s"}.`
          : `Using ${fallbackProjects.length} fallback project${fallbackProjects.length === 1 ? "" : "s"}.`,
      );
    } finally {
      setIsRefreshingProjects(false);
    }
  }

  function connectProvider(provider: "google" | "salesforce") {
    window.location.href = `/api/oauth/start?provider=${provider}`;
  }

  async function disconnectProvider(provider: "google" | "salesforce") {
    setIntegrationMessage(`Disconnecting ${provider}...`);
    try {
      const response = await fetch(apiUrl(`/api/integrations/disconnect?provider=${provider}`), { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Disconnect failed.");

      setIntegrationMessage(`${provider} disconnected.`);
      await loadIntegrationStatus();
    } catch (error) {
      setIntegrationMessage(error instanceof Error ? error.message : "Disconnect failed.");
    }
  }

  async function loadSalesforceRows(signal?: AbortSignal) {
    setSalesforceSyncStatus("Refreshing Salesforce...");
    try {
      const response = await fetch(
        apiUrl(`/api/salesforce/time-entries?start=${salesforceStart}&end=${salesforceEnd}`),
        { signal },
      );
      const body = await response.json();

      if (!response.ok) throw new Error(body.error ?? "Salesforce refresh failed.");

      const records = (body as SalesforceTimeEntryResponse).records;
      setLiveSalesforceRows(records);
      if (!liveSalesforceDefaultApplied && !suggestionStartWasEdited) {
        const nextStart = defaultSuggestionStartFor(records);
        const manualEntries = suggestions.filter((entry) => entry.source === "Manual");
        setSuggestionStart(nextStart);
        await loadCalendarSuggestionsForRange(nextStart, suggestionEnd, manualEntries);
        setLiveSalesforceDefaultApplied(true);
      }
      setSalesforceSyncStatus("Salesforce live");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSalesforceSyncStatus(error instanceof Error ? error.message : "Salesforce refresh failed.");
    }
  }

  function salesforceStatusClass() {
    if (salesforceSyncStatus === "Salesforce live") return "sync-status live";
    if (salesforceSyncStatus === "Refreshing Salesforce..." || salesforceSyncStatus === "Salesforce snapshot loaded") {
      return "sync-status";
    }
    return "sync-status failed";
  }

  function salesforceErrorMessage() {
    if (
      salesforceSyncStatus === "Salesforce live" ||
      salesforceSyncStatus === "Refreshing Salesforce..." ||
      salesforceSyncStatus === "Salesforce snapshot loaded"
    ) {
      return "";
    }
    return salesforceSyncStatus;
  }

  function calendarStatusClass() {
    if (calendarSyncStatus === "Calendar live") return "sync-status live";
    if (
      calendarSyncStatus === "Refreshing Calendar..." ||
      calendarSyncStatus === "Refreshing Suggestions..." ||
      calendarSyncStatus === "Calendar snapshot loaded"
    ) {
      return "sync-status";
    }
    return "sync-status failed";
  }

  function appUpdateStatusClass() {
    if (/failed|error/i.test(appUpdateMessage)) return "action-status failed";
    if (appUpdateStatus?.updateAvailable) return "action-status warning";
    return "action-status live";
  }

  function integrationClass(provider: ProviderConnectionStatus | undefined) {
    if (!provider) return "integration-state ready";
    if (provider?.connected) return "integration-state connected";
    if (provider?.configured) return "integration-state ready";
    return "integration-state missing";
  }

  function googleConnectionLabel() {
    const google = integrationStatus?.providers.google;
    if (!google) return "Checking local mode";
    if (google.connected) return google.localFile ? "Codex file synced" : "OAuth connected";
    if (google.configured) return "OAuth ready";
    return google.localFile ? "Codex sync needed" : "Codex sync mode";
  }

  function salesforceConnectionLabel() {
    const salesforce = integrationStatus?.providers.salesforce;
    if (!salesforce) return "Checking local mode";
    if (salesforce.connected) return salesforce.configured ? "OAuth connected" : "CLI connected";
    if (salesforce.configured) return "OAuth ready";
    return salesforce.fallbackConfigured ? "CLI fallback ready" : "CLI setup needed";
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
    setImportStatus("Payload copied.");
  }

  async function importToSalesforce() {
    const incompleteRow = filteredSuggestions.find((entry) => !entryIsComplete(entry));
    if (incompleteRow) {
      setSuggestedStatus("Suggested entries need Date, Project, TaskRay Task, Hours, Activity Type, and Notes before import.");
      return;
    }

    const payload = toSalesforcePayload(filteredSuggestions);
    if (!payload.length) {
      setSuggestedStatus("No suggested rows to import.");
      return;
    }

    setSuggestedStatus("");
    setManualStatus("");
    setIsImporting(true);
    setImportStatus("Importing to Salesforce...");
    try {
      const response = await fetch(apiUrl("/api/salesforce/time-entries"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (!response.ok) throw new Error(body.error ?? "Salesforce import failed.");

      setImportStatus(`Imported ${payload.length} row${payload.length === 1 ? "" : "s"} to Salesforce.`);
      await loadSalesforceRows();
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "Salesforce import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <main className="shell">
      <datalist id="project-options">
        {projectLookupOptions.map((candidate) => (
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
        <div className="header-actions">
          <div className="header-button-bar">
            <button type="button" className="primary" onClick={importToSalesforce} disabled={isImporting}>
              {isImporting ? "Importing..." : "Import to Salesforce"}
            </button>
            <button type="button" onClick={copyPayload}>
              Copy Salesforce Payload
            </button>
            <button type="button" onClick={loadAppUpdateStatus}>
              Check for Updates
            </button>
            <button
              type="button"
              className="primary"
              disabled={!appUpdateStatus?.local || !appUpdateStatus.updateAvailable || appUpdateStatus.dirty || isUpdatingApp}
              onClick={updateApp}
            >
              {isUpdatingApp ? "Updating..." : "Update App"}
            </button>
          </div>
          <p className={appUpdateStatusClass()}>{appUpdateMessage}</p>
          {importStatus ? <p className="action-status">{importStatus}</p> : null}
        </div>
      </header>

      <section className="integration-panel" aria-label="Integration connections">
        <div className="integration-heading">
          <div>
            <h2>Connections</h2>
            <p>{integrationStatus?.user?.email ?? integrationMessage}</p>
          </div>
          <button type="button" onClick={loadIntegrationStatus}>
            Refresh Status
          </button>
        </div>
        <div className="integration-grid">
          <div className="integration-card">
            <div>
              <span>Google Calendar</span>
              <strong className={integrationClass(integrationStatus?.providers.google)}>
                {googleConnectionLabel()}
              </strong>
            </div>
            <div className="integration-actions">
              <button
                type="button"
                className="primary"
                disabled={!integrationStatus?.providers.google.configured}
                onClick={() => connectProvider("google")}
              >
                Connect
              </button>
              <button
                type="button"
                disabled={!integrationStatus?.providers.google.connected}
                onClick={() => disconnectProvider("google")}
              >
                Disconnect
              </button>
            </div>
          </div>
          <div className="integration-card">
            <div>
              <span>Salesforce</span>
              <strong className={integrationClass(integrationStatus?.providers.salesforce)}>
                {salesforceConnectionLabel()}
              </strong>
            </div>
            <div className="integration-actions">
              <button
                type="button"
                className="primary"
                disabled={!integrationStatus?.providers.salesforce.configured}
                onClick={() => connectProvider("salesforce")}
              >
                Connect
              </button>
              <button
                type="button"
                disabled={!integrationStatus?.providers.salesforce.connected}
                onClick={() => disconnectProvider("salesforce")}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="metrics" aria-label="Time logging dashboard">
        <div>
          <span>Time Logged This Week</span>
          <strong>{formatHours(totals.weekLoggedHours)}</strong>
        </div>
        <div>
          <span>Time Logged This Month</span>
          <strong>{formatHours(totals.monthLoggedHours)}</strong>
        </div>
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

      <section className="project-dashboard" aria-label="Hours this month by project">
        <div className="dashboard-heading">
          <h2>Hours This Month by Project</h2>
        </div>
        <div className="project-bars">
          {totals.projectHours.length ? (
            totals.projectHours.map((project) => (
              <div className="project-bar" key={project.projectLabel}>
                <div className="project-bar-label">
                  <span>{project.projectLabel}</span>
                  <strong>{formatHours(project.hours)}</strong>
                </div>
                <div className="project-bar-track">
                  <span style={{ width: `${largestProjectHours ? (project.hours / largestProjectHours) * 100 : 0}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">No Salesforce time entries found for this month.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading suggested-heading">
          <div>
            <div className="heading-with-help">
              <h2>Suggested Time Entries</h2>
              <details className="help-bubble">
                <summary aria-label="Suggested time entry rules">?</summary>
                <div className="help-card">
                  <strong>Suggested entry rules</strong>
                  <ul>
                    <li>Declined, transparent, Focus Time, OOO, and out-of-office events are ignored.</li>
                    <li>Same-day calendar entries with the same project, billable value, and activity type are consolidated.</li>
                    <li>Calendar titles become Notes, with duplicate same-day titles listed once.</li>
                    <li>Kicksaw projects are non-billable and the checkbox is locked.</li>
                    <li>Sync Calendar with Codex rewrites the local file; Refresh Suggestions rereads it.</li>
                  </ul>
                </div>
              </details>
            </div>
            <div className="section-messages" aria-live="polite">
              <p className={calendarStatusClass()}>{calendarSyncStatus}</p>
              <p className="sync-status">{projectSyncStatus}</p>
              <p className={`calendar-file-state ${calendarFileState}`}>
                {usesLocalCalendarFile
                  ? `Calendar file last synced: ${formatDateTime(calendarLastSyncedAt)}`
                  : "Google Calendar sync: live connection"}
              </p>
              {suggestedStatus ? <p className="table-status error">{suggestedStatus}</p> : null}
            </div>
          </div>
        </div>
        <div className="suggested-controls">
          <label className="team-filter">
            Delivery Team
            <select
              value={deliveryTeam}
              onChange={(event) => setDeliveryTeam(event.target.value as DeliveryTeam)}
            >
              {deliveryTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
          <label className="default-project-control">
            Default Project
            <span className="default-project-row">
              <ProjectLookup
                label="Default project"
                value={defaultProject.label}
                options={projectLookupOptions}
                showLabel={false}
                onChange={(selected) => setDefaultProject(selected)}
              />
              <button type="button" onClick={() => setDefaultProject(blankProject())}>
                Clear
              </button>
            </span>
          </label>
          <div className="date-filters">
            <label>
              Start
              <input
                type="date"
                required
                value={suggestionStart}
                onChange={(event) => {
                  setSuggestionStartWasEdited(true);
                  setSuggestionStart(event.target.value);
                }}
              />
            </label>
            <label>
              End
              <input
                type="date"
                required
                value={suggestionEnd}
                onChange={(event) => setSuggestionEnd(event.target.value)}
              />
            </label>
          </div>
          <button type="button" className="primary" onClick={loadProjectOptions} disabled={isRefreshingProjects}>
            {isRefreshingProjects ? "Refreshing Projects..." : "Refresh Projects"}
          </button>
          <button type="button" className="primary" onClick={copyCodexCalendarSyncPrompt}>
            Sync Calendar with Codex
          </button>
          <button type="button" className="primary" onClick={refreshCalendarSuggestions} disabled={isRefreshingCalendar}>
            {isRefreshingCalendar ? "Refreshing..." : "Refresh Suggestions"}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuggestions.map((entry) => {
                return (
                  <tr key={entry.id} className={entry.hours > 12 || !entry.projectValue ? "review-row" : ""}>
                    <td>
                      <input
                        type="date"
                        required
                        value={entry.date}
                        onChange={(event) => updateSuggestion(entry.id, { date: event.target.value })}
                      />
                    </td>
                    <td>
                      <ProjectLookup
                        label="Project"
                        value={entry.projectLabel}
                        options={projectLookupOptions}
                        required
                        showLabel={false}
                        onChange={(selected) =>
                          updateSuggestion(entry.id, {
                            projectValue: selected.idPricingStructure,
                            projectLabel: selected.label,
                            projectWebsiteDomain: selected.websiteDomain,
                            billable: billableForProject(selected, entry.billable),
                            activityType: activityTypeForProject(selected.label, entry.activityType),
                            taskId: selected.taskId,
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="hours"
                        type="number"
                        min="0"
                        required
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
                        required
                        value={entry.activityType}
                        onChange={(event) =>
                          updateSuggestion(entry.id, { activityType: event.target.value })
                        }
                      >
                        {activityTypesForProjectLabel(entry.projectLabel).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <textarea
                        required
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
        </div>
        <div className="table-wrap">
          <table className="manual-table">
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
              <tr>
                <td>
                  <input
                    aria-label="Manual entry date"
                    type="date"
                    required
                    value={manualDraft.date}
                    onChange={(event) => setManualDraft({ ...manualDraft, date: event.target.value })}
                  />
                </td>
                <td>
                  <ProjectLookup
                    label="Manual entry project"
                    value={manualDraft.projectLabel}
                    options={projectLookupOptions}
                    required
                    showLabel={false}
                    onChange={(selectedProject) =>
                      setManualDraft({
                        ...manualDraft,
                        projectValue: selectedProject.idPricingStructure,
                        projectLabel: selectedProject.label,
                        projectWebsiteDomain: selectedProject.websiteDomain,
                        billable: billableForProject(selectedProject, manualDraft.billable),
                        activityType: activityTypeForProject(selectedProject.label, manualDraft.activityType),
                        taskId: selectedProject.taskId,
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label="Manual entry hours"
                    type="number"
                    min="0"
                    required
                    step="0.25"
                    value={manualDraft.hours || ""}
                    onChange={(event) =>
                      setManualDraft({ ...manualDraft, hours: Number(event.target.value) })
                    }
                  />
                </td>
                <td className="checkbox-cell">
                  <input
                    aria-label="Manual entry billable"
                    type="checkbox"
                    checked={manualDraft.billable}
                    disabled={locksBillable(manualDraft.projectLabel)}
                    onChange={(event) =>
                      setManualDraft({ ...manualDraft, billable: event.target.checked })
                    }
                  />
                </td>
                <td>
                  <select
                    aria-label="Manual entry activity type"
                    required
                    value={manualDraft.activityType}
                    onChange={(event) =>
                      setManualDraft({ ...manualDraft, activityType: event.target.value })
                    }
                  >
                    {activityTypesForProjectLabel(manualDraft.projectLabel).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <textarea
                    aria-label="Manual entry notes"
                    required
                    value={manualDraft.notes}
                    onChange={(event) => setManualDraft({ ...manualDraft, notes: event.target.value })}
                    placeholder="Describe the work for Salesforce notes"
                  />
                </td>
                <td>
                  <button type="button" className="primary" onClick={addManualEntry}>
                    Add Entry
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {manualStatus ? <p className="table-status error">{manualStatus}</p> : null}
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
          {salesforceErrorMessage() ? <p className={salesforceStatusClass()}>{salesforceErrorMessage()}</p> : null}
          <button type="button" className="primary" onClick={() => loadSalesforceRows()}>
            Refresh Salesforce
          </button>
        </div>
        <div className="table-wrap salesforce-wrap">
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
