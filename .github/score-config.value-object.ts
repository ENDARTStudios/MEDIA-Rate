@"
export class ScoreConfig {
    constructor(
        public readonly weightCompleteness: number = 0.25,
        public readonly weightConsensus: number = 0.30,
        public readonly weightRecency: number = 0.20,
        public readonly weightQuality: number = 0.15,
        public readonly weightOutlier: number = 0.10,
        public readonly minSources: number = 3,
        public readonly maxAgeDays: number = 730,
    ) { }
}
"@ | Out-File -FilePath apps\backend\src\contexts\scoring\domain\score-config.value-object.ts -Encoding utf8