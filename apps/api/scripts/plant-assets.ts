/**
 * Anlagenkatalog für den Mandanten DEMO: genau 1.000 Assets.
 *
 * Strukturkennzeichen wie ein technischer Platz (SAP PM / IEC 81346),
 * vom Standort bis zum Bauteil:
 *   DE01-PH1-L01-CNC-SPI-MOT
 *
 * Rang: Standort → Gebäude → Fläche → Baugruppe → Instandhaltungsobjekt.
 * Ein Eltern-Asset darf nur gleiche oder tiefere Stufen tragen.
 * Standort darf die Wurzel sein; alle anderen Arten brauchen ein Eltern-Asset.
 * Hersteller und Serie nur an physischen Baugruppen und IH-Objekten.
 * Funktionale Gruppierungen (Achse, Station) tragen den OEM, aber keine eigene Serie.
 */
import type { Client } from "pg";

export const PLANT_ASSET_COUNT = 1000;

const ASSET_TYPES = [
  "location",
  "building",
  "area",
  "assembly",
  "maintenance_object",
] as const;

type AssetType = (typeof ASSET_TYPES)[number];

const RANK: Record<AssetType, number> = {
  location: 0,
  building: 1,
  area: 2,
  assembly: 3,
  maintenance_object: 4,
};

const COST_CENTERS = [
  "KS-1000",
  "KS-1100",
  "KS-1200",
  "KS-2000",
  "KS-2100",
  "KS-2200",
  "KS-3000",
  "KS-3100",
  "KS-4000",
  "KS-4100",
] as const;

type CostCenterKey = (typeof COST_CENTERS)[number];

const CC = {
  inst: "KS-1000",
  elt: "KS-1100",
  mech: "KS-1200",
  prod: "KS-2000",
  mont: "KS-2100",
  qs: "KS-2200",
  log: "KS-3000",
  lag: "KS-3100",
  vw: "KS-4000",
  asi: "KS-4100",
} as const satisfies Record<string, CostCenterKey>;

/**
 * Stückzahlen, mit denen der Katalog auf genau 1.000 Assets kommt.
 * Brandschutzklappen sind je Lüftungsanlage einzeln geführt (prüfpflichtig).
 * Druckluft-Entnahmestellen: eine je versorgter Halle.
 */
const PH1_CNC_LINES = 4;
const AIR_DROP_SEGMENTS = ["PH1", "PH2", "MH1", "QS1", "WS1", "HRL"] as const;
const FIRE_DAMPERS_PER_HALL = 7;

export type PlantAsset = {
  key: string;
  type: AssetType;
  parentKey: string | null;
  costCenterKey: CostCenterKey;
  serialNumber: string | null;
  manufacturer: string | null;
};

const usedSerials = new Set<string>();

function serialNumber(key: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  let n = (hash >>> 0) % 900000;
  for (;;) {
    const year = 2016 + (n % 10);
    const serial = `${year}-${String(100000 + (n % 900000)).padStart(6, "0")}`;
    if (!usedSerials.has(serial)) {
      usedSerials.add(serial);
      return serial;
    }
    n += 1;
  }
}

class Catalog {
  readonly assets: PlantAsset[] = [];
  private readonly byKey = new Map<string, PlantAsset>();

  add(
    parentKey: string | null,
    segment: string,
    type: AssetType,
    costCenterKey: CostCenterKey,
    manufacturer: string | null,
    serialized: boolean,
  ): string {
    if (!/^[A-Z][A-Z0-9]{0,11}$/.test(segment)) {
      throw new Error(`Ungültiges Segment: ${segment}`);
    }
    const key = parentKey ? `${parentKey}-${segment}` : segment;
    if (this.byKey.has(key)) {
      throw new Error(`Doppelter Schlüssel ${key}`);
    }
    if (parentKey) {
      const parent = this.byKey.get(parentKey);
      if (!parent) {
        throw new Error(`Eltern-Asset fehlt: ${parentKey}`);
      }
      if (RANK[type] < RANK[parent.type]) {
        throw new Error(
          `${key} (${type}) darf nicht unter ${parent.key} (${parent.type}) liegen`,
        );
      }
    } else if (type !== "location") {
      throw new Error(`${key} braucht ein Eltern-Asset`);
    }

    const structure =
      type === "location" || type === "building" || type === "area";
    if (structure) {
      manufacturer = null;
      serialized = false;
    }
    if (type === "maintenance_object" && !manufacturer) {
      throw new Error(`${key} braucht einen Hersteller`);
    }
    if (serialized && !manufacturer) {
      throw new Error(`${key} hat eine Serie ohne Hersteller`);
    }

    const asset: PlantAsset = {
      key,
      type,
      parentKey,
      costCenterKey,
      manufacturer,
      serialNumber: serialized ? serialNumber(key) : null,
    };
    this.assets.push(asset);
    this.byKey.set(key, asset);
    return key;
  }

  loc(parent: string | null, segment: string, cc: CostCenterKey): string {
    return this.add(parent, segment, "location", cc, null, false);
  }

  bld(parent: string, segment: string, cc: CostCenterKey): string {
    return this.add(parent, segment, "building", cc, null, false);
  }

  area(parent: string, segment: string, cc: CostCenterKey): string {
    return this.add(parent, segment, "area", cc, null, false);
  }

  bg(
    parent: string,
    segment: string,
    cc: CostCenterKey,
    manufacturer: string | null,
    serialized = true,
  ): string {
    return this.add(
      parent,
      segment,
      "assembly",
      cc,
      manufacturer,
      serialized && manufacturer != null,
    );
  }

