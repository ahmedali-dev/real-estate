export interface ElectricalReadingDTO {
  _id: string;
  electricityNumber: string;
  watts: number;
  kwh: number;
  costBs: number;
  recordedAt: string;
  createdAt: string;
}

export interface MeterOption {
  electricityNumber: string;
  propertyId: string;
  propertyTitle: string;
  unitName?: string;
  unitNumber?: string;
}

export interface ElectricalStats {
  latestWatts: number | null;
  todayKwh: number;
  monthKwh: number;
  todayCostBs: number;
  monthCostBs: number;
}

export type ElectricalAlertKind = "spike" | "vampire";

export interface ElectricalAlert {
  kind: ElectricalAlertKind;
  message: string;
  detail: string;
  at: string;
}
