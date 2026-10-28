export type ExperimentStatus =
  | { started: false; daysToStart: number }
  | { started: true; ended?: false; day: number }
  | { started: true; ended: true };