  io(
    parent: string,
    segment: string,
    cc: CostCenterKey,
    manufacturer: string,
  ): string {
    return this.add(
      parent,
      segment,
      "maintenance_object",
      cc,
      manufacturer,
      true,
    );
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

type Part = [segment: string, manufacturer: string];

function addParts(
  c: Catalog,
  parent: string,
  cc: CostCenterKey,
  parts: readonly Part[],
) {
  for (const [segment, manufacturer] of parts) {
    c.io(parent, segment, cc, manufacturer);
  }
}

function addControl(
  c: Catalog,
  parent: string,
  cc: CostCenterKey,
  oem = "Siemens",
): string {
  const str = c.bg(parent, "STR", cc, oem);
  addParts(c, str, cc, [
    ["SPS", oem],
    ["HMI", oem],
    ["NT", "Phoenix Contact"],
    ["SREL", "Pilz"],
    ["LS", "ABB"],
    ["NET", "Siemens"],
  ]);
  return str;
}

function addAxis(
  c: Catalog,
  parent: string,
  segment: string,
  cc: CostCenterKey,
  drive: string,
) {
  const axis = c.bg(parent, segment, cc, drive, false);
  addParts(c, axis, cc, [
    ["MOT", drive],
    ["SRV", drive],
    ["KGT", "Bosch Rexroth"],
    ["ENC", "Heidenhain"],
    ["FUE", "Schaeffler"],
  ]);
}

function addCncLine(
  c: Catalog,
  building: string,
  index: number,
  cc: CostCenterKey,
) {
  const oems = ["DMG MORI", "GROB", "Hermle", "Heller"] as const;
  const oem = oems[(index - 1) % oems.length]!;
  const drive = oem === "Hermle" ? "Bosch Rexroth" : "Siemens";
  const area = c.area(building, `L${pad(index)}`, cc);
  const cnc = c.bg(area, "CNC", cc, oem);

  const spi = c.bg(cnc, "SPI", cc, oem);
  addParts(c, spi, cc, [
    ["MOT", oem === "GROB" ? "Kessler" : "Siemens"],
    ["ENC", "Heidenhain"],
    ["LAG", index % 2 === 0 ? "SKF" : "Schaeffler"],
    ["DRE", "Deublin"],
    ["TEM", "ifm electronic"],
  ]);

  addAxis(c, cnc, "X", cc, drive);
  addAxis(c, cnc, "Y", cc, drive);
  addAxis(c, cnc, "Z", cc, drive);

  const wzw = c.bg(cnc, "WZW", cc, oem, false);
  addParts(c, wzw, cc, [
    ["MOT", "SEW-Eurodrive"],
    ["SEN", "ifm electronic"],
    ["GRE", "Schunk"],
  ]);

  const kss = c.bg(cnc, "KSS", cc, "Brinkmann Pumpen");
  addParts(c, kss, cc, [
    ["PMP", "Brinkmann Pumpen"],
    ["MOT", "Siemens"],
    ["FIL", "Hydac"],
    ["DS", "ifm electronic"],
    ["NIV", "ifm electronic"],
  ]);

  const hyd = c.bg(cnc, "HYD", cc, "Hydac");
  addParts(c, hyd, cc, [
    ["PMP", "Bosch Rexroth"],
    ["MOT", "Siemens"],
    ["VEN", "Hydac"],
    ["DS", "Hydac"],
    ["SPE", "Hydac"],
  ]);

  const foe = c.bg(cnc, "FOE", cc, "Knoll Maschinenbau");
  addParts(c, foe, cc, [
    ["MOT", "SEW-Eurodrive"],
    ["SEN", "ifm electronic"],
  ]);

  addControl(c, cnc, cc, "Siemens");

  const abs = c.bg(cnc, "ABS", cc, "Nederman");
  addParts(c, abs, cc, [
    ["LUF", "Nederman"],
    ["MOT", "Siemens"],
    ["FIL", "Nederman"],
  ]);

  addParts(c, cnc, cc, [
    ["NH", "Pilz"],
    ["TZ", "Euchner"],
  ]);
}

function addPressLine(c: Catalog, building: string, index: number, cc: CostCenterKey) {
  const area = c.area(building, `P${pad(index)}`, cc);
  const prs = c.bg(area, "PRS", cc, "Schuler");
  const hyd = c.bg(prs, "HYD", cc, "Bosch Rexroth");
  addParts(c, hyd, cc, [
    ["PMP", "Bosch Rexroth"],
    ["MOT", "Siemens"],
    ["FU", "Siemens"],
    ["VEN", "Hydac"],
    ["FIL", "Hydac"],
    ["NIV", "ifm electronic"],
    ["TEM", "ifm electronic"],
    ["SPE", "Hydac"],
  ]);
  const sto = c.bg(prs, "STO", cc, "Schuler", false);
  addParts(c, sto, cc, [
    ["WEG", "Balluff"],
    ["DS", "ifm electronic"],
    ["LAG", "Schaeffler"],
    ["KUP", "KTR"],
  ]);
  addControl(c, prs, cc, "Siemens");
  addParts(c, prs, cc, [
    ["NH", "Pilz"],
    ["LIG", "Sick"],
    ["SIC", "Pilz"],
  ]);
  const zuf = c.bg(area, "ZUF", cc, "Schuler");
  addParts(c, zuf, cc, [
    ["MOT", "SEW-Eurodrive"],
    ["FU", "Lenze"],
    ["GET", "SEW-Eurodrive"],
    ["SEN", "Balluff"],
  ]);
}

function addWeldCell(c: Catalog, building: string, cc: CostCenterKey) {
  const area = c.area(building, "SW", cc);
  const cell = c.bg(area, "ZEL", cc, "KUKA");
  const rob = c.bg(cell, "ROB", cc, "KUKA");
  addParts(c, rob, cc, [
    ["CTRL", "KUKA"],
    ["SRV", "KUKA"],
    ["BRE", "Mayr"],
    ["ENC", "Heidenhain"],
  ]);
  const que = c.bg(cell, "QUE", cc, "Fronius");
  addParts(c, que, cc, [
    ["QEL", "Fronius"],
    ["DRA", "Fronius"],
    ["GAS", "Fronius"],
  ]);
  const vor = c.bg(cell, "VOR", cc, "Festo", false);
  addParts(c, vor, cc, [
    ["ZYL", "Festo"],
    ["VEN", "Festo"],
    ["SEN", "Balluff"],
  ]);
  addParts(c, cell, cc, [
    ["SCAN", "Sick"],
    ["NH", "Pilz"],
  ]);
}

function addAssemblyLine(
  c: Catalog,
  building: string,
  index: number,
  cc: CostCenterKey,
) {
  const robots = ["KUKA", "ABB", "Fanuc"] as const;
  const robot = robots[(index - 1) % robots.length]!;
  const control = index === 2 ? "Beckhoff" : "Siemens";
  const vision = index === 3 ? "Keyence" : "Cognex";
  const area = c.area(building, `L${pad(index)}`, cc);
  const lin = c.bg(area, "LIN", cc, "Bosch Rexroth");

  const st1 = c.bg(lin, "ST1", cc, "Bosch Rexroth", false);
  addParts(c, st1, cc, [
    ["SCR", "Bosch Rexroth"],
    ["DMO", "Bosch Rexroth"],
    ["SPS", control],
  ]);
  const st2 = c.bg(lin, "ST2", cc, vision, false);
  addParts(c, st2, cc, [
    ["CAM", vision],
    ["BEL", "Siemens"],
    ["SPS", control],
  ]);
  const uml = c.bg(lin, "UML", cc, "Bosch Rexroth", false);
  addParts(c, uml, cc, [
    ["ZYL", "Festo"],
    ["VEN", "Festo"],
    ["RFID", "Balluff"],
  ]);
  addParts(c, lin, cc, [
    ["MOT", "SEW-Eurodrive"],
    ["FU", "Lenze"],
    ["LSCH", "Sick"],
    ["NH", "Pilz"],
  ]);
  const rob = c.bg(lin, "ROB", cc, robot);
  addParts(c, rob, cc, [
    ["CTRL", robot],
    ["SRV", robot],
    ["GRE", "Schunk"],
    ["SIC", "Sick"],
  ]);
}

function addCrane(
  c: Catalog,
  parent: string,
  cc: CostCenterKey,
  oem: string,
) {
  const krn = c.bg(parent, "KRN", cc, oem);
  addParts(c, krn, cc, [
    ["HUB", "SEW-Eurodrive"],
    ["KAT", "SEW-Eurodrive"],
    ["FHU", "Siemens"],
    ["FKA", "Siemens"],
    ["END", "steute"],
    ["STE", oem],
    ["FER", "HBC-radiomatic"],
  ]);
}

function addConveyor(
  c: Catalog,
  parent: string,
  segment: string,
  cc: CostCenterKey,
) {
  const cv = c.bg(parent, segment, cc, "SEW-Eurodrive");
  addParts(c, cv, cc, [
    ["MOT", "SEW-Eurodrive"],
    ["FU", "SEW-Eurodrive"],
    ["SEN", "Sick"],
  ]);
}

function addDoor(
  c: Catalog,
  parent: string,
  segment: string,
  cc: CostCenterKey,
) {
  const tor = c.bg(parent, segment, cc, "Hörmann");
  addParts(c, tor, cc, [
    ["ANT", "Hörmann"],
    ["STE", "Hörmann"],
    ["LSCH", "Sick"],
  ]);
}

function addAhu(
  c: Catalog,
  parent: string,
  segment: string,
  cc: CostCenterKey,
  dampers: number,
) {
  const rlt = c.bg(parent, segment, cc, "Wolf");
  addParts(c, rlt, cc, [
    ["ZUL", "Wolf"],
    ["ABL", "Wolf"],
    ["MZL", "Siemens"],
    ["MAB", "Siemens"],
    ["FIL", "Wolf"],
    ["STE", "Siemens"],
  ]);
  for (let i = 1; i <= dampers; i++) {
    c.io(rlt, `BSK${pad(i)}`, cc, "Trox");
  }
}

function addSwitchgear(c: Catalog, parent: string, segment: string, cc: CostCenterKey) {
  const nsh = c.bg(parent, segment, cc, "Siemens");
  addParts(c, nsh, cc, [
    ["LS", "Siemens"],
    ["EIN", "Siemens"],
    ["STE", "Siemens"],
  ]);
}

function addUps(c: Catalog, parent: string, cc: CostCenterKey) {
  const usv = c.bg(parent, "USV", cc, "Eaton");
  addParts(c, usv, cc, [
    ["BAT", "Eaton"],
    ["REC", "Eaton"],
    ["STE", "Eaton"],
  ]);
}

function addRbg(c: Catalog, area: string, cc: CostCenterKey) {
  const rbg = c.bg(area, "RBG", cc, "SSI Schäfer");
  addParts(c, rbg, cc, [
    ["HUB", "SEW-Eurodrive"],
    ["FAH", "SEW-Eurodrive"],
    ["FHU", "SEW-Eurodrive"],
    ["FFA", "SEW-Eurodrive"],
    ["GET", "SEW-Eurodrive"],
    ["SPS", "Siemens"],
    ["POS", "Leuze electronic"],
    ["SIC", "Sick"],
  ]);
}

function addForklift(
  c: Catalog,
  area: string,
  index: number,
  cc: CostCenterKey,
) {
  const oems = ["Still", "Linde Material Handling", "Jungheinrich"] as const;
  const oem = oems[(index - 1) % oems.length]!;
  const ffz = c.bg(area, `F${pad(index)}`, cc, oem);
  addParts(c, ffz, cc, [
    ["BAT", oem],
    ["ANT", oem],
    ["HYD", oem],
    ["STE", oem],
  ]);
}

function addCompressor(
  c: Catalog,
  parent: string,
  segment: string,
  cc: CostCenterKey,
  oem: string,
) {
  const komp = c.bg(parent, segment, cc, oem);
  addParts(c, komp, cc, [
    ["MOT", "Siemens"],
    ["STG", oem],
    ["DS", "ifm electronic"],
    ["TEM", "ifm electronic"],
    ["FIL", oem],
    ["STE", oem],
  ]);
}

function addAirDrop(c: Catalog, header: string, segment: string, cc: CostCenterKey) {
  const drop = c.bg(header, segment, cc, "Festo", false);
  addParts(c, drop, cc, [
    ["FIL", "Festo"],
    ["REG", "Festo"],
    ["KUG", "Festo"],
  ]);
}

function buildProduction(c: Catalog, site: string) {
  const ph1 = c.bld(site, "PH1", CC.prod);
  for (let i = 1; i <= PH1_CNC_LINES; i++) {
    addCncLine(c, ph1, i, CC.prod);
  }
  const rei = c.area(ph1, "REI", CC.prod);
  const was = c.bg(rei, "REI", CC.prod, "Pero");
  addParts(c, was, CC.prod, [
    ["PMP", "Grundfos"],
    ["MOT", "Siemens"],
    ["HEI", "Pero"],
    ["DS", "ifm electronic"],
    ["NIV", "ifm electronic"],
    ["STE", "Siemens"],
  ]);
  const wz = c.area(ph1, "WZ", CC.prod);
  const pre = c.bg(wz, "VOR", CC.prod, "Zoller");
  addParts(c, pre, CC.prod, [
    ["CAM", "Zoller"],
    ["STE", "Zoller"],
    ["ACH", "Bosch Rexroth"],
  ]);
  const spa = c.area(ph1, "SPA", CC.prod);
  const zent = c.bg(spa, "ZEN", CC.prod, "Knoll Maschinenbau");
  addParts(c, zent, CC.prod, [
    ["MOT", "SEW-Eurodrive"],
    ["GET", "SEW-Eurodrive"],
    ["SEN", "ifm electronic"],
  ]);
  const bri = c.bg(spa, "BRI", CC.prod, "Ruf Maschinenbau");
  addParts(c, bri, CC.prod, [
    ["HYD", "Bosch Rexroth"],
    ["MOT", "Siemens"],
    ["DS", "ifm electronic"],
  ]);
  const med = c.area(ph1, "MED", CC.prod);
  const kss = c.bg(med, "KSS", CC.prod, "Knoll Maschinenbau");
  addParts(c, kss, CC.prod, [
    ["PMP", "Grundfos"],
    ["MOT", "Siemens"],
    ["FU", "Siemens"],
    ["FIL", "Hydac"],
    ["NIV", "ifm electronic"],
    ["DS", "ifm electronic"],
  ]);
  const sr = c.area(ph1, "SR", CC.elt);
  addSwitchgear(c, sr, "NSH", CC.elt);
  addUps(c, sr, CC.elt);
  const kli = c.bg(sr, "KLI", CC.elt, "Rittal");
  addParts(c, kli, CC.elt, [
    ["KOMP", "Rittal"],
    ["TEM", "Rittal"],
  ]);
  const krn = c.area(ph1, "KRN", CC.inst);
  addCrane(c, krn, CC.inst, "Abus Kransysteme");
  addAhu(c, c.area(ph1, "RLT", CC.inst), "RLT", CC.inst, FIRE_DAMPERS_PER_HALL);

  const ph2 = c.bld(site, "PH2", CC.prod);
  addPressLine(c, ph2, 1, CC.prod);
  addPressLine(c, ph2, 2, CC.prod);
  addWeldCell(c, ph2, CC.prod);
  const ph2Sr = c.area(ph2, "SR", CC.elt);
  addSwitchgear(c, ph2Sr, "NSH", CC.elt);
  addUps(c, ph2Sr, CC.elt);
  const ph2Med = c.area(ph2, "MED", CC.prod);
  const kueh = c.bg(ph2Med, "KUE", CC.prod, "KSB");
  addParts(c, kueh, CC.prod, [
    ["PMP", "KSB"],
    ["MOT", "Siemens"],
    ["FU", "Siemens"],
    ["TEM", "ifm electronic"],
    ["DS", "ifm electronic"],
  ]);
  addCrane(c, c.area(ph2, "KRN", CC.inst), CC.inst, "Demag");
  addAhu(c, c.area(ph2, "RLT", CC.inst), "RLT", CC.inst, FIRE_DAMPERS_PER_HALL);
}

function buildAssembly(c: Catalog, site: string) {
  const mh = c.bld(site, "MH1", CC.mont);
  for (let i = 1; i <= 3; i++) {
    addAssemblyLine(c, mh, i, CC.mont);
  }
  const puf = c.area(mh, "PUF", CC.mont);
  addConveyor(c, puf, "C01", CC.mont);
  addConveyor(c, puf, "C02", CC.mont);
  const heb = c.bg(puf, "HEB", CC.mont, "FlexLink");
  addParts(c, heb, CC.mont, [
    ["HYD", "Bosch Rexroth"],
    ["MOT", "SEW-Eurodrive"],
    ["SEN", "ifm electronic"],
  ]);
  const sr = c.area(mh, "SR", CC.elt);
  addSwitchgear(c, sr, "NSH", CC.elt);
  addUps(c, sr, CC.elt);
  addCrane(c, c.area(mh, "KRN", CC.inst), CC.inst, "Abus Kransysteme");
  addAhu(c, c.area(mh, "RLT", CC.inst), "RLT", CC.inst, FIRE_DAMPERS_PER_HALL);
}

function buildQuality(c: Catalog, site: string) {
  const qs = c.bld(site, "QS1", CC.qs);
  const mr = c.area(qs, "MR", CC.qs);
  const kmg = c.bg(mr, "KMG", CC.qs, "Zeiss");
  addParts(c, kmg, CC.qs, [
    ["STE", "Zeiss"],
    ["TAST", "Zeiss"],
    ["DRV", "Zeiss"],
    ["TEM", "Testo"],
  ]);
  const rnd = c.bg(mr, "RND", CC.qs, "Mahr");
  addParts(c, rnd, CC.qs, [
    ["TAST", "Mahr"],
    ["STE", "Mahr"],
  ]);
  const hoe = c.bg(mr, "HOE", CC.qs, "Mahr");
  c.io(hoe, "STE", CC.qs, "Mahr");

  const lab = c.area(qs, "LAB", CC.qs);
  const hae = c.bg(lab, "HAE", CC.qs, "ZwickRoell");
  addParts(c, hae, CC.qs, [
    ["EIN", "ZwickRoell"],
    ["STE", "ZwickRoell"],
  ]);
  const mik = c.bg(lab, "MIK", CC.qs, "Zeiss");
  c.io(mik, "STE", CC.qs, "Zeiss");

  const wep = c.area(qs, "WEP", CC.qs);
  const waa = c.bg(wep, "WAA", CC.qs, "Mettler Toledo");
  c.io(waa, "WZ", CC.qs, "Mettler Toledo");
  c.io(waa, "STE", CC.qs, "Mettler Toledo");

  const caq = c.area(qs, "CAQ", CC.qs);
  const caqBg = c.bg(caq, "CAQ", CC.qs, "Siemens");
  addParts(c, caqBg, CC.qs, [
    ["PC", "Siemens"],
    ["SCAN", "Datalogic"],
  ]);
  addAhu(c, c.area(qs, "RLT", CC.inst), "RLT", CC.inst, 4);
}

function buildWorkshop(c: Catalog, site: string) {
  const ws = c.bld(site, "WS1", CC.mech);
  const mec = c.area(ws, "MEC", CC.mech);
  const dre = c.bg(mec, "DRE", CC.mech, "DMG MORI");
  addAxis(c, dre, "X", CC.mech, "Siemens");
  addAxis(c, dre, "Z", CC.mech, "Siemens");
  addParts(c, dre, CC.mech, [
    ["FUT", "Röhm"],
    ["NH", "Pilz"],
  ]);
  const sae = c.bg(mec, "SAE", CC.mech, "Kasto");
  addParts(c, sae, CC.mech, [
    ["MOT", "SEW-Eurodrive"],
    ["FU", "Lenze"],
    ["SEN", "ifm electronic"],
  ]);
  const boh = c.bg(mec, "BOH", CC.mech, "Ixion");
  addParts(c, boh, CC.mech, [
    ["MOT", "Siemens"],
    ["FU", "Siemens"],
    ["SEN", "ifm electronic"],
  ]);

  const elt = c.area(ws, "ELT", CC.elt);
  const prf = c.bg(elt, "PRF", CC.elt, "Gossen Metrawatt");
  addParts(c, prf, CC.elt, [
    ["MOT", "Siemens"],
    ["MESS", "Gossen Metrawatt"],
    ["NT", "Phoenix Contact"],
  ]);
  c.io(elt, "ISO", CC.elt, "Gossen Metrawatt");
  const cri = c.bg(elt, "CRI", CC.elt, "Rennsteig");
  c.io(cri, "ANT", CC.elt, "Rennsteig");

  const etl = c.area(ws, "ETL", CC.inst);
  c.io(etl, "SCAN", CC.inst, "Zebra");
  const klim = c.bg(etl, "KLI", CC.inst, "Wolf");
  addParts(c, klim, CC.inst, [
    ["TEM", "ifm electronic"],
    ["FEU", "Hekatron"],
  ]);

  const sw = c.area(ws, "SW", CC.mech);
  const mig = c.bg(sw, "MIG", CC.mech, "EWM");
  addParts(c, mig, CC.mech, [
    ["QEL", "EWM"],
    ["DRA", "EWM"],
    ["GAS", "EWM"],
  ]);
  const abs = c.bg(sw, "ABS", CC.mech, "Nederman");
  addParts(c, abs, CC.mech, [
    ["LUF", "Nederman"],
    ["MOT", "Siemens"],
    ["FIL", "Nederman"],
  ]);
  addCrane(c, c.area(ws, "KRN", CC.inst), CC.inst, "Abus Kransysteme");
}

function buildUtilities(c: Catalog, media: string) {
  const ez = c.bld(media, "EZ1", CC.inst);
  const kesA = c.area(ez, "KES", CC.inst);
  const kes = c.bg(kesA, "KES", CC.inst, "Viessmann");
  addParts(c, kes, CC.inst, [
    ["BRE", "Weishaupt"],
    ["PMP", "Grundfos"],
    ["MOT", "Siemens"],
    ["TEM", "ifm electronic"],
    ["DS", "ifm electronic"],
    ["STE", "Siemens"],
  ]);
  const hkp = c.bg(kesA, "HKP", CC.inst, "Grundfos");
  addParts(c, hkp, CC.inst, [
    ["PMP", "Grundfos"],
    ["MOT", "Siemens"],
    ["FU", "Grundfos"],
  ]);
  const nshA = c.area(ez, "NSH", CC.elt);
  const taf = c.bg(nshA, "TAF", CC.elt, "SGB");
  addParts(c, taf, CC.elt, [
    ["TEM", "Siemens"],
    ["SCH", "Siemens"],
  ]);
  addSwitchgear(c, nshA, "NSH", CC.elt);
  const usvA = c.area(ez, "USV", CC.elt);
  addUps(c, usvA, CC.elt);
  const war = c.area(ez, "WAR", CC.inst);
  const pww = c.bg(war, "PWW", CC.inst, "KSB");
  addParts(c, pww, CC.inst, [
    ["PMP", "KSB"],
    ["MOT", "Siemens"],
    ["VEN", "KSB"],
    ["TEM", "ifm electronic"],
  ]);

  const dk = c.bld(media, "DK1", CC.inst);
  const kmp = c.area(dk, "KMP", CC.inst);
  addCompressor(c, kmp, "K01", CC.inst, "Kaeser Kompressoren");
  addCompressor(c, kmp, "K02", CC.inst, "Atlas Copco");
  addCompressor(c, kmp, "K03", CC.inst, "BOGE");
  const tro = c.bg(kmp, "TRO", CC.inst, "Beko Technologies");
  addParts(c, tro, CC.inst, [
    ["KAE", "Beko Technologies"],
    ["DS", "ifm electronic"],
  ]);
  const kaeA = c.area(dk, "KAE", CC.inst);
  const kae = c.bg(kaeA, "KAE", CC.inst, "Bitzer");
  addParts(c, kae, CC.inst, [
    ["VER", "Bitzer"],
    ["MOT", "Siemens"],
    ["PMP", "Grundfos"],
    ["DS", "ifm electronic"],
    ["TEM", "ifm electronic"],
  ]);
  const rue = c.bg(kaeA, "RUE", CC.inst, "GEA");
  addParts(c, rue, CC.inst, [
    ["LUF", "GEA"],
    ["MOT", "Siemens"],
    ["FU", "Siemens"],
  ]);
  const ver = c.area(dk, "VER", CC.inst);
  const beh = c.bg(ver, "BEH", CC.inst, "Kaeser Kompressoren");
  addParts(c, beh, CC.inst, [
    ["SV", "LESER"],
    ["DS", "ifm electronic"],
    ["ENT", "Beko Technologies"],
  ]);
  const header = c.bg(ver, "NET", CC.inst, null, false);
  for (const segment of AIR_DROP_SEGMENTS) {
    addAirDrop(c, header, segment, CC.inst);
  }

  const ms = c.bld(media, "MS1", CC.elt);
  const sfa = c.area(ms, "SFA", CC.elt);
  const msBg = c.bg(sfa, "MS", CC.elt, "Siemens");
  addParts(c, msBg, CC.elt, [
    ["LS", "Siemens"],
    ["SCH", "Siemens"],
    ["WDL", "Siemens"],
    ["STE", "Siemens"],
  ]);
  const tra = c.area(ms, "TRA", CC.elt);
  const taf2 = c.bg(tra, "TAF", CC.elt, "SGB");
  addParts(c, taf2, CC.elt, [
    ["TEM", "Siemens"],
    ["BUC", "EMB"],
  ]);
}

function buildInfrastructure(c: Catalog, infra: string) {
  const vw = c.bld(infra, "VW1", CC.vw);
  addAhu(c, c.area(vw, "EG", CC.vw), "RLT", CC.inst, 4);
  addAhu(c, c.area(vw, "OG", CC.vw), "RLT", CC.inst, 2);
  const tec = c.area(vw, "TEC", CC.elt);
  addSwitchgear(c, tec, "NSH", CC.elt);
  const bma = c.bg(tec, "BMA", CC.asi, "Hekatron");
  addParts(c, bma, CC.asi, [
    ["ZEN", "Hekatron"],
    ["RAI", "Hekatron"],
  ]);
  const auf = c.bg(tec, "AUF", CC.inst, "Otis");
  addParts(c, auf, CC.inst, [
    ["ANT", "Otis"],
    ["STE", "Otis"],
    ["TUR", "Otis"],
    ["NOT", "Otis"],
  ]);

  const so = c.bld(infra, "SO1", CC.vw);
  const umk = c.area(so, "UMK", CC.vw);
  const umkRlt = c.bg(umk, "RLT", CC.inst, "Wolf");
  addParts(c, umkRlt, CC.inst, [
    ["LUF", "Wolf"],
    ["MOT", "Siemens"],
    ["FIL", "Wolf"],
  ]);
  const kan = c.area(so, "KAN", CC.vw);
  const spu = c.bg(kan, "SPU", CC.vw, "Meiko");
  addParts(c, spu, CC.vw, [
    ["PMP", "Grundfos"],
    ["HEI", "Meiko"],
    ["STE", "Meiko"],
  ]);
  const kanRlt = c.bg(kan, "RLT", CC.inst, "Wolf");
  addParts(c, kanRlt, CC.inst, [
    ["LUF", "Wolf"],
    ["MOT", "Siemens"],
    ["FIL", "Wolf"],
  ]);

  const gsl = c.bld(infra, "GSL", CC.asi);
  const lag = c.area(gsl, "LAG", CC.asi);
  const lue = c.bg(lag, "LUE", CC.asi, "Nederman");
  addParts(c, lue, CC.asi, [
    ["LUF", "Nederman"],
    ["MOT", "Siemens"],
    ["GAS", "Dräger"],
  ]);
  const aufA = c.area(gsl, "AUF", CC.asi);
  const aufB = c.bg(aufA, "WAN", CC.asi, null, false);
  addParts(c, aufB, CC.asi, [
    ["NIV", "ifm electronic"],
    ["LEK", "ifm electronic"],
  ]);

  const fw = c.bld(infra, "FW1", CC.asi);
  const fah = c.area(fw, "FAH", CC.asi);
  const tlf = c.bg(fah, "TLF", CC.asi, "Magirus");
  addParts(c, tlf, CC.asi, [
    ["PMP", "Magirus"],
    ["MOT", "Magirus"],
  ]);
  const lst = c.area(fw, "LST", CC.asi);
  const funk = c.bg(lst, "FUN", CC.asi, "Motorola");
  c.io(funk, "GER", CC.asi, "Motorola");
}

function buildLogistics(c: Catalog, logSite: string) {
  const hrl = c.bld(logSite, "HRL", CC.lag);
  for (let i = 1; i <= 4; i++) {
    const gasse = c.area(hrl, `G${pad(i)}`, CC.lag);
    addRbg(c, gasse, CC.lag);
  }
  const vor = c.area(hrl, "VOR", CC.lag);
  for (let i = 1; i <= 6; i++) {
    addConveyor(c, vor, `C${pad(i)}`, CC.lag);
  }
  const ffzA = c.area(hrl, "FFZ", CC.log);
  for (let i = 1; i <= 8; i++) {
    addForklift(c, ffzA, i, CC.log);
  }
  const lad = c.bg(ffzA, "LAD", CC.log, "Fronius");
  addParts(c, lad, CC.log, [
    ["GLE", "Fronius"],
    ["STE", "Fronius"],
  ]);
  addAhu(c, c.area(hrl, "RLT", CC.inst), "RLT", CC.inst, 4);

  const we = c.bld(logSite, "WE1", CC.log);
  const ram = c.area(we, "RAM", CC.log);
  addDoor(c, ram, "T01", CC.lag);
  addDoor(c, ram, "T02", CC.lag);
  addDoor(c, ram, "T03", CC.lag);
  const buf = c.area(we, "BUF", CC.log);
  addConveyor(c, buf, "C01", CC.log);
  const waa = c.area(we, "WAA", CC.log);
  const scale = c.bg(waa, "WAA", CC.log, "Mettler Toledo");
  addParts(c, scale, CC.log, [
    ["WZ", "Mettler Toledo"],
    ["STE", "Mettler Toledo"],
  ]);
  const scan = c.bg(waa, "SCAN", CC.log, "Datalogic");
  addParts(c, scan, CC.log, [
    ["CAM", "Datalogic"],
    ["LSCH", "Sick"],
  ]);

  const vs = c.bld(logSite, "VS1", CC.lag);
  const kom = c.area(vs, "KOM", CC.lag);
  const line = c.bg(kom, "LIN", CC.lag, "BEUMER");
  addParts(c, line, CC.lag, [
    ["MOT", "SEW-Eurodrive"],
    ["FU", "SEW-Eurodrive"],
    ["SEN", "Sick"],
    ["STE", "Siemens"],
  ]);
  const umf = c.bg(kom, "UMF", CC.lag, "Robopac");
  addParts(c, umf, CC.lag, [
    ["MOT", "SEW-Eurodrive"],
    ["HEI", "Robopac"],
    ["SEN", "Sick"],
  ]);
  const etk = c.bg(kom, "ETK", CC.lag, "Zebra");
  addParts(c, etk, CC.lag, [
    ["DRU", "Zebra"],
    ["STE", "Zebra"],
  ]);
  const vsRam = c.area(vs, "RAM", CC.lag);
  addDoor(c, vsRam, "T01", CC.lag);
  addDoor(c, vsRam, "T02", CC.lag);
  const ver = c.area(vs, "VER", CC.lag);
  const verp = c.bg(ver, "TIS", CC.lag, "Bizerba");
  addParts(c, verp, CC.lag, [
    ["WZ", "Bizerba"],
    ["STE", "Bizerba"],
  ]);

  const lg = c.bld(logSite, "LG1", CC.lag);
  const wasA = c.area(lg, "WAS", CC.lag);
  const was = c.bg(wasA, "WAS", CC.lag, "Meiko");
  addParts(c, was, CC.lag, [
    ["PMP", "Grundfos"],
    ["MOT", "Siemens"],
    ["HEI", "Meiko"],
    ["DS", "ifm electronic"],
    ["STE", "Siemens"],
  ]);
  const ste = c.area(lg, "STE", CC.lag);
  addConveyor(c, ste, "C01", CC.lag);
}

export function buildDemoPlantAssets(): PlantAsset[] {
  usedSerials.clear();
  const c = new Catalog();

  const werk = c.loc(null, "DE01", CC.inst);
  const medien = c.loc(werk, "MED", CC.inst);
  const infra = c.loc(werk, "INF", CC.vw);
  const logistik = c.loc(null, "DE02", CC.log);

  buildProduction(c, werk);
  buildAssembly(c, werk);
  buildQuality(c, werk);
  buildWorkshop(c, werk);
  buildUtilities(c, medien);
  buildInfrastructure(c, infra);
  buildLogistics(c, logistik);

  if (c.assets.length !== PLANT_ASSET_COUNT) {
    const byType = countByType(c.assets);
    throw new Error(
      `Anlagenkatalog hat ${c.assets.length} Assets, erwartet ${PLANT_ASSET_COUNT} (${JSON.stringify(byType)})`,
    );
  }
  return c.assets;
}

export function countByType(assets: readonly PlantAsset[]): Record<AssetType, number> {
  const counts: Record<AssetType, number> = {
    location: 0,
    building: 0,
    area: 0,
    assembly: 0,
    maintenance_object: 0,
  };
  for (const asset of assets) {
    counts[asset.type] += 1;
  }
  return counts;
}

function groupByDepth(assets: readonly PlantAsset[]): PlantAsset[][] {
  const byKey = new Map(assets.map((asset) => [asset.key, asset]));
  const depth = new Map<string, number>();

  function resolve(key: string, stack: Set<string>): number {
    const cached = depth.get(key);
    if (cached != null) return cached;
    if (stack.has(key)) {
      throw new Error(`Zyklus über ${key}`);
    }
    const asset = byKey.get(key);
    if (!asset) {
      throw new Error(`Eltern-Asset fehlt: ${key}`);
    }
    if (!asset.parentKey) {
      depth.set(key, 0);
      return 0;
    }
    stack.add(key);
    const value = resolve(asset.parentKey, stack) + 1;
    stack.delete(key);
    depth.set(key, value);
    return value;
  }

  let max = 0;
  for (const asset of assets) {
    max = Math.max(max, resolve(asset.key, new Set()));
  }
  const waves: PlantAsset[][] = Array.from({ length: max + 1 }, () => []);
  for (const asset of assets) {
    waves[depth.get(asset.key) ?? 0]!.push(asset);
  }
  return waves;
}

const LEGACY_DEMO_KEYS = [
  "AS-MO-01",
  "AS-ASM-01",
  "AS-AREA-01",
  "AS-BLD-01",
  "AS-LOC-01",
];

export async function seedDemoPlantAssets(
  client: Client,
  siteUid: string,
): Promise<Record<AssetType, number>> {
  const assets = buildDemoPlantAssets();

  for (const key of LEGACY_DEMO_KEYS) {
    await client.query(`DELETE FROM assets WHERE fk_site = $1 AND key = $2`, [
      siteUid,
      key,
    ]);
  }

  for (const wave of groupByDepth(assets)) {
    const result = await client.query(
      `INSERT INTO assets (
         key, fk_site, type, fk_parent, fk_cost_center, serial_number, manufacturer
       )
       SELECT
         r.key,
         $1::uuid,
         r.type,
         parent.uid,
         cc.uid,
         NULLIF(r.serial_number, ''),
         NULLIF(r.manufacturer, '')
       FROM unnest(
         $2::text[],
         $3::text[],
         $4::text[],
         $5::text[],
         $6::text[],
         $7::text[]
       ) AS r(key, type, parent_key, cost_center_key, serial_number, manufacturer)
       LEFT JOIN assets parent
         ON parent.fk_site = $1::uuid
        AND parent.key = NULLIF(r.parent_key, '')
       INNER JOIN cost_centers cc
         ON cc.fk_site = $1::uuid
        AND cc.key = r.cost_center_key
       ON CONFLICT (fk_site, key) DO UPDATE SET
         type = EXCLUDED.type,
         fk_parent = EXCLUDED.fk_parent,
         fk_cost_center = EXCLUDED.fk_cost_center,
         serial_number = EXCLUDED.serial_number,
         manufacturer = EXCLUDED.manufacturer,
         updated_at = NOW()`,
      [
        siteUid,
        wave.map((asset) => asset.key),
        wave.map((asset) => asset.type),
        wave.map((asset) => asset.parentKey ?? ""),
        wave.map((asset) => asset.costCenterKey),
        wave.map((asset) => asset.serialNumber ?? ""),
        wave.map((asset) => asset.manufacturer ?? ""),
      ],
    );
    if (result.rowCount !== wave.length) {
      throw new Error(
        `Asset-Welle unvollständig: ${result.rowCount ?? 0} von ${wave.length}`,
      );
    }
  }

  const present = await client.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n
     FROM assets
     WHERE fk_site = $1
       AND key = ANY($2::text[])`,
    [siteUid, assets.map((asset) => asset.key)],
  );
  if ((present.rows[0]?.n ?? 0) !== assets.length) {
    throw new Error(
      `Asset-Katalog unvollständig: ${present.rows[0]?.n ?? 0} von ${assets.length}`,
    );
  }

  const cycles = await client.query<{ cycles: number }>(
    `WITH RECURSIVE walk AS (
       SELECT uid, fk_parent, ARRAY[uid] AS path, FALSE AS cycle
       FROM assets
       WHERE fk_site = $1
       UNION ALL
       SELECT walk.uid, parent.fk_parent, walk.path || parent.uid, parent.uid = ANY(walk.path)
       FROM walk
       INNER JOIN assets parent ON parent.uid = walk.fk_parent
       WHERE NOT walk.cycle
     )
     SELECT COUNT(*)::int AS cycles FROM walk WHERE cycle`,
    [siteUid],
  );
  if ((cycles.rows[0]?.cycles ?? 1) !== 0) {
    throw new Error("Asset-Katalog enthält einen Eltern-Zyklus");
  }

  const violations = await client.query<{ violations: number }>(
    `WITH ranks AS (
       SELECT *
       FROM (VALUES
         ('location', 0),
         ('building', 1),
         ('area', 2),
         ('assembly', 3),
         ('maintenance_object', 4)
       ) AS r(type, rank)
     ),
     bad_parent AS (
       SELECT a.key
       FROM assets a
       LEFT JOIN assets parent ON parent.uid = a.fk_parent
       LEFT JOIN ranks child_rank ON child_rank.type = a.type
       LEFT JOIN ranks parent_rank ON parent_rank.type = parent.type
       LEFT JOIN cost_centers cc ON cc.uid = a.fk_cost_center
       WHERE a.fk_site = $1
         AND (
           (a.type <> 'location' AND a.fk_parent IS NULL)
           OR (a.fk_parent IS NOT NULL AND parent.uid IS NULL)
           OR (parent.uid IS NOT NULL AND parent.fk_site <> a.fk_site)
           OR (parent.uid IS NOT NULL AND child_rank.rank < parent_rank.rank)
           OR cc.uid IS NULL
           OR cc.fk_site <> a.fk_site
           OR (
             a.type IN ('location', 'building', 'area')
             AND (a.serial_number IS NOT NULL OR a.manufacturer IS NOT NULL)
           )
           OR (
             a.type = 'maintenance_object'
             AND (a.serial_number IS NULL OR a.manufacturer IS NULL)
           )
         )
     )
     SELECT COUNT(*)::int AS violations FROM bad_parent`,
    [siteUid],
  );
  const violationCount = violations.rows[0]?.violations ?? 1;
  if (violationCount !== 0) {
    throw new Error(`Asset-Katalog verletzt ${violationCount} Konsistenzregeln`);
  }

  return countByType(assets);
}

if (require.main === module) {
  try {
    const assets = buildDemoPlantAssets();
    console.log(JSON.stringify({ total: assets.length, ...countByType(assets) }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
