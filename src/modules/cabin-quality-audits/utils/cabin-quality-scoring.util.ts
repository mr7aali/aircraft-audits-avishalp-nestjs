export const defaultCabinQualityAreaWeights = {
  lav: 25,
  galley: 20,
  main_cabin: 18,
  first_class: 15,
  comfort: 12,
  other: 10,
} as const;

export type CabinQualityAreaGroup = keyof typeof defaultCabinQualityAreaWeights;

export type CabinQualityAreaWeights = Record<CabinQualityAreaGroup, number>;

export type CabinQualityDetailedCheckItemInput = {
  itemName: string;
  status: 'pass' | 'fail' | 'na';
  imageFileIds?: string[];
  hashtags?: string[];
};

export type CabinQualityDetailedAreaInput = {
  areaId: string;
  sectionLabel: string;
  areaGroup?: string;
  checkItems: CabinQualityDetailedCheckItemInput[];
};

export type CabinQualityScoredArea = CabinQualityDetailedAreaInput & {
  areaGroup: CabinQualityAreaGroup;
  configuredGroupWeight: number;
  groupAreaCount: number;
  areaWeight: number;
  applicableItemCount: number;
  passedItemCount: number;
  failedItemCount: number;
  naItemCount: number;
  scorePercent: number;
  earnedPoints: number;
  possiblePoints: number;
  status: 'pass' | 'fail' | 'na';
};

export type CabinQualityScoreSummary = {
  scorePercent: number;
  score: number;
  status: 'PASS' | 'FAIL';
  earnedPoints: number;
  possiblePoints: number;
  applicableAreaCount: number;
  failedAreaCount: number;
  areaWeights: CabinQualityAreaWeights;
};

const roundTo = (value: number, digits = 4) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const isAreaGroup = (value: string): value is CabinQualityAreaGroup =>
  value in defaultCabinQualityAreaWeights;

export const normalizeCabinQualityAreaWeights = (
  input?: Partial<Record<string, number>> | null,
): CabinQualityAreaWeights => ({
  lav: input?.lav ?? defaultCabinQualityAreaWeights.lav,
  galley: input?.galley ?? defaultCabinQualityAreaWeights.galley,
  main_cabin:
    input?.main_cabin ?? defaultCabinQualityAreaWeights.main_cabin,
  first_class:
    input?.first_class ?? defaultCabinQualityAreaWeights.first_class,
  comfort: input?.comfort ?? defaultCabinQualityAreaWeights.comfort,
  other: input?.other ?? defaultCabinQualityAreaWeights.other,
});

export const inferCabinQualityAreaGroup = (
  areaId: string,
  sectionLabel: string,
  areaGroup?: string | null,
): CabinQualityAreaGroup => {
  const explicit = areaGroup?.trim().toLowerCase();
  if (explicit && isAreaGroup(explicit)) {
    return explicit;
  }

  const normalized = `${areaId} ${sectionLabel}`.trim().toLowerCase();
  if (
    normalized.includes('lav') ||
    normalized.includes('restroom') ||
    normalized.includes('toilet')
  ) {
    return 'lav';
  }
  if (normalized.includes('galley')) {
    return 'galley';
  }
  if (normalized.includes('first') || normalized.includes('business')) {
    return 'first_class';
  }
  if (normalized.includes('comfort')) {
    return 'comfort';
  }
  if (normalized.includes('main cabin')) {
    return 'main_cabin';
  }
  return 'other';
};

export const scoreCabinQualityAreaResults = (
  areaResults: CabinQualityDetailedAreaInput[],
  areaWeights?: Partial<Record<string, number>> | null,
): CabinQualityScoredArea[] => {
  const normalizedWeights = normalizeCabinQualityAreaWeights(areaWeights);
  const applicableAreaCounts = {
    lav: 0,
    galley: 0,
    main_cabin: 0,
    first_class: 0,
    comfort: 0,
    other: 0,
  } satisfies CabinQualityAreaWeights;

  const normalizedAreas = areaResults.map((area) => {
    const normalizedGroup = inferCabinQualityAreaGroup(
      area.areaId,
      area.sectionLabel,
      area.areaGroup,
    );
    const applicableItemCount = area.checkItems.filter(
      (item) => item.status !== 'na',
    ).length;

    if (applicableItemCount > 0) {
      applicableAreaCounts[normalizedGroup] += 1;
    }

    return {
      ...area,
      areaGroup: normalizedGroup,
      applicableItemCount,
    };
  });

  return normalizedAreas.map((area) => {
    const passedItemCount = area.checkItems.filter(
      (item) => item.status === 'pass',
    ).length;
    const failedItemCount = area.checkItems.filter(
      (item) => item.status === 'fail',
    ).length;
    const naItemCount = area.checkItems.length - passedItemCount - failedItemCount;
    const groupAreaCount =
      applicableAreaCounts[area.areaGroup as CabinQualityAreaGroup];
    const configuredGroupWeight = normalizedWeights[area.areaGroup];
    const areaWeight =
      area.applicableItemCount > 0 && groupAreaCount > 0
        ? configuredGroupWeight / groupAreaCount
        : 0;
    const scorePercent =
      area.applicableItemCount === 0
        ? 0
        : (passedItemCount / area.applicableItemCount) * 100;
    const earnedPoints =
      area.applicableItemCount === 0 ? 0 : areaWeight * (scorePercent / 100);
    const possiblePoints = area.applicableItemCount === 0 ? 0 : areaWeight;

    return {
      areaId: area.areaId,
      sectionLabel: area.sectionLabel,
      areaGroup: area.areaGroup,
      checkItems: area.checkItems.map((item) => ({
        itemName: item.itemName,
        status: item.status,
        imageFileIds: item.imageFileIds ?? [],
        hashtags: item.hashtags ?? [],
      })),
      configuredGroupWeight: roundTo(configuredGroupWeight),
      groupAreaCount,
      areaWeight: roundTo(areaWeight),
      applicableItemCount: area.applicableItemCount,
      passedItemCount,
      failedItemCount,
      naItemCount,
      scorePercent: roundTo(scorePercent, 2),
      earnedPoints: roundTo(earnedPoints),
      possiblePoints: roundTo(possiblePoints),
      status:
        failedItemCount > 0 ? 'fail' : passedItemCount > 0 ? 'pass' : 'na',
    };
  });
};

