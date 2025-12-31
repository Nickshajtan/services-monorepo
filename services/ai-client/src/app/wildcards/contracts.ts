export interface WildcardInterface {
  set segments(value: number);

  validatePattern(pattern: string): void;
  getCandidateKeys(key: string): string[];
}
