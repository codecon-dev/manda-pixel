export type ExperimentStatus =
  | { started: false; daysToStart: number }
  | { started: true; day: number };
