"use client";

import { useEffect, useRef, useState } from "react";

type Pattern = {
  name: string;
  points: number[][];
  quantity?: number;
  source_quantity?: number;
  source_size?: string;
  source_rotation?: string;
  source_material?: string;
  fold_required?: boolean;
  fold_edge?: "left" | "right" | null;
  fold_verified?: boolean;
  grainline_verified?: boolean;
  fold_status_verified?: boolean;
  allowed_rotations?: number[];
};
type PlacedPattern = Pattern & {
  instance: number;
  rotation: number;
  area: number;
};
type NestingResult = {
  algorithm: string;
  strategy: string;
  fabric_width: number;
  fabric_length: number;
  pattern_area: number;
  fabric_area: number;
  utilization_percent: number;
  waste_percent: number;
  placed_patterns: PlacedPattern[];
  warnings?: string[];
  constraints_enforced?: boolean;
  production_ready?: boolean;
};
type ComparisonTrial = {
  id: number;
  method: string;
  runtime_ms: number;
  layout: NestingResult;
};
type ComparisonResult = {
  version: string;
  trials_run: number;
  total_runtime_ms: number;
  baseline_id: number;
  best_trial_id: number;
  baseline_length_mm: number;
  best_length_mm: number;
  improvement_vs_input_order_percent: number;
  trials: ComparisonTrial[];
  attempts_run?: number;
  effort?: string;
  engine?: string;
  note?: string;
};
type AuditReport = {
  passed: boolean;
  production_approved: boolean;
  instances_checked: number;
  minimum_clearance_mm: number | null;
  layout_fingerprint: string | null;
  issues: string[];
  note: string;
};
type ReplayRun = {
  run: number;
  seed: number;
  best_length_mm: number;
  utilization_percent: number;
  runtime_ms: number;
  geometry_hash: string | null;
  audit_passed: boolean;
  issues: string[];
};
type ReplayReport = {
  version: string;
  input_sha256: string;
  same_seed_reproducible: boolean;
  all_geometry_audits_passed: boolean;
  production_approved: boolean;
  runs: ReplayRun[];
  best_run: number | null;
  best_layout: NestingResult | null;
  best_audit: AuditReport | null;
  total_runtime_ms: number;
  note: string;
};
type MaterialReview = {
  schema: string; source_sha256: string; source_units: string;
  manual_unit_override: boolean; pattern_count: number;
  source_material_labels: {label:string; patterns:number; labelled_quantity:number; pattern_names:string[]}[];
  reference_check: {status:string; candidate_mm?:number; independent_reference_mm?:number; absolute_difference_mm?:number};
  issues: string[]; factory_cutting_approved: false;
};
type MaterialGroup = {
  group_id:string; source_material_labels:string[]; fabric_width_mm:number;
  fabric_length_mm:number; utilization_percent:number; waste_percent:number;
  instances:number; geometry_audit:{passed:boolean; minimum_clearance_mm:number|null; layout_fingerprint:string};
  layout:NestingResult; cutting_approved:false;
};
type MaterialPreview = {
  schema:string; source_sha256:string; selected_pattern_types:number;
  selected_instances:number; group_count:number; groups:MaterialGroup[];
  warnings:string[]; production_approved:false;
};
type MaterialAssignment = {source_label:string; group_id:string; operator_confirmed:boolean};

type PresetKey = "original" | "concave" | "rotation" | "optimization";
type ActivePreset = PresetKey | "imported";
type ImportInfo = {
  file_name: string;
  source_units: string;
  source_dxf_sha256?: string;
  output_units: string;
  pattern_count: number;
  patterns: Pattern[];
  warnings: string[];
  preflight?: CadPreflight;
};
type CadSourceReview = {
  schema: string;
  source_filename: string;
  source_dxf_sha256_server_calculated: string;
  header_insunits_code: number;
  header_units: string;
  import_interpretation: string;
  imported_pattern_count: number;
  source_inventory: {
    modelspace_entity_counts: Record<string, number>;
    insert_content_entity_counts: Record<string, number>;
    layer_entity_counts: Record<string, number>;
    block_insert_counts: Record<string, number>;
    importer_skipped_entity_counts: Record<string, number>;
  };
  reference_check: {
    status: "not_provided" | "matched" | "mismatch";
    pattern_name?: string;
    imported_dimension_mm?: number;
    user_supplied_reference_mm?: number;
    absolute_difference_mm?: number;
    tolerance_mm?: number;
    note: string;
  };
  flags: {code: string; message: string}[];
  cutting_approved: false;
  note: string;
};

type CadMetadataEntity = {
  source_id: string;
  source_type: string;
  source_layer: string;
  role: string;
  preview_exportable: boolean;
};
type CadMetadataPiece = {
  pattern_index: number;
  pattern_name: string;
  block_name: string;
  insert_handle: string;
  candidate_cut_source_id: string;
  source_size_label?: string | null;
  source_quantity_label?: number | null;
  source_fold_label?: string | null;
  source_fields: Record<string, string>;
  candidate_bounds_mm: {width: number; height: number};
  entity_count: number;
  preview_exportable_count: number;
  counts_by_type: Record<string,number>;
  counts_by_layer: Record<string,number>;
  entities: CadMetadataEntity[];
};
type CadMetadataReview = {
  schema: string;
  source_sha256: string;
  source_insunits: number;
  import_interpretation: string;
  piece_count: number;
  entity_count: number;
  exportable_entity_count: number;
  unsupported_entity_count: number;
  entity_type_counts: Record<string,number>;
  pieces: CadMetadataPiece[];
  warnings: string[];
  production_approved: false;
};

type CadIssue = {level: "warning" | "error"; code: string; message: string};
type CadPreflight = {
  status: string;
  cutting_approved: boolean;
  pattern_count: number;
  candidate_area_mm2: number;
  source_units: string;
  patterns: {name: string; width_mm: number; height_mm: number; area_mm2: number; source_quantity_label?: number; source_size_label?: string; source_fold_label?: string}[];
  issues: CadIssue[];
  note: string;
};
type RefineReport = {
  version: string;
  engine: string;
  baseline_length_mm: number;
  best_length_mm: number;
  length_saved_mm: number;
  improvement_percent: number;
  candidates_checked: number;
  compaction_skipped: boolean;
  skip_reason: string | null;
  baseline_audit: AuditReport;
  best_audit: AuditReport;
  baseline_layout: NestingResult;
  best_layout: NestingResult;
  total_runtime_ms: number;
  note: string;
};
type TukaPreflight = {
  schema: string;
  source_file: string;
  source_sha256: string;
  profile: string;
  source_hints_unverified: string[];
  source_units: {header_insunits_code: number; header_name: string; interpretation: string | null; manual_override: boolean; independently_verified: false};
  candidate_pattern_count: number;
  distinct_size_labels: string[];
  labelled_quantity_sum: number | null;
  metadata_preview_exportable_entities: number | null;
  metadata_preview_unsupported_entities: number | null;
  import_readable_for_preview: boolean;
  import_failure: string | null;
  inventory: {modelspace: Record<string,number>; block_entities: Record<string,number>; layers: Record<string,number>};
  patterns: {index: number; name: string; source_size_label: string | null; source_quantity_label: number | null; bounds_mm: {width:number; height:number}}[];
  issues: {level: "blocked" | "review"; code: string; message: string}[];
  operator_checklist: {item:string; status:string}[];
  aama_astm_compliant: false;
  native_tuka_file_supported: false;
  tukamark_reimport_verified: false;
  factory_cutting_approved: false;
  notes: string;
};

type Phase13Report = {
  version: string;
  engine: string;
  baseline_length_mm: number;
  best_length_mm: number;
  improvement_percent: number;
  total_runtime_ms: number;
  best_layout: NestingResult;
  baseline_audit: AuditReport;
  best_audit: AuditReport;
  search_stats: { nfp_exact_pairs: number; nfp_fallback_pairs: number; candidate_checks: number };
  limitations: string[];
};
type Preset = {
  label: string;
  description: string;
  width: number;
  gap: number;
  patterns: Pattern[];
};

const PRESETS: Record<PresetKey, Preset> = {
  original: {
    label: "Original trouser sample",
    description: "Check backward compatibility with the first prototype.",
    width: 150,
    gap: 2,
    patterns: [
      { name: "Trouser Front", points: [[0, 0], [40, 0], [40, 80], [0, 80]] },
      { name: "Trouser Back", points: [[0, 0], [45, 0], [45, 85], [0, 85]] },
      { name: "Pocket", points: [[0, 0], [20, 0], [20, 25], [0, 25]] },
    ],
  },
  concave: {
    label: "Irregular interlocking demo",
    description: "A square fits inside the empty notch of an L-shaped piece.",
    width: 70,
    gap: 5,
    patterns: [
      {
        name: "L-shaped piece",
        points: [[0, 0], [70, 0], [70, 20], [20, 20], [20, 70], [0, 70]],
        allowed_rotations: [0],
      },
      { name: "Inner square", points: [[0, 0], [40, 0], [40, 40], [0, 40]] },
    ],
  },
  rotation: {
    label: "Rotation to fit demo",
    description: "An 80 mm wide piece rotates 90° to fit a 50 mm fabric width.",
    width: 50,
    gap: 2,
    patterns: [
      {
        name: "Long strip",
        points: [[0, 0], [80, 0], [80, 30], [0, 30]],
        allowed_rotations: [0, 90],
      },
    ],
  },
  optimization: {
    label: "Optimization comparison demo",
    description: "Five rectangles with a demonstrable shorter marker using alternative piece ordering.",
    width: 100,
    gap: 2,
    patterns: [
      { name: "Piece A", points: [[0,0],[16,0],[16,17],[0,17]] },
      { name: "Piece B", points: [[0,0],[45,0],[45,31],[0,31]] },
      { name: "Piece C", points: [[0,0],[41,0],[41,24],[0,24]] },
      { name: "Piece D", points: [[0,0],[34,0],[34,16],[0,16]] },
      { name: "Piece E", points: [[0,0],[11,0],[11,19],[0,19]] },
    ],
  },
};

const COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#2dd4bf"];
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"workspace"|"patterns"|"files"|"materials"|"optimization"|"validation"|"exports">("workspace");
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  // UI-only viewer state; never modifies nested geometry or exported DXF.
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasFocused, setCanvasFocused] = useState(false);
  const [canvasBounds, setCanvasBounds] = useState({width: 720, height: 360});
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef<{x: number; y: number; left: number; top: number} | null>(null);

  const [preset, setPreset] = useState<ActivePreset>("original");
  const [fabricWidth, setFabricWidth] = useState(PRESETS.original.width);
  const [gap, setGap] = useState(PRESETS.original.gap);
  const [strategy, setStrategy] = useState<"quick" | "balanced" | "fast">("fast");
  const [fabricMode, setFabricMode] = useState<"flat" | "folded">("flat");
  const [foldSide, setFoldSide] = useState<"left" | "right">("left");
  const [enforceConstraints, setEnforceConstraints] = useState(false);
  const [patterns, setPatterns] = useState<Pattern[]>(PRESETS.original.patterns);
  const [result, setResult] = useState<NestingResult | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [benchmark, setBenchmark] = useState<ReplayReport | null>(null);
  const [refinement, setRefinement] = useState<RefineReport | null>(null);
  const [phase13Report, setPhase13Report] = useState<Phase13Report | null>(null);
  const [geometryEffort, setGeometryEffort] = useState<"quick" | "standard" | "deep">("standard");
  const [selectedTrial, setSelectedTrial] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exportingBundle, setExportingBundle] = useState(false);
  const [bundleError, setBundleError] = useState("");
  const [unitlessUnits, setUnitlessUnits] = useState<"mm" | "cm" | "in">("mm");
  const [sourceUnitsOverride, setSourceUnitsOverride] = useState<"auto" | "mm" | "cm" | "in">("auto");
  const [importInfo, setImportInfo] = useState<ImportInfo | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [importSettings, setImportSettings] = useState<{unitless: string; override: string} | null>(null);
  const [cadReview, setCadReview] = useState<CadSourceReview | null>(null);
  const [cadReviewLoading, setCadReviewLoading] = useState(false);
  const [tukaReport, setTukaReport] = useState<TukaPreflight | null>(null);
  const [tukaLoading, setTukaLoading] = useState(false);
  const [tukaError, setTukaError] = useState("");
  const [materialReview, setMaterialReview] = useState<MaterialReview | null>(null);
  const [materialPreview, setMaterialPreview] = useState<MaterialPreview | null>(null);
  const [materialAssignments, setMaterialAssignments] = useState<MaterialAssignment[]>([]);
  const [materialWidths, setMaterialWidths] = useState<Record<string,string>>({});
  const [materialLoading, setMaterialLoading] = useState(false);
  const [materialError, setMaterialError] = useState("");
  const [selectedMaterialGroup, setSelectedMaterialGroup] = useState("");
  const [cadMetadata, setCadMetadata] = useState<CadMetadataReview | null>(null);
  const [cadMetadataError, setCadMetadataError] = useState("");
  const [cadMetadataLoading, setCadMetadataLoading] = useState(false);
  const [cadMetadataExporting, setCadMetadataExporting] = useState(false);
  const [cadAwareExporting, setCadAwareExporting] = useState(false);
  const [cadAwareError, setCadAwareError] = useState("");
  const [cadReviewError, setCadReviewError] = useState("");
  const [referencePatternIndex, setReferencePatternIndex] = useState(1);
  const [referenceAxis, setReferenceAxis] = useState<"width" | "height">("width");
  const [referenceMeasurement, setReferenceMeasurement] = useState("");


  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setCanvasFocused(false);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  useEffect(() => {
    if (activeTab !== "workspace") return;
    const viewport = canvasViewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const {width, height} = viewport.getBoundingClientRect();
      setCanvasBounds((last) => {
        const w = Math.max(160, Math.round(width));
        const h = Math.max(160, Math.round(height));
        return last.width === w && last.height === h ? last : {width: w, height: h};
      });
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(viewport);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [activeTab, canvasFocused, result]);

  function zoomCanvas(step: number) {
    setCanvasZoom((zoom) => Math.max(0.5, Math.min(3, Math.round((zoom + step) * 100) / 100)));
  }

  function fitCanvas() {
    setCanvasZoom(1);
    if (canvasViewportRef.current) {
      canvasViewportRef.current.scrollLeft = 0;
      canvasViewportRef.current.scrollTop = 0;
    }
  }

  function onCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const target = event.currentTarget;
    panStartRef.current = {x: event.clientX, y: event.clientY, left: target.scrollLeft, top: target.scrollTop};
    target.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const start = panStartRef.current;
    if (!start) return;
    event.currentTarget.scrollLeft = start.left - (event.clientX - start.x);
    event.currentTarget.scrollTop = start.top - (event.clientY - start.y);
  }

  function onCanvasPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    panStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function choosePreset(next: PresetKey) {
    const sample = PRESETS[next];
    setPreset(next);
    setImportInfo(null);
    setSourceFile(null); setImportSettings(null); setCadReview(null); setCadReviewError(""); setCadMetadata(null); setCadMetadataError(""); setTukaReport(null); setTukaError(""); setMaterialReview(null); setMaterialPreview(null); setMaterialAssignments([]); setMaterialError("");
    setFabricMode("flat");
    setEnforceConstraints(false);
    setFabricWidth(sample.width);
    setGap(sample.gap);
    setPatterns(sample.patterns);
    setResult(null);
    setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null);
    setSelectedTrial(null);
    setError("");
  }

  async function uploadDxf(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    setSourceFile(null); setImportSettings(null); setCadReview(null); setCadReviewError(""); setCadMetadata(null); setCadMetadataError(""); setTukaReport(null); setTukaError(""); setMaterialReview(null); setMaterialPreview(null); setMaterialAssignments([]); setMaterialError("");
    setReferenceMeasurement(""); setReferencePatternIndex(1);
    setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null);
    setSelectedTrial(null);
    try {
      if (file.size > 6 * 1024 * 1024) {
        throw new Error("DXF file must be 6 MB or smaller.");
      }
      const data = new FormData();
      data.append("file", file);
      data.append("unitless_units", unitlessUnits);
      data.append("source_units_override", sourceUnitsOverride);
      const response = await fetch(`${API_BASE}/api/patterns/import-dxf`, {
        method: "POST",
        body: data,
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const detail = (payload as { detail?: unknown }).detail;
        throw new Error(typeof detail === "string" ? detail : "DXF import failed.");
      }
      const imported = payload as ImportInfo;
      // Select all imported patterns. Each is previewed once until quantities are verified.
      setPatterns(imported.patterns.map((piece) => ({ ...piece, quantity: 1 })));
      const widest = Math.max(...imported.patterns.map((piece) => {
        const xs = piece.points.map((xy) => xy[0]);
        return Math.max(...xs) - Math.min(...xs);
      }));
      setFabricWidth(Math.max(1500, Math.ceil((widest + 30) / 50) * 50));
      setImportInfo(imported);
      setSourceFile(file);
      setImportSettings({unitless: unitlessUnits, override: sourceUnitsOverride});
      setPreset("imported");
      setResult(null);
      setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null);
      setSelectedTrial(null);
      setEnforceConstraints(false);
      setFabricMode("flat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "DXF import failed.");
    } finally {
      setUploading(false);
    }
  }

  async function runCadSourceReview() {
    if (!sourceFile || !importInfo || !importSettings || cadReviewLoading) return;
    setCadReviewLoading(true);
    setCadReviewError("");
    setCadReview(null);
    try {
      const data = new FormData();
      data.append("file", sourceFile);
      data.append("unitless_units", importSettings.unitless);
      data.append("source_units_override", importSettings.override);
      const entered = referenceMeasurement.trim();
      if (entered) {
        const measured = Number(entered);
        if (!Number.isFinite(measured) || measured <= 0 || measured >= 20000)
          throw new Error("Source reference measurement must be between 0 and 20,000 mm.");
        data.append("reference_pattern_index", String(referencePatternIndex));
        data.append("reference_axis", referenceAxis);
        data.append("reference_mm", String(measured));
      }
      const response = await fetch(`${API_BASE}/api/cad/source-audit`, {method: "POST", body: data});
      const payload: unknown = await response.json();
      if (!response.ok) {
        const detail = (payload as {detail?: unknown}).detail;
        throw new Error(typeof detail === "string" ? detail : "CAD source audit failed.");
      }
      const report = payload as CadSourceReview;
      if (report.source_dxf_sha256_server_calculated !== importInfo.source_dxf_sha256)
        throw new Error("File checksum changed since import. Re-import the original DXF.");
      setCadReview(report);
    } catch (err) {
      setCadReviewError(err instanceof Error ? err.message : "Could not inspect source CAD.");
    } finally {
      setCadReviewLoading(false);
    }
  }

  function saveCadReview() {
    if (!cadReview) return;
    const blob = new Blob([JSON.stringify(cadReview, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "AutoNester_Phase10_CAD_SOURCE_REVIEW_NOT_FOR_CUTTING.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }


  async function runTukaPreflight() {
    if (!sourceFile || !importInfo || !importSettings || tukaLoading) return;
    setTukaLoading(true);
    setTukaError("");
    setTukaReport(null);
    try {
      const form = new FormData();
      form.append("file", sourceFile);
      form.append("unitless_units", importSettings.unitless);
      form.append("source_units_override", importSettings.override);
      const response = await fetch(`${API_BASE}/api/cad/tuka-compatibility-preflight`, {method: "POST", body: form});
      const payload: unknown = await response.json();
      if (!response.ok) {
        const detail = (payload as {detail?: unknown}).detail;
        throw new Error(typeof detail === "string" ? detail : "TUKAcad DXF preflight failed.");
      }
      const report = payload as TukaPreflight;
      if (report.source_sha256 !== importInfo.source_dxf_sha256)
        throw new Error("Source checksum mismatch. Please re-import the original DXF.");
      setTukaReport(report);
    } catch (err) {
      setTukaError(err instanceof Error ? err.message : "TUKAcad preflight failed.");
    } finally {
      setTukaLoading(false);
    }
  }

  function downloadTukaPreflight() {
    if (!tukaReport) return;
    const blob = new Blob([JSON.stringify(tukaReport, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "AutoNester_Phase14_TUKACAD_PREFLIGHT_NOT_FOR_CUTTING.json";
    document.body.appendChild(a);
    a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function runMetadataInspection() {
    if (!sourceFile || !importInfo || !importSettings || cadMetadataLoading) return;
    setCadMetadataLoading(true);
    setCadMetadataError("");
    setCadMetadata(null);
    try {
      const form = new FormData();
      form.append("file", sourceFile);
      form.append("unitless_units", importSettings.unitless);
      form.append("source_units_override", importSettings.override);
      const resp = await fetch(`${API_BASE}/api/cad/metadata-inspect`, {method: "POST", body: form});
      const payload: unknown = await resp.json();
      if (!resp.ok) {
        const detail = (payload as {detail?: unknown}).detail;
        throw new Error(typeof detail === "string" ? detail : "Metadata inspection failed.");
      }
      const report = payload as CadMetadataReview;
      if (report.source_sha256 !== importInfo.source_dxf_sha256)
        throw new Error("Source file checksum mismatch. Please re-import the DXF.");
      setCadMetadata(report);
    } catch (err) {
      setCadMetadataError(err instanceof Error ? err.message : "Metadata inspection failed.");
    } finally {
      setCadMetadataLoading(false);
    }
  }

  function downloadCadMetadataJson() {
    if (!cadMetadata) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(cadMetadata, null, 2)], {type: "application/json"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = "AutoNester_Phase11_CAD_METADATA_INSPECTION_NOT_FOR_CUTTING.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function exportMetadataPreview() {
    if (!sourceFile || !importSettings || !cadMetadata || cadMetadataExporting) return;
    setCadMetadataError("");
    setCadMetadataExporting(true);
    try {
      const form = new FormData();
      form.append("file", sourceFile);
      form.append("unitless_units", importSettings.unitless);
      form.append("source_units_override", importSettings.override);
      const response = await fetch(`${API_BASE}/api/cad/metadata-preview-bundle`, {method:"POST",body:form});
      if (!response.ok) {
        const body: unknown = await response.json();
        const detail = (body as {detail?: unknown}).detail;
        throw new Error(typeof detail === "string" ? detail : "Preview bundle creation failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "AutoNester_PHASE11_CAD_METADATA_PREVIEW_NOT_FOR_CUTTING.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      setCadMetadataError(err instanceof Error ? err.message : "Metadata preview export failed.");
    } finally {
      setCadMetadataExporting(false);
    }
  }

  async function runMaterialReview() {
    if (!sourceFile || !importSettings || !importInfo) return;
    setMaterialLoading(true); setMaterialError(""); setMaterialPreview(null);
    try {
      const body = new FormData();
      body.append("file", sourceFile);
      body.append("unitless_units", importSettings.unitless);
      body.append("source_units_override", importSettings.override);
      const resp = await fetch(`${API_BASE}/api/cad/material-review`, {method:"POST", body});
      const payload = await resp.json();
      if (!resp.ok) throw new Error(typeof payload.detail === "string" ? payload.detail : "Material review failed");
      const report = payload as MaterialReview;
      if (report.source_sha256 !== importInfo.source_dxf_sha256) throw new Error("DXF checksum mismatch; import the original file again.");
      setMaterialReview(report);
      setMaterialAssignments(report.source_material_labels.map(item => ({source_label:item.label, group_id:"", operator_confirmed:false})));
      setMaterialWidths({});
    } catch (e) { setMaterialError(e instanceof Error ? e.message : "Material review failed."); }
    finally { setMaterialLoading(false); }
  }

  async function generateMaterialPreviews() {
    if (!sourceFile || !importSettings || !importInfo || !materialReview) return;
    setMaterialLoading(true); setMaterialError(""); setMaterialPreview(null);
    try {
      const selectedLabels = new Set(patterns.map(piece => piece.source_material?.trim() || "UNLABELED"));
      const selectedAssignments = materialAssignments.filter(item => selectedLabels.has(item.source_label));
      if (selectedAssignments.some(a => !a.operator_confirmed || !a.group_id.trim()))
        throw new Error("Confirm and name every selected material code using the original CAD before generating previews.");
      const groupIds = new Set(selectedAssignments.map(a => a.group_id.trim()));
      const widths:Record<string,number> = {};
      for (const id of groupIds) {
        const value = materialWidths[id]?.trim();
        if (value) widths[id] = Number(value);
      }
      const form = new FormData();
      form.append("file", sourceFile);
      form.append("unitless_units", importSettings.unitless);
      form.append("source_units_override", importSettings.override);
      form.append("selected_patterns_json", JSON.stringify(patterns.map(p => ({name:p.name, quantity:p.quantity??1}))));
      form.append("assignments_json", JSON.stringify(selectedAssignments.map(a => ({...a,group_id:a.group_id.trim()}))));
      form.append("fabric_width",String(fabricWidth)); form.append("gap",String(gap));
      form.append("group_widths_json",JSON.stringify(widths));
      const resp = await fetch(`${API_BASE}/api/nesting/material-preview`, {method:"POST", body:form});
      const payload = await resp.json();
      if (!resp.ok) throw new Error(typeof payload.detail === "string" ? payload.detail : "Material grouping failed");
      const report = payload as MaterialPreview;
      if (report.source_sha256 !== importInfo.source_dxf_sha256) throw new Error("Source DXF changed since import.");
      if (!report.groups.every(g => g.geometry_audit.passed)) throw new Error("A material geometry audit failed.");
      setMaterialPreview(report); setSelectedMaterialGroup(report.groups[0]?.group_id??"");
    } catch (e) { setMaterialError(e instanceof Error ? e.message : "Material preview failed."); }
    finally { setMaterialLoading(false); }
  }

  function downloadMaterialReview() {
    const report = materialPreview || materialReview;
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"}));
    const a = document.createElement("a"); a.href=url; a.download="AutoNester_Phase15_MATERIAL_PREVIEW_NOT_FOR_CUTTING.json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  async function generateNesting() {
    setLoading(true);
    setError("");
    setResult(null);
    setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null);
    setSelectedTrial(null);
    try {
      const response = await fetch(`${API_BASE}/api/nesting/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fabric_width: fabricWidth, gap, strategy, patterns,
          fabric_mode: fabricMode, fabric_fold_side: foldSide, enforce_constraints: enforceConstraints
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const details = data as { detail?: unknown };
        throw new Error(typeof details.detail === "string" ? details.detail : "Nesting failed. Check API input.");
      }
      setResult(data as NestingResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot contact the nesting backend.");
    } finally {
      setLoading(false);
    }
  }

  async function compareLayouts() {
    setLoading(true);
    setError("");
    setResult(null);
    setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null);
    setSelectedTrial(null);
    try {
      const response = await fetch(`${API_BASE}/api/nesting/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fabric_width: fabricWidth, gap, patterns, max_trials: 7,
          fabric_mode: fabricMode, fabric_fold_side: foldSide,
          enforce_constraints: enforceConstraints,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const detail = (data as { detail?: unknown }).detail;
        throw new Error(typeof detail === "string" ? detail : "Layout comparison failed.");
      }
      const resultSet = data as ComparisonResult;
      const best = resultSet.trials.find((trial) => trial.id === resultSet.best_trial_id);
      if (!best) throw new Error("No winning layout returned by API.");
      setComparison(resultSet);
      setSelectedTrial(best.id);
      setResult(best.layout);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot compare nesting layouts.");
    } finally {
      setLoading(false);
    }
  }

  async function runGeometricOptimization() {
    setLoading(true);
    setError("");
    setResult(null);
    setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null);
    setSelectedTrial(null);
    try {
      const response = await fetch(`${API_BASE}/api/nesting/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fabric_width: fabricWidth, gap, patterns, effort: geometryEffort, seed: 42,
          fabric_mode: fabricMode, fabric_fold_side: foldSide,
          enforce_constraints: enforceConstraints,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const detail = (data as { detail?: unknown }).detail;
        throw new Error(typeof detail === "string" ? detail : "Geometric optimization failed.");
      }
      const resultSet = data as ComparisonResult;
      const best = resultSet.trials.find((trial) => trial.id === resultSet.best_trial_id);
      if (!best) throw new Error("No winning geometric layout returned.");
      setComparison(resultSet);
      setSelectedTrial(best.id);
      setResult(best.layout);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot contact geometry optimizer.");
    } finally {
      setLoading(false);
    }
  }

  async function runPhase13() {
    setLoading(true);
    setError("");
    setPhase13Report(null);
    setComparison(null); setBenchmark(null); setRefinement(null);
    setSelectedTrial(null);
    try {
      const response = await fetch(`${API_BASE}/api/nesting/optimize-nfp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fabric_width: fabricWidth, gap, patterns,
          effort: geometryEffort, seed: 42, fabric_mode: fabricMode,
          fabric_fold_side: foldSide, enforce_constraints: enforceConstraints }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const detail = (payload as { detail?: unknown }).detail;
        throw new Error(typeof detail === "string" ? detail : "Phase 13 optimizer failed.");
      }
      const report = payload as Phase13Report;
      if (!report.best_audit.passed || !report.baseline_audit.passed)
        throw new Error("Phase 13 result failed independent geometry audit.");
      setPhase13Report(report);
      setResult(report.best_layout);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot contact Phase 13 optimizer.");
    } finally { setLoading(false); }
  }

  async function runBenchmark() {
    setLoading(true);
    setError("");
    setBenchmark(null); setRefinement(null);
    setComparison(null); setPhase13Report(null);
    setSelectedTrial(null);
    try {
      const response = await fetch(`${API_BASE}/api/nesting/benchmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fabric_width: fabricWidth, gap, patterns,
          effort: geometryEffort, seed: 42,
          fabric_mode: fabricMode, fabric_fold_side: foldSide,
          enforce_constraints: enforceConstraints,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const detail = (data as { detail?: unknown }).detail;
        throw new Error(typeof detail === "string" ? detail : "Benchmark failed.");
      }
      const report = data as ReplayReport;
      setBenchmark(report);
      setResult(report.best_layout);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Cannot run geometry audit.");
    } finally {
      setLoading(false);
    }
  }

  async function runRefinement() {
    setLoading(true);
    setError("");
    setRefinement(null);
    setComparison(null);
    setBenchmark(null);
    setResult(null);
    setSelectedTrial(null);
    try {
      const response = await fetch(`${API_BASE}/api/nesting/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fabric_width: fabricWidth, gap, patterns,
          effort: geometryEffort, seed: 42,
          fabric_mode: fabricMode, fabric_fold_side: foldSide,
          enforce_constraints: enforceConstraints,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const detail = (data as { detail?: unknown }).detail;
        throw new Error(typeof detail === "string" ? detail : "Phase 8 refinement failed.");
      }
      const report = data as RefineReport;
      setRefinement(report);
      setResult(report.best_layout);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot refine marker geometry.");
    } finally {
      setLoading(false);
    }
  }

  function viewTrial(trial: ComparisonTrial) {
    setSelectedTrial(trial.id);
    setResult(trial.layout);
  }

  function updateSelected(name: string, patch: Partial<Pattern>) {
    setMaterialPreview(null);
    setPatterns((prev) => prev.map((p) => p.name === name ? { ...p, ...patch } : p));
    setResult(null);
    setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null);
    setSelectedTrial(null);
  }

  function useCadQuantities() {
    setMaterialPreview(null);
    setPatterns((prev) => prev.map((p) => ({
      ...p, quantity: Number.isInteger(p.source_quantity) && (p.source_quantity ?? 0) > 0
        ? Math.min(60, p.source_quantity!) : 1
    })));
    setResult(null);
    setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null);
    setSelectedTrial(null);
  }

  async function exportAuditedPreviewBundle() {
    if (!result || exportingBundle) return;
    setExportingBundle(true);
    setBundleError("");
    try {
      const response = await fetch(`${API_BASE}/api/nesting/export-preview-bundle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fabric_width: fabricWidth, gap, patterns,
          strategy, fabric_mode: fabricMode, fabric_fold_side: foldSide,
          enforce_constraints: enforceConstraints,
          layout: result,
          source_file_name: preset === "imported" ? importInfo?.file_name : undefined,
          source_dxf_sha256: preset === "imported" ? importInfo?.source_dxf_sha256 : undefined,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload.detail === "string" ? payload.detail : "Preview export failed geometry audit.");
      }
      const bytes = await response.blob();
      const url = URL.createObjectURL(bytes);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "AutoNester_PHASE9_PREVIEW_NOT_FOR_CUTTING.zip";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2500);
    } catch (err) {
      setBundleError(err instanceof Error ? err.message : "Could not export preview bundle.");
    } finally {
      setExportingBundle(false);
    }
  }

  async function exportCadAwareNestedPreview() {
    if (!sourceFile || !importSettings || preset !== "imported" || !result || cadAwareExporting) return;
    setCadAwareExporting(true);
    setCadAwareError("");
    try {
      const form = new FormData();
      form.append("file", sourceFile);
      form.append("unitless_units", importSettings.unitless);
      form.append("source_units_override", importSettings.override);
      form.append("selected_patterns_json", JSON.stringify(patterns.map((p) => ({
        name: p.name, quantity: p.quantity ?? 1, allowed_rotations: p.allowed_rotations ?? [0]
      }))));
      form.append("layout_json", JSON.stringify(result));
      form.append("fabric_width", String(fabricWidth));
      form.append("gap", String(gap));
      form.append("fabric_mode", fabricMode);
      form.append("enforce_constraints", String(enforceConstraints));
      const response = await fetch(`${API_BASE}/api/cad/export-nested-metadata-preview`, {
        method: "POST", body: form
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(typeof payload.detail === "string"
          ? payload.detail : "CAD-aware export failed source geometry validation.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "AutoNester_PHASE12_NESTED_CAD_PREVIEW_NOT_FOR_CUTTING.zip";
      document.body.appendChild(link);
      link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2500);
    } catch (err) {
      setCadAwareError(err instanceof Error ? err.message : "CAD-aware export failed.");
    } finally {
      setCadAwareExporting(false);
    }
  }

  function exportSvg() {
    const element = document.getElementById("nesting-svg");
    if (!element) return;
    const content = new XMLSerializer().serializeToString(element);
    const file = new Blob([content], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "autonester-layout.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // Viewer-only fit factor. Uses both available width and height without changing geometric units.
  const scale = result
    ? Math.min((canvasBounds.width - 18) / result.fabric_width, (canvasBounds.height - 18) / Math.max(result.fabric_length, 1))
    : 1;
  const pieceCount = patterns.reduce((count, p) => count + (p.quantity ?? 1), 0);


  return (
    <main id="an-app" className="an-app">
      <aside className="an-sidebar" aria-label="Application navigation">
        <div className="an-brand"><span className="an-brand-symbol"><NavIcon name="layout" /></span><div><strong>Auto<span>Nester</span></strong><small>Garment nesting studio</small></div></div>
        <p className="an-sidebar-label">WORKSPACE</p>
        <nav className="an-nav">          <button type="button" className={`an-nav-item ${activeTab === "workspace" ? "active" : ""}`} onClick={() => setActiveTab("workspace")} aria-current={activeTab === "workspace" ? "page" : undefined}><NavIcon name="layout"/><span>Workspace</span>{activeTab === "workspace" && <span className="an-nav-indicator"/>}</button>
          <button type="button" className={`an-nav-item ${activeTab === "patterns" ? "active" : ""}`} onClick={() => setActiveTab("patterns")} aria-current={activeTab === "patterns" ? "page" : undefined}><NavIcon name="grid"/><span>Patterns</span>{activeTab === "patterns" && <span className="an-nav-indicator"/>}</button>
          <button type="button" className={`an-nav-item ${activeTab === "files" ? "active" : ""}`} onClick={() => setActiveTab("files")} aria-current={activeTab === "files" ? "page" : undefined}><NavIcon name="file"/><span>CAD Files</span>{activeTab === "files" && <span className="an-nav-indicator"/>}</button>
          <button type="button" className={`an-nav-item ${activeTab === "materials" ? "active" : ""}`} onClick={() => setActiveTab("materials")} aria-current={activeTab === "materials" ? "page" : undefined}><NavIcon name="layers"/><span>Materials</span>{activeTab === "materials" && <span className="an-nav-indicator"/>}</button>
          <button type="button" className={`an-nav-item ${activeTab === "optimization" ? "active" : ""}`} onClick={() => setActiveTab("optimization")} aria-current={activeTab === "optimization" ? "page" : undefined}><NavIcon name="spark"/><span>Optimization</span>{activeTab === "optimization" && <span className="an-nav-indicator"/>}</button>
          <button type="button" className={`an-nav-item ${activeTab === "validation" ? "active" : ""}`} onClick={() => setActiveTab("validation")} aria-current={activeTab === "validation" ? "page" : undefined}><NavIcon name="shield"/><span>Validation</span>{activeTab === "validation" && <span className="an-nav-indicator"/>}</button>
          <button type="button" className={`an-nav-item ${activeTab === "exports" ? "active" : ""}`} onClick={() => setActiveTab("exports")} aria-current={activeTab === "exports" ? "page" : undefined}><NavIcon name="download"/><span>Exports</span>{activeTab === "exports" && <span className="an-nav-indicator"/>}</button></nav>
        <div className="an-sidebar-bottom"><span className="an-status-dot"/> Development preview <small>v0.15 · Not for cutting</small></div>
      </aside>
      <div className="an-main">
        <header className="an-topbar">
          <div className="min-w-0"><div className="an-breadcrumb">AutoNester <span> / </span> {activeTab === "files" ? "CAD Files" : activeTab === "materials" ? "Materials" : activeTab === "patterns" ? "Patterns" : activeTab === "optimization" ? "Optimization" : activeTab === "validation" ? "Validation" : activeTab === "exports" ? "Exports" : "Workspace"}</div>
            <h1>{activeTab === "files" ? "CAD file center" : activeTab === "materials" ? "Material-aware preview" : activeTab === "patterns" ? "Pattern manager" : activeTab === "optimization" ? "Optimization lab" : activeTab === "validation" ? "Validation & audit" : activeTab === "exports" ? "Exports & reports" : "Nesting workspace"}</h1>
            <p className="an-top-subtitle">{preset === "imported" ? importInfo?.file_name : PRESETS[preset].label} <span className="px-2">·</span> {pieceCount} selected instances</p>
          </div>
          <div className="an-top-actions">
            <span className="an-version">Prototype v0.15</span>
            <button type="button" className="an-outline-action" onClick={() => setActiveTab("files")}><NavIcon name="file"/> Import DXF</button>
            <button type="button" className="an-primary-action" onClick={async () => {setActiveTab("workspace"); await generateNesting();}} disabled={loading || patterns.length===0 || fabricWidth<=0 || gap<0}><NavIcon name="spark"/> {loading ? "Working..." : "Generate Nesting"}</button>
          </div>
        </header>
        <nav className="an-mobile-nav" aria-label="Sections">          <button type="button" className={`an-nav-item ${activeTab === "workspace" ? "active" : ""}`} onClick={() => setActiveTab("workspace")} aria-current={activeTab === "workspace" ? "page" : undefined}><NavIcon name="layout"/><span>Workspace</span>{activeTab === "workspace" && <span className="an-nav-indicator"/>}</button>
          <button type="button" className={`an-nav-item ${activeTab === "patterns" ? "active" : ""}`} onClick={() => setActiveTab("patterns")} aria-current={activeTab === "patterns" ? "page" : undefined}><NavIcon name="grid"/><span>Patterns</span>{activeTab === "patterns" && <span className="an-nav-indicator"/>}</button>
          <button type="button" className={`an-nav-item ${activeTab === "files" ? "active" : ""}`} onClick={() => setActiveTab("files")} aria-current={activeTab === "files" ? "page" : undefined}><NavIcon name="file"/><span>CAD Files</span>{activeTab === "files" && <span className="an-nav-indicator"/>}</button>
          <button type="button" className={`an-nav-item ${activeTab === "materials" ? "active" : ""}`} onClick={() => setActiveTab("materials")} aria-current={activeTab === "materials" ? "page" : undefined}><NavIcon name="layers"/><span>Materials</span>{activeTab === "materials" && <span className="an-nav-indicator"/>}</button>
          <button type="button" className={`an-nav-item ${activeTab === "optimization" ? "active" : ""}`} onClick={() => setActiveTab("optimization")} aria-current={activeTab === "optimization" ? "page" : undefined}><NavIcon name="spark"/><span>Optimization</span>{activeTab === "optimization" && <span className="an-nav-indicator"/>}</button>
          <button type="button" className={`an-nav-item ${activeTab === "validation" ? "active" : ""}`} onClick={() => setActiveTab("validation")} aria-current={activeTab === "validation" ? "page" : undefined}><NavIcon name="shield"/><span>Validation</span>{activeTab === "validation" && <span className="an-nav-indicator"/>}</button>
          <button type="button" className={`an-nav-item ${activeTab === "exports" ? "active" : ""}`} onClick={() => setActiveTab("exports")} aria-current={activeTab === "exports" ? "page" : undefined}><NavIcon name="download"/><span>Exports</span>{activeTab === "exports" && <span className="an-nav-indicator"/>}</button></nav>
        <div className="an-content">
          <div className="an-overview-line"><span className="an-overline">WORKSPACE OVERVIEW</span><span className="an-soft-pill"><span className="an-status-dot"/> {result ? "Layout generated" : "Ready for patterns"}</span></div>
          <section className="an-kpis" aria-label="Key nesting metrics">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Utilization", value: result ? `${result.utilization_percent}%` : "—" },
              { label: "Waste", value: result ? `${result.waste_percent}%` : "—" },
              { label: "Fabric length", value: result ? `${result.fabric_length} mm` : "—" },
              { label: "Pieces placed", value: result ? String(result.placed_patterns.length) : "—" },
            ].map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                <p className="text-xs text-slate-400">{metric.label}</p>
                <p className="mt-2 text-xl font-semibold">{metric.value}</p>
              </div>
            ))}
          </div>

          </section>
          {error && <div role="alert" className="an-global-error">{error}</div>}
          {activeTab === "workspace" && <section className="an-workspace">
            <div className="an-workspace-settings an-internal-scroll">
              <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <div className="an-section-heading"><div><span className="an-overline">01 · SETUP</span><h2 className="mb-4 text-sm font-semibold">Nesting configuration</h2></div><NavIcon name="settings" /></div>
            <h2 className="mb-4 text-sm font-semibold">Nesting Configuration</h2>
            <label htmlFor="demo" className="mb-2 block text-xs text-slate-400">Demo pattern set</label>
            <select
              id="demo"
              value={preset}
              onChange={(e) => choosePreset(e.target.value as PresetKey)}
              className="mb-3 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-3 text-sm outline-none focus:border-sky-500"
            >
              {(Object.keys(PRESETS) as PresetKey[]).map((key) => <option key={key} value={key}>{PRESETS[key].label}</option>)}
              {preset === "imported" && <option value="imported">Imported DXF: {importInfo?.file_name ?? "Pattern file"}</option>}
            </select>
            <p className="mb-5 text-xs leading-5 text-slate-400">{preset === "imported" ? "Imported DXF outer contour preview. Fold and grainline data need source CAD validation." : PRESETS[preset].description}</p>

            <label htmlFor="width" className="mb-2 block text-xs text-slate-400">Fabric width (mm)</label>
            <input id="width" type="number" min={1} value={fabricWidth} onChange={(e) => { setFabricWidth(Number(e.target.value)); setMaterialPreview(null); setResult(null); setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null); setSelectedTrial(null); }}
              className="mb-5 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-3 text-sm outline-none focus:border-sky-500" />

            <label htmlFor="gap" className="mb-2 block text-xs text-slate-400">Minimum pattern gap (mm)</label>
            <input id="gap" type="number" min={0} value={gap} onChange={(e) => { setGap(Number(e.target.value)); setMaterialPreview(null); setResult(null); setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null); setSelectedTrial(null); }}
              className="mb-5 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-3 text-sm outline-none focus:border-sky-500" />

            <label htmlFor="strategy" className="mb-2 block text-xs text-slate-400">Search strategy</label>
            <select id="strategy" value={strategy} onChange={(e) => { setStrategy(e.target.value as "quick" | "balanced" | "fast"); setResult(null); setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null); setSelectedTrial(null); }}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-3 text-sm outline-none focus:border-sky-500">
              <option value="fast">Fast — bounded geometric search</option>
              <option value="balanced">Balanced — multiple ordering trials</option>
              <option value="quick">Quick (input order)</option>
            </select>

            <details className="an-advanced mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3" open={showAdvancedSettings} onToggle={(e) => setShowAdvancedSettings(e.currentTarget.open)}>
              <summary className="cursor-pointer text-sm font-semibold">Fabric & cutting constraints</summary>
              <div className="mt-3 space-y-3">

              <label className="block text-xs text-slate-400">Fabric arrangement</label>
              <select value={fabricMode} onChange={(e) => { setFabricMode(e.target.value as "flat" | "folded"); setResult(null); setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null); setSelectedTrial(null); }}
                className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs">
                <option value="flat">Flat fabric — preview</option>
                <option value="folded">Folded fabric — verified fold side</option>
              </select>
              {fabricMode === "folded" && <>
                <label className="block text-xs text-slate-400">Fold edge of usable fabric width</label>
                <select value={foldSide} onChange={(e) => { setFoldSide(e.target.value as "left" | "right"); setResult(null); setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null); setSelectedTrial(null); }}
                  className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs">
                  <option value="left">Left edge</option><option value="right">Right edge</option>
                </select>
              </>}
              <label className="flex items-start gap-2 text-xs leading-5 text-amber-100">
                <input type="checkbox" checked={enforceConstraints} onChange={(e) => { setEnforceConstraints(e.target.checked); setResult(null); setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null); setSelectedTrial(null); }} className="mt-1 accent-sky-400" />
                Enforce verified grainline & fold constraints. Any unverified piece must be rejected.
              </label>
              <p className="text-[11px] leading-4 text-amber-200/70">Preview mode does NOT enforce fold/grainline. Verification mode still does NOT certify the layout for cutting.</p>
              </div>
            </details>

            <button onClick={generateNesting} disabled={loading || fabricWidth <= 0 || gap < 0 || patterns.length === 0}
              className="mt-6 w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50">
              {loading ? "Optimizing..." : "Generate Nesting"}
            </button>

                <button type="button" className="an-inline-link" onClick={() => setActiveTab("optimization")}>Open advanced optimization <span aria-hidden="true">→</span></button>
              </section>
              <div className="an-info-note"><strong>CAD integrity matters</strong><p>Only verified geometry and cutting constraints should be used for manufacturing. Every export is a diagnostic preview.</p></div>
            </div>
            <div className="an-workspace-canvas">
          <section className={`an-canvas-card an-canvas-v21 ${canvasFocused ? "an-canvas-focused" : ""}`} aria-label="Nesting layout viewer">
            <div className="an-canvas-header">
              <div className="an-canvas-header-title">
                <h2>Nesting layout</h2>
                <p>{result ? `${result.placed_patterns.length} pieces · ${result.fabric_width} mm fabric width` : "Fabric placement preview"} · Diagnostic only</p>
              </div>
              <div className="an-canvas-tools" role="group" aria-label="Canvas display controls">
                {result && <>
                  <button type="button" onClick={() => zoomCanvas(-0.25)} disabled={canvasZoom <= 0.5} aria-label="Zoom out" title="Zoom out">−</button>
                  <output aria-live="polite" className="an-canvas-zoom">{Math.round(canvasZoom * 100)}%</output>
                  <button type="button" onClick={() => zoomCanvas(0.25)} disabled={canvasZoom >= 3} aria-label="Zoom in" title="Zoom in">+</button>
                  <button type="button" className="an-canvas-fit" onClick={fitCanvas} title="Fit to width">Fit</button>
                </>}
                <button type="button" className="an-canvas-focus-button" onClick={() => setCanvasFocused(!canvasFocused)} aria-pressed={canvasFocused}>{canvasFocused ? "Exit focus" : "Focus view"}</button>
              </div>
            </div>
            <div className="an-canvas-secondary-bar">
              <details className="an-canvas-guidance">
                <summary><span aria-hidden="true">⚠</span> NOT FOR CUTTING <span className="an-canvas-details-hint">· Source CAD rules unverified · Details</span></summary>
                <div className="an-canvas-guidance-details">
                  This marker is a diagnostic preview, not a production cutting file. Source CAD units, fold/grainline, notches, seams, native CAD precision and TUKAmark re-import have not been verified.
                  {preset === "imported" && <p>Phase 12 exports translate/rotate supported CAD marks with the selected pieces, but their manufacturing semantics remain unverified.</p>}
                </div>
              </details>
              {result && <details className="an-canvas-export-menu">
                <summary>Export preview ▾</summary>
                <div className="an-canvas-export-buttons">
                  <button type="button" onClick={exportSvg}>Download SVG</button>
                  <button type="button" disabled={exportingBundle || loading} onClick={exportAuditedPreviewBundle}>{exportingBundle ? "Exporting…" : "Audited DXF + report (Phase 9)"}</button>
                  {preset === "imported" && sourceFile && <button type="button" disabled={cadAwareExporting || loading} onClick={exportCadAwareNestedPreview}>{cadAwareExporting ? "Exporting…" : "CAD + marks (Phase 12)"}</button>}
                </div>
              </details>}
            </div>
            {(bundleError || cadAwareError) && <div role="alert" className="an-canvas-errors">{bundleError && <p>Phase 9: {bundleError}</p>}{cadAwareError && <p>Phase 12: {cadAwareError}</p>}</div>}
            {result ? (
              <div
                className="an-svg-viewport an-canvas-pan"
                ref={canvasViewportRef}
                onPointerDown={onCanvasPointerDown}
                onPointerMove={onCanvasPointerMove}
                onPointerUp={onCanvasPointerEnd}
                onPointerCancel={onCanvasPointerEnd}
                title="Mouse drag to pan a zoomed layout; use zoom buttons above to inspect"
              >
                <div className="an-canvas-stage" style={{width: `${Math.max(canvasBounds.width, result.fabric_width * scale * canvasZoom)}px`, height: `${Math.max(canvasBounds.height, result.fabric_length * scale * canvasZoom)}px`}}>
                <svg id="nesting-svg" xmlns="http://www.w3.org/2000/svg"
                  width={Math.max(1, result.fabric_width * scale)}
                  height={Math.max(1, result.fabric_length * scale)}
                  viewBox={`0 0 ${result.fabric_width} ${Math.max(result.fabric_length, 1)}`}
                  role="img" aria-label={`Nested marker containing ${result.placed_patterns.length} pieces`}
                  className="an-layout-svg"
                  style={{width: `${result.fabric_width * scale * canvasZoom}px`, height: `${result.fabric_length * scale * canvasZoom}px`, maxWidth: "none", maxHeight: "none"}}>
                  <rect x={0} y={0} width={result.fabric_width} height={Math.max(result.fabric_length, 1)} fill="#17263b" stroke="#94a3b8" strokeWidth={0.4} />
                  {result.placed_patterns.map((p, i) => (
                    <polygon key={`${p.name}-${p.instance}-${i}`}
                      points={p.points.map(([x, y]) => `${x},${y}`).join(" ")}
                      fill={COLORS[i % COLORS.length]} fillOpacity={0.8}
                      stroke="#ffffff" strokeWidth={0.45}>
                      <title>{`${p.name} #${p.instance} • ${p.rotation}°`}</title>
                    </polygon>
                  ))}
                </svg>
                </div>
              </div>
            ) : (
              <div className="an-canvas-empty"><div className="an-canvas-empty-icon" aria-hidden="true">⬡</div><h3>No nesting generated</h3><p>Choose a pattern set or upload a DXF, then select Generate Nesting.</p></div>
            )}
            <div className="an-canvas-footer">
              {result ? <><span className="an-canvas-algorithm">{result.algorithm} · {result.strategy} · {comparison ? `Trial: ${comparison.trials.find((t) => t.id === selectedTrial)?.method ?? "selected"}` : "Preview layout"}</span><span className="an-canvas-flag">{result.constraints_enforced ? "Geometry checks enabled" : "Grainline/fold not enforced"}</span></> : <span>Canvas ready · all exports remain diagnostic previews</span>}
            </div>
            {!!result?.warnings?.length && <details className="an-canvas-warnings"><summary>{result.warnings.length} nesting warnings</summary>{result.warnings.map((w,i) => <p key={i}>{w}</p>)}</details>}
          </section>

            </div>
          </section>}
          {activeTab === "files" && <div className="an-page-grid">
            <div className="an-internal-scroll">
              <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <div className="an-section-heading"><div><span className="an-overline">SOURCE MANAGEMENT</span><h2 className="mb-2 text-sm font-semibold">Import DXF patterns</h2></div><NavIcon name="file" /></div>
            <h2 className="mb-2 text-sm font-semibold">Import DXF Patterns</h2>
            <p className="mb-4 text-xs leading-5 text-slate-400">
              Supports closed polyline outlines and selected INSERT block outlines, including legacy endpoint-closed polygons. Preview only: maximum 24 contours and 80 vertices per contour.
            </p>
            <label htmlFor="dxf-units" className="mb-2 block text-xs text-slate-400">Units when DXF header is unitless</label>
            <select id="dxf-units" value={unitlessUnits} onChange={(e) => setUnitlessUnits(e.target.value as "mm" | "cm" | "in")}
              className="mb-4 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-3 text-sm">
              <option value="mm">Millimetres (mm)</option>
              <option value="cm">Centimetres (cm)</option>
              <option value="in">Inches (in)</option>
            </select>
            <label htmlFor="override-units" className="mb-2 block text-xs text-amber-200">Source units override (verify in the CAD first)</label>
            <select id="override-units" value={sourceUnitsOverride}
              onChange={(e) => setSourceUnitsOverride(e.target.value as "auto" | "mm" | "cm" | "in")}
              className="mb-4 w-full rounded-lg border border-amber-500/20 bg-slate-800 px-3 py-3 text-sm">
              <option value="auto">Automatic — trust DXF header</option>
              <option value="mm">Force millimetres (mm) — manual override</option>
              <option value="cm">Force centimetres (cm) — manual override</option>
              <option value="in">Force inches (in) — manual override</option>
            </select>
            <p className="mb-3 text-xs leading-5 text-amber-200/80">
              Some CAD files declare metres but store coordinates that resemble millimetres. Use manual overrides only after confirming dimensions in the source CAD.
            </p>
            <label htmlFor="dxf-upload" className="mb-2 block text-xs text-slate-400">DXF pattern file</label>
            <input id="dxf-upload" type="file" accept=".dxf" disabled={uploading}
              onChange={(e) => { void uploadDxf(e.target.files?.[0]); e.target.value = ""; }}
              className="block w-full cursor-pointer rounded-lg border border-white/10 bg-slate-800 p-3 text-xs file:mr-3 file:rounded file:border-0 file:bg-sky-500 file:px-2 file:py-1 file:text-slate-950" />
            <p className="mt-3 text-xs text-slate-400">{uploading ? "Importing..." : "Select a DXF. Import fills the pattern list; click Generate Nesting afterward."}</p>
            {importInfo && (
              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-5">
                <p className="font-semibold text-emerald-300">Imported {importInfo.pattern_count} contours from {importInfo.file_name}</p>
                <p className="text-slate-300">Source units: {importInfo.source_units}; output: {importInfo.output_units}</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-amber-200/90">
                  {importInfo.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
                </ul>
              </div>
            )}

                <button className="an-inline-link" type="button" onClick={() => setActiveTab("patterns")}>Review imported patterns <span aria-hidden="true">→</span></button>
              </section>
              <section className="rounded-2xl border border-white/10 bg-slate-900 p-5 mt-4"><h2 className="mb-3 text-sm font-semibold">Import preflight</h2>            {importInfo?.preflight && <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-amber-200">Phase 8 — CAD preflight</p>
                <span className="text-amber-300">Review required</span>
              </div>
              <p className="mt-2 text-slate-300">{importInfo.preflight.pattern_count} candidate contours • {importInfo.preflight.candidate_area_mm2.toLocaleString()} mm² total area</p>
              <div className="mt-3 max-h-48 overflow-y-auto rounded-md border border-white/10">
                <table className="w-full text-left text-[11px]"><thead className="text-slate-400"><tr><th className="p-2">Pattern</th><th className="p-2 text-right">W × H (mm)</th></tr></thead>
                <tbody>{importInfo.preflight.patterns.map((pat, i) => <tr key={i} className="border-t border-white/5"><td className="p-2">{pat.name}</td><td className="p-2 text-right tabular-nums">{pat.width_mm} × {pat.height_mm}</td></tr>)}</tbody></table>
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-amber-100/80">
                {importInfo.preflight.issues.map((issue, i) => <li key={i}>{issue.code}: {issue.message}</li>)}
              </ul>
              <p className="mt-2 font-medium text-amber-200">Preflight is NOT CAD verification or authorization to cut.</p>
            </div>}
</section>
            </div>
            <div className="an-internal-scroll an-cad-review-panels">
              <div className="an-section-page-title"><span className="an-overline">DIAGNOSTIC TOOLS</span><h2>Source compatibility & metadata</h2><p>Review CAD source integrity before evaluating export compatibility.</p></div>
              {!sourceFile && <div className="an-empty-state">Upload an original DXF file to unlock TUKAcad exchange preflight, source audit and CAD metadata inspection.</div>}
              <section className="an-review-card">            {sourceFile && importInfo && <div className="mt-4 rounded-xl border border-sky-400/30 bg-sky-400/5 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sky-200">Phase 14 — TUKAcad DXF Exchange Preflight</p>
                <span className="rounded bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200">UNVERIFIED</span>
              </div>
              <p className="mt-2 leading-5 text-slate-300">Check source file evidence, size/quantity labels, unit discrepancies, CAD layers and the TUKAmark re-import checklist. This does not establish native TUKAcad or AAMA compatibility.</p>
              <button type="button" disabled={tukaLoading || uploading} onClick={runTukaPreflight}
                className="mt-3 w-full rounded-lg border border-sky-400/50 bg-sky-500/10 p-3 font-semibold text-sky-100 disabled:opacity-50">
                {tukaLoading ? "Checking DXF exchange evidence..." : "Inspect TUKAcad exchange readiness (Phase 14)"}
              </button>
              {tukaError && <p role="alert" className="mt-3 break-words text-red-300">{tukaError}</p>}
              {tukaReport && <div className="mt-3 space-y-3 rounded-lg border border-sky-400/20 bg-slate-950/40 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-slate-400">Candidate pieces</p><p className="font-semibold text-lg">{tukaReport.candidate_pattern_count}</p></div>
                  <div><p className="text-slate-400">Source quantity total</p><p className="font-semibold text-lg">{tukaReport.labelled_quantity_sum ?? "Unverified"}</p></div>
                  <div><p className="text-slate-400">Readable sizes</p><p className="font-semibold">{tukaReport.distinct_size_labels.join(", ") || "Not found"}</p></div>
                  <div><p className="text-slate-400">Source CAD units</p><p className="font-semibold">{tukaReport.source_units.header_name}</p></div>
                </div>
                <p className="text-slate-400">Text hints (not proof): {tukaReport.source_hints_unverified.join(", ") || "No vendor indicators"}</p>
                <p className="text-amber-200">Manual unit override: {tukaReport.source_units.manual_override ? "YES — verify dimensions" : "No"}</p>
                <p className="text-slate-400">Source preview entities: {tukaReport.metadata_preview_exportable_entities ?? "Not fully mapped"} · Unsupported: {tukaReport.metadata_preview_unsupported_entities ?? "Unknown"}</p>
                <details className="rounded border border-white/10 p-2"><summary className="cursor-pointer font-semibold text-sky-100">Pattern sizes and labels</summary>
                  <div className="mt-2 max-h-44 overflow-auto space-y-1 text-slate-300">{tukaReport.patterns.map(p => <p key={p.index}>{p.index}. {p.name} · size {p.source_size_label ?? "?"} · qty {p.source_quantity_label ?? "?"} · {p.bounds_mm.width} × {p.bounds_mm.height} mm*</p>)}</div>
                  <p className="mt-1 text-amber-200">*Dimensions are not independently verified.</p>
                </details>
                <details className="rounded border border-white/10 p-2"><summary className="cursor-pointer font-semibold text-sky-100">Operator re-import checklist</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-slate-300">{tukaReport.operator_checklist.map((item,i) => <li key={i}>{item.item} — pending</li>)}</ul>
                </details>
                <div className="space-y-1">{tukaReport.issues.map((item,i)=><p key={i} className={item.level === "blocked" ? "text-red-300" : "text-amber-200"}>{item.code}: {item.message}</p>)}</div>
                <p className="font-semibold text-amber-200">TUKAmark round-trip: NOT TESTED · AAMA/ASTM compliance: NOT VERIFIED · NOT FOR CUTTING</p>
                <button type="button" onClick={downloadTukaPreflight} className="rounded-lg border border-sky-400/50 px-3 py-2 text-sky-100">Download Phase 14 preflight JSON</button>
              </div>}
            </div>}
</section>
              <section className="an-review-card">            {sourceFile && importInfo && <div className="mt-4 rounded-xl border border-violet-400/30 bg-violet-400/5 p-3 text-xs">
              <p className="font-semibold text-violet-200">Phase 10 — Source CAD evidence review</p>
              <p className="mt-2 leading-5 text-slate-300">Inspect original DXF layers, blocks and skipped entities. Optionally compare ONE dimension with an independently confirmed source CAD measurement.</p>
              <label className="mt-3 block text-slate-400">Reference pattern</label>
              <select value={referencePatternIndex} onChange={(e) => { setReferencePatternIndex(Number(e.target.value)); setCadReview(null); }}
                className="mt-1 w-full rounded-md bg-slate-800 p-2">
                {importInfo.patterns.map((pat, i) => <option key={i} value={i+1}>{pat.name}</option>)}
              </select>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-slate-400">Dimension axis
                  <select value={referenceAxis} onChange={(e) => { setReferenceAxis(e.target.value as "width" | "height"); setCadReview(null); }}
                    className="mt-1 block w-full rounded-md bg-slate-800 p-2">
                    <option value="width">Width</option><option value="height">Height</option>
                  </select>
                </label>
                <label className="text-slate-400">Source dimension (mm)
                  <input type="number" placeholder="Optional" min={0.001} max={20000} step="any"
                    value={referenceMeasurement} onChange={(e) => { setReferenceMeasurement(e.target.value); setCadReview(null); }}
                    className="mt-1 block w-full min-w-0 rounded-md bg-slate-800 p-2" />
                </label>
              </div>
              <button type="button" disabled={cadReviewLoading} onClick={runCadSourceReview}
                className="mt-3 w-full rounded-lg border border-violet-400/50 bg-violet-400/10 p-3 font-semibold text-violet-100 disabled:opacity-50">
                {cadReviewLoading ? "Inspecting original CAD..." : "Analyze source DXF (Phase 10)"}
              </button>
              {cadReviewError && <p role="alert" className="mt-2 text-red-300">{cadReviewError}</p>}
              {cadReview && <div className="mt-3 space-y-2 rounded-md border border-white/10 bg-slate-950/40 p-3">
                <p className="font-semibold text-violet-200">DXF source audit — NOT cutting approval</p>
                <p>Header: $INSUNITS={cadReview.header_insunits_code} ({cadReview.header_units})</p>
                <p>Importer: {cadReview.import_interpretation}</p>
                <p>Imported outlines: {cadReview.imported_pattern_count}</p>
                <p>Source SHA-256: <span className="break-all font-mono text-[10px]">{cadReview.source_dxf_sha256_server_calculated}</span></p>
                <p className={cadReview.reference_check.status === "matched" ? "text-emerald-300" : "text-amber-200"}>
                  Reference: {cadReview.reference_check.status.replaceAll("_", " ")}
                  {cadReview.reference_check.imported_dimension_mm !== undefined && ` • imported ${cadReview.reference_check.imported_dimension_mm} mm / supplied ${cadReview.reference_check.user_supplied_reference_mm} mm`}
                </p>
                <details className="rounded-md bg-slate-900 p-2"><summary className="cursor-pointer">DXF entity inventory</summary>
                  <p className="mt-2">Modelspace: {Object.entries(cadReview.source_inventory.modelspace_entity_counts).map(([k,v]) => `${k}: ${v}`).join(", ")}</p>
                  <p className="mt-2">Within INSERT blocks: {Object.entries(cadReview.source_inventory.insert_content_entity_counts).map(([k,v]) => `${k}: ${v}`).join(", ") || "none"}</p>
                  <p className="mt-2">Skipped by importer: {Object.entries(cadReview.source_inventory.importer_skipped_entity_counts).map(([k,v]) => `${k}: ${v}`).join(", ") || "none reported"}</p>
                  <p className="mt-2">Layers: {Object.entries(cadReview.source_inventory.layer_entity_counts).map(([k,v]) => `${k}: ${v}`).join(", ")}</p>
                </details>
                <ul className="list-disc space-y-1 pl-4 text-amber-200">{cadReview.flags.map((f,i) => <li key={i}>{f.code}: {f.message}</li>)}</ul>
                <button type="button" onClick={saveCadReview} className="rounded-lg border border-violet-400/50 px-3 py-2 text-violet-200">Download source audit JSON</button>
                <p className="text-amber-200">Measurement is user-supplied; matching does NOT verify grainline/fold/notches or approve production cutting.</p>
              </div>}
            </div>}
</section>
              <section className="an-review-card">            {sourceFile && importInfo && <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-cyan-200">Phase 11 — Garment CAD Metadata Inspector</p>
                <span className="rounded bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200">NOT FOR CUTTING</span>
              </div>
              <p className="mt-2 leading-5 text-slate-300">Inspect source DXF BLOCK handles, cut-outline candidates, secondary contours, POINT, LINE and TEXT annotations. Roles remain unverified.</p>
              <button type="button" disabled={cadMetadataLoading || uploading} onClick={runMetadataInspection}
                className="mt-3 w-full rounded-lg border border-cyan-400/50 bg-cyan-500/10 p-3 font-semibold text-cyan-100 disabled:opacity-50">
                {cadMetadataLoading ? "Inspecting source entities..." : "Inspect CAD metadata (Phase 11)"}
              </button>
              {cadMetadataError && <p role="alert" className="mt-3 break-words text-red-300">{cadMetadataError}</p>}
              {cadMetadata && <div className="mt-4 space-y-3 rounded-lg border border-cyan-400/20 bg-slate-950/40 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-slate-400">Pattern blocks</p><p className="text-lg font-semibold">{cadMetadata.piece_count}</p></div>
                  <div><p className="text-slate-400">CAD entities inspected</p><p className="text-lg font-semibold">{cadMetadata.entity_count}</p></div>
                  <div><p className="text-slate-400">Preview supported</p><p className="font-semibold text-emerald-300">{cadMetadata.exportable_entity_count}</p></div>
                  <div><p className="text-slate-400">Unsupported / skipped</p><p className="font-semibold text-amber-300">{cadMetadata.unsupported_entity_count}</p></div>
                </div>
                <p className="text-slate-400">Source types: {Object.entries(cadMetadata.entity_type_counts).map(([k,v]) => `${k} ${v}`).join(" · ")}</p>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-white/10">
                  {cadMetadata.pieces.map((piece) => <details key={piece.insert_handle} className="border-b border-white/10 p-2">
                    <summary className="cursor-pointer font-semibold text-cyan-100">{piece.pattern_name} <span className="font-normal text-slate-400">— {piece.entity_count} entities</span></summary>
                    <p className="mt-2 text-slate-300">BLOCK {piece.block_name}, INSERT {piece.insert_handle}; {piece.candidate_bounds_mm.width} × {piece.candidate_bounds_mm.height} mm</p>
                    <p className="mt-1 text-slate-300">Source size: {piece.source_size_label ?? "—"}; quantity label: {piece.source_quantity_label ?? "—"}; fold label: {piece.source_fold_label ?? "—"}</p>
                    <p className="mt-1 text-slate-400">Layers: {Object.entries(piece.counts_by_layer).map(([k,v])=>`${k}: ${v}`).join(", ")}</p>
                    <p className="mt-1 break-all font-mono text-[10px] text-slate-400">Candidate: {piece.candidate_cut_source_id}</p>
                    <details className="mt-2"><summary className="cursor-pointer text-sky-200">Source entity IDs ({piece.entities.length})</summary>
                      <div className="mt-2 max-h-32 overflow-auto space-y-1 font-mono text-[10px] text-slate-400">{piece.entities.map((ent) => <p key={ent.source_id} className="break-all">{ent.source_id} · layer {ent.source_layer} · {ent.role}{!ent.preview_exportable ? " [SKIPPED]" : ""}</p>)}</div>
                    </details>
                  </details>)}
                </div>
                <p className="text-amber-200">This inspection sheet is NOT an optimized nesting marker. Grainline/fold/notch semantics, cut-line identity and source units still require CAD verification.</p>
                {cadMetadata.warnings.map((w,i)=><p className="text-amber-100/80" key={i}>{w}</p>)}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={downloadCadMetadataJson} className="rounded-md border border-cyan-400/40 px-3 py-2 text-cyan-100">Download metadata JSON</button>
                  <button type="button" disabled={cadMetadataExporting} onClick={exportMetadataPreview} className="rounded-md border border-amber-400/40 px-3 py-2 text-amber-100 disabled:opacity-50">{cadMetadataExporting ? "Exporting..." : "Download traceable CAD preview ZIP"}</button>
                </div>
              </div>}
            </div>}
</section>
            </div>
          </div>}
          {activeTab === "patterns" && <div className="an-page-grid an-pattern-page">
            <div className="an-internal-scroll an-pattern-main">
              <div className="an-section-page-title"><span className="an-overline">PATTERN LIBRARY</span><h2>Garment pieces</h2><p>Select pieces, set required quantities, and review source-specific rules.</p></div>
          <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Pattern Pieces</h2>
              <span className="text-xs text-slate-400">{pieceCount} selected</span>
            </div>
            {preset === "imported" && <>
              <p className="mb-3 text-xs leading-5 text-amber-200/80">Select any imported contours and edit quantities below. All source CAD metadata is unverified. Max 60 total instances per nesting run.</p>
              <button onClick={useCadQuantities} className="mb-3 rounded-md border border-amber-500/40 px-3 py-2 text-xs text-amber-100 hover:bg-white/5">Copy CAD quantity labels to selected pieces (review first)</button>
            </>}
            <div className="an-pattern-list space-y-2">
              {(preset === "imported" ? importInfo?.patterns ?? [] : patterns).map((listed, index) => {
                const current = patterns.find((p) => p.name === listed.name);
                const selected = !!current;
                const pat = current ?? listed;
                return (
                  <div key={`${listed.name}-${index}`} className="an-pattern-row rounded-xl bg-slate-800/70 p-3">
                    <div className="flex items-start gap-3">
                      {preset === "imported" ? <input type="checkbox" className="mt-1 h-4 w-4 accent-sky-400" checked={selected}
                        onChange={(e) => { setPatterns((prev) => e.target.checked ? [...prev, { ...listed, quantity: 1 }] : prev.filter((p) => p.name !== listed.name)); setResult(null); setComparison(null); setBenchmark(null); setRefinement(null); setPhase13Report(null); setSelectedTrial(null); }} />
                        : <span className="mt-1 h-3 w-3 rounded" style={{ background: COLORS[index % COLORS.length] }} />}
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-xs font-medium">{listed.name}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{listed.source_size ? `Size ${listed.source_size} · ` : ""}CAD qty {listed.source_quantity ?? "unknown"} · Fold: {listed.fold_required ? "Y (unverified)" : "N / unknown"}</p>
                      </div>
                    </div>
                    <button type="button" className="an-pattern-toggle" aria-expanded={expandedPattern===listed.name} onClick={() => setExpandedPattern(v=> v===listed.name?null:listed.name)}>
                      {expandedPattern===listed.name ? "Hide details" : "Edit quantity & constraints"} <span aria-hidden="true">{expandedPattern===listed.name ? "−" : "+"}</span>
                    </button>
                    {selected && expandedPattern===listed.name && <div className="mt-3 grid grid-cols-2 gap-3 border-t border-black/5 pt-3">
                      <label className="text-[11px] text-slate-300">Quantity
                        <input type="number" min={1} max={60} value={pat.quantity ?? 1}
                          onChange={(e) => updateSelected(pat.name, { quantity: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })}
                          className="mt-1 w-full rounded-md bg-slate-700 px-2 py-2 text-xs" />
                      </label>
                      <label className="text-[11px] text-slate-300">Source-CAD verified fold border
                        <select value={pat.fold_edge ?? "none"}
                          onChange={(e) => updateSelected(pat.name, { fold_edge: e.target.value === "none" ? null : e.target.value as "left" | "right", fold_verified: false })}
                          className="mt-1 w-full rounded-md bg-slate-700 px-2 py-2 text-xs">
                          <option value="none">Not verified</option><option value="left">Left vertical border</option><option value="right">Right vertical border</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-[11px] text-slate-200">
                        <input type="checkbox" className="accent-sky-400" checked={!!pat.grainline_verified}
                          onChange={(e) => updateSelected(pat.name, { grainline_verified: e.target.checked })} />Grainline + 0° reviewed
                      </label>
                      <label className="flex items-center gap-2 text-[11px] text-slate-200">
                        <input type="checkbox" className="accent-sky-400" checked={!!pat.fold_status_verified}
                          onChange={(e) => updateSelected(pat.name, { fold_status_verified: e.target.checked })} />Fold Y/N reviewed in CAD
                      </label>
                      <label className="flex items-center gap-2 text-[11px] text-slate-200">
                        <input type="checkbox" className="accent-sky-400" checked={!!pat.fold_verified}
                          disabled={!pat.fold_required || !pat.fold_edge}
                          onChange={(e) => updateSelected(pat.name, { fold_verified: e.target.checked })} />Fold line verified in CAD
                      </label>
                    </div>}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Rotations are explicit: the engine will not turn a pattern in ways that may violate fabric grain or direction.</p>
          </section>

            </div>
            <aside className="an-pattern-summary"><span className="an-overline">CURRENT SELECTION</span><h3>{pieceCount} pieces</h3><p>{patterns.length} distinct pattern types</p><div className="an-summary-rule"/><p>Fabric width <strong>{fabricWidth} mm</strong></p><p>Minimum gap <strong>{gap} mm</strong></p><button type="button" className="an-primary-action w-full justify-center" onClick={() => setActiveTab("workspace")}>Open workspace <span aria-hidden="true">→</span></button></aside>
          </div>}
          {activeTab === "materials" && <div className="an-page-grid">
            <div className="an-internal-scroll space-y-4">
              <section className="an-review-card an-material-card">
                <div className="an-section-heading"><div><span className="an-overline">PHASE 15 · SOURCE LABELS</span><h2>Material mapping review</h2></div><NavIcon name="layers"/></div>
                <p className="an-intro-text">Read source material codes without guessing what they mean. Ask a CAD operator to confirm which codes belong to the same fabric group before generating separate diagnostic markers.</p>
                {!sourceFile && <div className="an-info-note"><strong>Import a DXF first</strong><p>Use CAD Files to upload the original DXF and confirm its units.</p><button className="an-inline-link" onClick={()=>setActiveTab("files")}>Open CAD Files →</button></div>}
                <button className="an-primary-action w-full justify-center mt-4" disabled={!sourceFile || materialLoading} onClick={runMaterialReview}>{materialLoading ? "Processing…" : "Inspect material labels"}</button>
                {materialReview && <>
                  <div className="an-info-note mt-4"><strong>{materialReview.pattern_count} candidate patterns</strong><p>Source units: {materialReview.source_units}</p><p>Independent CAD measurement: {materialReview.reference_check.status}</p></div>
                  <p className="an-material-alert">Codes such as S and P are unverified TEXT from the CAD file — they are not automatically authenticated fabric types.</p>
                  <div className="an-material-labels">
                    {materialReview.source_material_labels.map(label => {
                      const entry = materialAssignments.find(a=>a.source_label===label.label);
                      return <div className="an-material-row" key={label.label}>
                        <div><strong>Source code: {label.label}</strong><p>{label.patterns} pattern types · {label.labelled_quantity} labelled copies</p></div>
                        <label>Confirmed fabric group name
                          <input type="text" maxLength={40} placeholder="E.g. Main fabric" value={entry?.group_id??""} onChange={e=>{setMaterialPreview(null);setMaterialAssignments(items=>items.map(a=>a.source_label===label.label?{...a,group_id:e.target.value,operator_confirmed:false}:a));}} />
                        </label>
                        <label className="an-material-confirm"><input type="checkbox" checked={!!entry?.operator_confirmed} onChange={e=>{setMaterialPreview(null);setMaterialAssignments(items=>items.map(a=>a.source_label===label.label?{...a,operator_confirmed:e.target.checked}:a));}}/> Mapping checked against original CAD / by a CAD operator</label>
                      </div>;
                    })}
                  </div>
                  <label className="an-material-width">Optional per-group widths (mm):
                    {[...new Set(materialAssignments.map(a=>a.group_id.trim()).filter(Boolean))].map(id=><span key={id} className="an-material-width-field"><span>{id}</span><input type="number" min="1" max="20000" placeholder={`Default ${fabricWidth}`} value={materialWidths[id]??""} onChange={e=>{setMaterialPreview(null);setMaterialWidths(old=>({...old,[id]:e.target.value}));}}/></span>)}
                  </label>
                  <button className="an-primary-action w-full justify-center mt-4" disabled={materialLoading || !materialAssignments.filter(a=>patterns.some(p=>(p.source_material?.trim()||"UNLABELED")===a.source_label)).every(a=>a.operator_confirmed && !!a.group_id.trim())} onClick={generateMaterialPreviews}>Generate separated marker previews</button>
                </>}
                {materialError && <p className="an-global-error mt-3" role="alert">{materialError}</p>}
                <p className="an-material-alert mt-4">NOT FOR CUTTING. Unverified grainline, fold, seam, notch, material meaning and CAD units can affect factory suitability.</p>
              </section>
            </div>
            <div className="an-internal-scroll space-y-4">
              <div className="an-section-page-title"><span className="an-overline">DIAGNOSTIC MARKER RESULTS</span><h2>Separated fabric previews</h2><p>Each confirmed group is optimized and audited separately. There is no combined utilization across different fabrics.</p></div>
              {!materialPreview && <div className="an-empty-state">Import a DXF, review its material codes and confirm group assignments to see separate preview layouts.</div>}
              {materialPreview && <>
                <div className="an-material-kpi-row">{materialPreview.groups.map(g=><button type="button" key={g.group_id} className={`an-material-kpi ${selectedMaterialGroup===g.group_id?"selected":""}`} onClick={()=>setSelectedMaterialGroup(g.group_id)}><strong>{g.group_id}</strong><span>{g.instances} pieces · {g.utilization_percent.toFixed(2)}% utilization</span><small>{g.fabric_length_mm.toFixed(2)} mm length</small></button>)}</div>
                {materialPreview.groups.filter(g=>g.group_id===selectedMaterialGroup).map(g=><section key={g.group_id} className="an-review-card an-material-preview">
                  <div className="an-section-heading"><div><span className="an-overline">FABRIC GROUP · {g.group_id}</span><h2>{g.instances} audited pattern copies</h2></div><span className="an-canvas-flag">NOT FOR CUTTING</span></div>
                  <div className="an-material-stats"><span>Fabric width: {g.fabric_width_mm} mm</span><span>Length: {g.fabric_length_mm.toFixed(2)} mm</span><span>Gap audit: {g.geometry_audit.minimum_clearance_mm?.toFixed(3)??"—"} mm</span></div>
                  <svg viewBox={`0 0 ${g.fabric_width_mm} ${Math.max(g.fabric_length_mm,1)}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${g.group_id} diagnostic marker layout`} className="an-material-svg" xmlns="http://www.w3.org/2000/svg"><rect width={g.fabric_width_mm} height={Math.max(g.fabric_length_mm,1)} fill="#19283c"/>{g.layout.placed_patterns.map((p,i)=><polygon key={`${p.name}-${p.instance}-${i}`} points={p.points.map(([x,y])=>`${x},${y}`).join(" ")} fill={COLORS[i%COLORS.length]} stroke="#fff" strokeWidth={0.5}><title>{p.name} copy {p.instance}</title></polygon>)}</svg>
                  <p className="an-intro-text">Source codes: {g.source_material_labels.join(", ")} · Geometry audit: {g.geometry_audit.passed?"PASS":"FAIL"} · No manufacturing approval</p>
                </section>)}
                <button className="an-outline-action" onClick={downloadMaterialReview}><NavIcon name="download"/> Download Phase 15 JSON report</button>
              </>}
            </div>
          </div>}
          {activeTab === "optimization" && <div className="an-page-grid">
            <div className="an-internal-scroll"><section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <div className="an-section-heading"><div><span className="an-overline">OPTIMIZATION ENGINE</span><h2 className="text-sm font-semibold">Search strategies</h2></div><NavIcon name="spark" /></div>
              <p className="an-intro-text">Try geometry ordering, multi-start optimization, and bounded NFP search. Comparison results are independently audited.</p>
            <button onClick={compareLayouts} disabled={loading || fabricWidth <= 0 || gap < 0 || patterns.length === 0 || pieceCount > 60}
              className="mt-3 w-full rounded-xl border border-sky-400/50 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-200 hover:bg-sky-400/20 disabled:opacity-50">
              {loading ? "Working..." : "Compare layouts & select best"}
            </button>
            <p className="mt-2 text-[11px] leading-4 text-slate-400">Compares input order and several bounded-greedy alternatives (independent of the strategy menu above). Best means shortest among tested layouts, not a global optimum.</p>

            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <label htmlFor="geometry-effort" className="mb-2 block text-xs font-semibold text-emerald-200">Phase 6 — Geometric search effort</label>
              <select id="geometry-effort" value={geometryEffort} onChange={(e) => setGeometryEffort(e.target.value as "quick" | "standard" | "deep")}
                className="mb-3 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs">
                <option value="quick">Quick — fewer contact searches</option>
                <option value="standard">Standard — recommended</option>
                <option value="deep">Deep — more candidate placements</option>
              </select>
              <button type="button" onClick={runGeometricOptimization}
                disabled={loading || fabricWidth <= 0 || gap < 0 || patterns.length === 0 || pieceCount > 60}
                className="w-full rounded-xl bg-emerald-500 px-3 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
                {loading ? "Searching layouts..." : "Optimize geometry (Phase 6)"}
              </button>
              <p className="mt-2 text-[11px] leading-4 text-slate-400">Tries bounded polygon-contact placements and multi-start orders. Not an exact No-Fit Polygon solver; improvement is not guaranteed.</p>
            </div>
            <div className="mt-3 rounded-xl border border-sky-400/30 bg-sky-400/5 p-3">
              <p className="text-xs font-semibold text-sky-200">Phase 13 — Bounded NFP optimization preview</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-400">Small simple polygons use Minkowski-derived NFP regions. Complex CAD pieces fall back to contour candidates. Results are independent-geometry-audited and never deliberately worse than Fast baseline. Not industrial exact NFP or cutting approval.</p>
              <button type="button" onClick={runPhase13}
                disabled={loading || fabricWidth <= 0 || gap < 0 || patterns.length === 0 || pieceCount > 60}
                className="mt-3 w-full rounded-lg bg-sky-400 px-3 py-3 text-xs font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-50">
                {loading ? "Optimizing and auditing..." : "Optimize with Phase 13 NFP Hybrid"}
              </button>
              {phase13Report && <div className="mt-3 rounded-lg border border-sky-400/20 bg-slate-950 p-3 text-xs">
                <p className="font-semibold text-sky-200">Audited Phase 13 result</p>
                <p className="mt-2 text-slate-300">Fast baseline: {phase13Report.baseline_length_mm.toFixed(2)} mm</p>
                <p className="text-slate-300">Best length: {phase13Report.best_length_mm.toFixed(2)} mm</p>
                <p className="text-emerald-300">Improvement vs Fast: {phase13Report.improvement_percent.toFixed(2)}%</p>
                <p className="mt-2 text-slate-400">Exact limited NFP pairs: {phase13Report.search_stats.nfp_exact_pairs} · Contact fallbacks: {phase13Report.search_stats.nfp_fallback_pairs}</p>
                <p className="mt-1 text-amber-200">Geometry audit: {phase13Report.best_audit.passed ? "PASS" : "FAIL"} · NOT FOR CUTTING</p>
              </div>}
            </div>

              <button type="button" className="an-inline-link mt-4" onClick={() => setActiveTab("workspace")}>View nesting canvas <span aria-hidden="true">→</span></button>
            </section></div>
            <div className="an-internal-scroll space-y-4"><div className="an-section-page-title"><span className="an-overline">RESULTS</span><h2>Optimization comparisons</h2><p>Best result is not a guaranteed global optimum.</p></div>
          {comparison && <section className="rounded-2xl border border-sky-400/20 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{comparison.version === "0.6.0" ? "Phase 6 — Geometric optimization" : "Phase 5 — Ordering comparison"}</h2>
              <span className="text-xs text-sky-300">{comparison.version === "0.6.0" ? `${comparison.attempts_run ?? 0} geometric attempts • ${comparison.trials_run} displayed milestones` : `${comparison.trials_run} layouts tested`} • {comparison.total_runtime_ms} ms total</span>
            </div>
            {comparison.engine && <p className="mt-2 text-xs text-slate-400">{comparison.engine} • Effort: {comparison.effort}</p>}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">Baseline length</p><p className="mt-1 text-lg font-semibold">{comparison.baseline_length_mm} mm</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">Best tested length</p><p className="mt-1 text-lg font-semibold text-emerald-300">{comparison.best_length_mm} mm</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">Length improvement</p><p className="mt-1 text-lg font-semibold text-sky-300">{comparison.improvement_vs_input_order_percent}%</p></div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-xs">
                <thead><tr className="border-b border-white/10 text-slate-400"><th className="py-2">Candidate method</th><th className="py-2 text-right">Length (mm)</th><th className="py-2 text-right">Utilization</th><th className="py-2 text-right">Time (ms)</th><th className="py-2 text-right">Preview</th></tr></thead>
                <tbody>{comparison.trials.map((trial) => <tr key={trial.id} className="border-b border-white/5">
                  <td className="py-3">{trial.method}{trial.id === comparison.best_trial_id && <span className="ml-2 text-emerald-300">Best</span>}</td>
                  <td className="py-3 text-right tabular-nums">{trial.layout.fabric_length}</td>
                  <td className="py-3 text-right tabular-nums">{trial.layout.utilization_percent}%</td>
                  <td className="py-3 text-right tabular-nums">{trial.runtime_ms}</td>
                  <td className="py-3 text-right"><button type="button" onClick={() => viewTrial(trial)} className={`rounded-md border px-2 py-1 ${selectedTrial === trial.id ? "border-sky-400 text-sky-200" : "border-white/15 text-slate-300"}`}>
                    {selectedTrial === trial.id ? "Viewing" : "View"}
                  </button></td>
                </tr>)}</tbody>
              </table>
            </div>
            {comparison.note && <p className="mt-3 text-xs text-slate-400">{comparison.note}</p>}
            <p className="mt-3 text-[11px] text-amber-200/80">These candidates use the same pattern set and cutting settings. Unverified fold/grainline rules remain unverified; no result is certified for cutting.</p>
          </section>}

          {refinement && <section className="rounded-2xl border border-teal-400/25 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Phase 8 — Audited geometric refinement</h2>
              <span className="text-xs text-teal-300">{refinement.total_runtime_ms} ms • {refinement.candidates_checked} local candidate checks</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">Phase 6 reference</p><p className="mt-1 text-lg font-semibold">{refinement.baseline_length_mm} mm</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">Best audited length</p><p className="mt-1 text-lg font-semibold text-teal-300">{refinement.best_length_mm} mm</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">Length reduction</p><p className="mt-1 text-lg font-semibold">{refinement.improvement_percent}%</p></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className={refinement.best_audit.passed ? "text-emerald-300" : "text-red-300"}>Geometry audit: {refinement.best_audit.passed ? "PASS" : "FAIL"}</span>
              <button onClick={() => setResult(refinement.baseline_layout)} className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/5">View baseline</button>
              <button onClick={() => setResult(refinement.best_layout)} className="rounded-lg border border-teal-400/40 px-3 py-2 text-teal-200 hover:bg-white/5">View refined</button>
            </div>
            {refinement.compaction_skipped && <p className="mt-3 text-xs text-amber-200">{refinement.skip_reason}</p>}
            <p className="mt-3 text-xs text-amber-200">Preview only. Valid polygon geometry is not evidence that grainlines, folds, notches, units or cutting instructions match source CAD.</p>
          </section>}

              {phase13Report && <div className="an-summary-card"><span className="an-overline">PHASE 13 · NFP HYBRID</span><h3>{phase13Report.improvement_percent.toFixed(2)}% improvement</h3><p>Fast baseline: {phase13Report.baseline_length_mm.toFixed(2)} mm</p><p>Best length: {phase13Report.best_length_mm.toFixed(2)} mm</p><p>Exact limited pairs: {phase13Report.search_stats.nfp_exact_pairs} · Fallback pairs: {phase13Report.search_stats.nfp_fallback_pairs}</p></div>}
              {!comparison && !refinement && !phase13Report && <div className="an-empty-state">Run an optimization to see comparative results.</div>}
            </div>
          </div>}
          {activeTab === "validation" && <div className="an-page-grid">
            <div className="an-internal-scroll"><section className="rounded-2xl border border-white/10 bg-slate-900 p-5"><div className="an-section-heading"><div><span className="an-overline">GEOMETRY RELIABILITY</span><h2 className="text-sm font-semibold">Validation tools</h2></div><NavIcon name="shield"/></div>
              <p className="an-intro-text">Replay algorithms and audit gaps, overlaps, fabric bounds and geometry consistency. This is not manufacturing certification.</p>
            <button type="button" onClick={runBenchmark}
              disabled={loading || fabricWidth <= 0 || gap < 0 || patterns.length === 0 || pieceCount > 60}
              className="mt-3 w-full rounded-xl border border-violet-400/50 bg-violet-400/10 px-4 py-3 text-sm font-semibold text-violet-200 hover:bg-violet-400/20 disabled:opacity-50">
              {loading ? "Checking..." : "Audit & replay (Phase 7)"}
            </button>
            <p className="mt-2 text-[11px] leading-4 text-slate-400">Reruns the same seed twice and an alternate seed once. Independently checks polygon shape, count, overlaps, gaps and fabric rails. Audit pass is NOT approval for cutting.</p>
            <button type="button" onClick={runRefinement}
              disabled={loading || fabricWidth <= 0 || gap < 0 || patterns.length === 0 || pieceCount > 60}
              className="mt-3 w-full rounded-xl border border-teal-400/50 bg-teal-400/10 px-4 py-3 text-sm font-semibold text-teal-200 hover:bg-teal-400/20 disabled:opacity-50">
              {loading ? "Validating placement..." : "Refine & audit layout (Phase 8)"}
            </button>
            <p className="mt-2 text-[11px] leading-4 text-slate-400">Tries bounded local relocation after Phase 6. Shows only an independently audited non-worsening result; not production cutting approval.</p>
            {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}

              <div className="an-info-note mt-5"><strong>Important</strong><p>A passed geometry audit does not validate fabric grainline, seam allowances, notches, folds, or cutting approval.</p></div>
            </section></div>
            <div className="an-internal-scroll space-y-4"><div className="an-section-page-title"><span className="an-overline">AUDIT OUTPUT</span><h2>Verification reports</h2></div>
          {benchmark && <section className="rounded-2xl border border-violet-400/25 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Phase 7 — Repeatability & geometry audit</h2>
              <span className="text-xs text-violet-300">3 runs • {benchmark.total_runtime_ms} ms total</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Same-seed runs should produce the same geometry fingerprint; runtime may vary.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">Fixed-seed replay</p><p className={`mt-1 text-sm font-semibold ${benchmark.same_seed_reproducible ? "text-emerald-300" : "text-red-300"}`}>{benchmark.same_seed_reproducible ? "Reproducible" : "Mismatch"}</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">Geometry checks (all runs)</p><p className={`mt-1 text-sm font-semibold ${benchmark.all_geometry_audits_passed ? "text-emerald-300" : "text-red-300"}`}>{benchmark.all_geometry_audits_passed ? "Passed" : "Failed"}</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">Manufacturing approval</p><p className="mt-1 text-sm font-semibold text-amber-300">NOT approved</p></div>
            </div>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[570px] text-xs">
              <thead><tr className="border-b border-white/10 text-slate-400"><th className="py-2 text-left">Run</th><th className="text-right">Seed</th><th className="text-right">Length</th><th className="text-right">Audit</th><th className="text-right">Time</th><th className="text-right">Fingerprint</th></tr></thead>
              <tbody>{benchmark.runs.map((r) => <tr key={r.run} className="border-b border-white/5">
                <td className="py-3">#{r.run}{r.run === benchmark.best_run ? " (best audited)" : ""}</td>
                <td className="text-right tabular-nums">{r.seed}</td>
                <td className="text-right tabular-nums">{r.best_length_mm} mm</td>
                <td className={`text-right ${r.audit_passed ? "text-emerald-300" : "text-red-300"}`}>{r.audit_passed ? "Pass" : "Fail"}</td>
                <td className="text-right tabular-nums">{r.runtime_ms} ms</td>
                <td className="text-right font-mono text-slate-400" title={r.geometry_hash ?? "unavailable"}>{r.geometry_hash?.slice(0, 12) ?? "—"}</td>
              </tr>)}</tbody>
            </table></div>
            {benchmark.runs.flatMap((r) => r.issues.map((issue, i) => <p key={`${r.run}-${i}`} className="mt-2 text-xs text-red-300">Run {r.run}: {issue}</p>))}
            <p className="mt-3 text-xs text-slate-400">Minimum polygon clearance (best audited layout): {benchmark.best_audit?.minimum_clearance_mm ?? "—"} mm</p>
            <p className="mt-2 text-xs text-amber-200">Preview geometry audit only. Source CAD units, size grading, grainline, notches, fold, cut allowances and cutting process are NOT certified.</p>
          </section>}

          {refinement && <section className="rounded-2xl border border-teal-400/25 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Phase 8 — Audited geometric refinement</h2>
              <span className="text-xs text-teal-300">{refinement.total_runtime_ms} ms • {refinement.candidates_checked} local candidate checks</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">Phase 6 reference</p><p className="mt-1 text-lg font-semibold">{refinement.baseline_length_mm} mm</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">Best audited length</p><p className="mt-1 text-lg font-semibold text-teal-300">{refinement.best_length_mm} mm</p></div>
              <div className="rounded-lg bg-slate-800 p-3"><p className="text-xs text-slate-400">Length reduction</p><p className="mt-1 text-lg font-semibold">{refinement.improvement_percent}%</p></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className={refinement.best_audit.passed ? "text-emerald-300" : "text-red-300"}>Geometry audit: {refinement.best_audit.passed ? "PASS" : "FAIL"}</span>
              <button onClick={() => setResult(refinement.baseline_layout)} className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/5">View baseline</button>
              <button onClick={() => setResult(refinement.best_layout)} className="rounded-lg border border-teal-400/40 px-3 py-2 text-teal-200 hover:bg-white/5">View refined</button>
            </div>
            {refinement.compaction_skipped && <p className="mt-3 text-xs text-amber-200">{refinement.skip_reason}</p>}
            <p className="mt-3 text-xs text-amber-200">Preview only. Valid polygon geometry is not evidence that grainlines, folds, notches, units or cutting instructions match source CAD.</p>
          </section>}

              {!benchmark && !refinement && <div className="an-empty-state">Audit reports will appear here after you run a validation.</div>}
            </div>
          </div>}
          {activeTab === "exports" && <div className="an-export-page">
            <div className="an-section-page-title"><span className="an-overline">FILE OUTPUT</span><h2>Export & share your preview</h2><p>Downloads are labeled for diagnostic use only. No factory cutting approval is implied.</p></div>
            <div className="an-export-grid">
              <section className="an-export-card"><div className="an-export-symbol"><NavIcon name="download" /></div><h3>SVG Layout</h3><p>Save the currently generated layout as an SVG visualization.</p><button className="an-outline-action mt-auto" onClick={() => setActiveTab("workspace")} disabled={!result}>Open canvas to download SVG</button></section>
              <section className="an-export-card"><div className="an-export-symbol"><NavIcon name="file" /></div><h3>Audited DXF + Report</h3><p>Polygon-only diagnostic bundle with geometry report and warning labels.</p><button className="an-outline-action mt-auto" disabled={!result || exportingBundle || loading} onClick={exportAuditedPreviewBundle}>{exportingBundle ? "Exporting..." : "Export Phase 9 ZIP"}</button></section>
              <section className="an-export-card"><div className="an-export-symbol"><NavIcon name="layers" /></div><h3>CAD + Marks Preview</h3><p>Diagnostic nested CAD export with supported source metadata mapping.</p><button className="an-outline-action mt-auto" disabled={!result || !sourceFile || preset!=="imported" || cadAwareExporting || loading} onClick={exportCadAwareNestedPreview}>{cadAwareExporting ? "Exporting..." : "Export Phase 12 ZIP"}</button></section>
            </div>
            {(bundleError || cadAwareError) && <div role="alert" className="an-global-error">{bundleError || cadAwareError}</div>}
            <div className="an-info-note"><strong>NOT FOR CUTTING</strong><p>Source CAD units, fold/grainline directions, seam/cut semantics and TUKAmark round-trip interoperability remain unverified.</p></div>
          </div>}
          <footer className="an-footer"><span>AutoNester · Garment nesting studio</span><span>Development preview — not for cutting</span></footer>
        </div>
      </div>
    </main>
  );
}

function NavIcon({name}: {name: "layout"|"grid"|"file"|"spark"|"shield"|"download"|"settings"|"layers"}) {
  const common = {fill:"none", stroke:"currentColor", strokeWidth:1.7, strokeLinecap:"round" as const, strokeLinejoin:"round" as const};
  const paths: Record<typeof name, React.ReactNode> = {
    layout:<><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12"/></>,
    grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    file:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
    spark:<><path d="M12 3 9.7 9.7 3 12l6.7 2.3L12 21l2.3-6.7L21 12l-6.7-2.3z"/></>,
    shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></>,
    download:<><path d="M12 3v12m-4-4 4 4 4-4M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></>,
    settings:<><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></>,
    layers:<><path d="m12 3 9 5-9 5-9-5 9-5zm-9 9 9 5 9-5M3 16l9 5 9-5"/></>,
  };
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" {...common}>{paths[name]}</svg>;
}