export const summarizeCabinQualityScoredAreas = (
  scoredAreas: CabinQualityScoredArea[],
  areaWeights?: Partial<Record<string, number>> | null,
): CabinQualityScoreSummary => {
  const normalizedWeights = normalizeCabinQualityAreaWeights(areaWeights);
  const earnedPoints = roundTo(
    scoredAreas.reduce((sum, area) => sum + area.earnedPoints, 0),
  );
  const possiblePoints = roundTo(
    scoredAreas.reduce((sum, area) => sum + area.possiblePoints, 0),
  );
  const scorePercent =
    possiblePoints <= 0 ? 0 : roundTo((earnedPoints / possiblePoints) * 100, 2);
  const failedAreaCount = scoredAreas.filter(
    (area) => area.status === 'fail',
  ).length;

  return {
    scorePercent,
    score: Math.round(scorePercent),
    status: failedAreaCount > 0 ? 'FAIL' : 'PASS',
    earnedPoints,
    possiblePoints,
    applicableAreaCount: scoredAreas.filter((area) => area.possiblePoints > 0)
      .length,
    failedAreaCount,
    areaWeights: normalizedWeights,
  };
};

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

export const summarizeCabinQualityStoredResults = (
  raw: unknown,
): CabinQualityScoreSummary | null => {
  if (!Array.isArray(raw)) {
    return null;
  }

  const scoredAreas = raw
    .map((entry) => asObject(entry))
    .filter((entry): entry is Record<string, unknown> => entry != null)
    .map((entry) => {
      const areaGroup = inferCabinQualityAreaGroup(
        entry.areaId?.toString() ?? '',
        entry.sectionLabel?.toString() ?? '',
        entry.areaGroup?.toString(),
      );
      const possiblePoints = Number(entry.possiblePoints ?? 0);
      const earnedPoints = Number(entry.earnedPoints ?? 0);
      const scorePercent = Number(entry.scorePercent ?? 0);
      const configuredGroupWeight = Number(
        entry.configuredGroupWeight ?? defaultCabinQualityAreaWeights[areaGroup],
      );

      return {
        areaId: entry.areaId?.toString() ?? '',
        sectionLabel: entry.sectionLabel?.toString() ?? '',
        areaGroup,
        checkItems: [],
        configuredGroupWeight,
        groupAreaCount: Number(entry.groupAreaCount ?? 0),
        areaWeight: Number(entry.areaWeight ?? 0),
        applicableItemCount: Number(entry.applicableItemCount ?? 0),
        passedItemCount: Number(entry.passedItemCount ?? 0),
        failedItemCount: Number(entry.failedItemCount ?? 0),
        naItemCount: Number(entry.naItemCount ?? 0),
        scorePercent,
        earnedPoints,
        possiblePoints,
        status:
          entry.status === 'fail' || entry.status === 'pass'
            ? entry.status
            : Number(entry.failedItemCount ?? 0) > 0
              ? 'fail'
              : Number(entry.passedItemCount ?? 0) > 0
                ? 'pass'
                : 'na',
      } satisfies CabinQualityScoredArea;
    })
    .filter((area) => Number.isFinite(area.possiblePoints));

  if (!scoredAreas.length) {
    return null;
  }

  const storedWeights = scoredAreas.reduce<Partial<Record<string, number>>>(
    (accumulator, area) => ({
      ...accumulator,
      [area.areaGroup]: area.configuredGroupWeight,
    }),
    {},
  );

  return summarizeCabinQualityScoredAreas(scoredAreas, storedWeights);
};
