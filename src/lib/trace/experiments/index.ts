export { runExperiment, DEFAULT_CONFIG, MODEL_PRESETS, type ExperimentConfig, type AgentModelSpec } from "./runner";
export {
  computeRoundMetrics,
  aggregateMetrics,
  roundMetricsToCSV,
  scoreHistoryToCSV,
  type RoundMetrics,
  type ExperimentMetrics,
} from "./metrics";
export {
  descriptiveStats,
  mannWhitneyU,
  detectOutliers,
  aggregateMultiSeed,
  formatPctStat,
  formatSatsStat,
  formatSignificance,
  generateComparisonTable,
  computeDetailedStats,
  cliffsDelta,
  cliffsDeltaCI,
  type DescriptiveStats,
  type MannWhitneyResult,
  type OutlierReport,
  type MultiSeedMetrics,
  type ExperimentResult,
  type DetailedFraudStats,
  type CliffsDeltaCI,
} from "./statistics";
