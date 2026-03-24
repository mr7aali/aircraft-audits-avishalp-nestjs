export interface AircraftSeatMapAmenityDefault {
  leftSvg?: string;
  leftId?: string;
  rightSvg?: string;
  rightId?: string;
  centerOnly?: boolean;
  customLabel?: string;
}

export interface AircraftSeatMapSectionDefault {
  name: string;
  startRow: number;
  endRow: number;
  leftCols: string[];
  rightCols: string[];
  areaType?: 'first_class' | 'comfort' | 'main_cabin';
  hasExitBefore?: boolean;
  hasExitAfter?: boolean;
  amenitiesBefore?: AircraftSeatMapAmenityDefault[];
  amenitiesAfter?: AircraftSeatMapAmenityDefault[];
  skipRows?: number[];
}

export interface AircraftSeatMapDefault {
  hasFirstClassArc?: boolean;
  sections: AircraftSeatMapSectionDefault[];
}

export const DEFAULT_AIRCRAFT_SEAT_MAPS: Record<
  string,
  AircraftSeatMapDefault
> = {
  B757_300_75Y: {
    hasFirstClassArc: true,
    sections: [
      {
        name: 'First Class',
        startRow: 1,
        endRow: 6,
        leftCols: ['A', 'B'],
        rightCols: ['C', 'D'],
        areaType: 'first_class',
        amenitiesBefore: [
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV FWD',
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley FWD',
          },
        ],
        hasExitBefore: true,
        amenitiesAfter: [
          {
            customLabel: 'Closet',
          },
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV MID L',
            rightSvg: 'assets/icons/toilet.svg',
            rightId: 'LAV MID R',
          },
        ],
      },
      {
        name: 'Delta Comfort',
        startRow: 14,
        endRow: 21,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'comfort',
        hasExitBefore: true,
        skipRows: [14],
      },
      {
        name: 'Delta Main',
        startRow: 22,
        endRow: 40,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'main_cabin',
        amenitiesAfter: [
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV AFT L',
            rightSvg: 'assets/icons/toilet.svg',
            rightId: 'LAV AFT R',
          },
        ],
        hasExitAfter: true,
      },
      {
        name: '',
        startRow: 41,
        endRow: 49,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'main_cabin',
        amenitiesAfter: [
          {
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley AFT',
            centerOnly: true,
          },
        ],
        hasExitAfter: true,
      },
    ],
  },
  B737_800: {
    sections: [
      {
        name: 'First Class',
        startRow: 1,
        endRow: 4,
        leftCols: ['A', 'B'],
        rightCols: ['C', 'D'],
        areaType: 'first_class',
        amenitiesBefore: [
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV FWD',
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley FWD',
          },
        ],
        hasExitBefore: true,
      },
      {
        name: 'Main Cabin',
        startRow: 7,
        endRow: 20,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'main_cabin',
        hasExitBefore: true,
      },
      {
        name: '',
        startRow: 21,
        endRow: 33,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'main_cabin',
        hasExitAfter: true,
        amenitiesAfter: [
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV AFT L',
            rightSvg: 'assets/icons/toilet.svg',
            rightId: 'LAV AFT R',
          },
          {
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley AFT',
            centerOnly: true,
          },
        ],
      },
    ],
  },
  A320: {
    sections: [
      {
        name: 'Business Class',
        startRow: 1,
        endRow: 3,
        leftCols: ['A', 'B'],
        rightCols: ['C', 'D'],
        areaType: 'first_class',
        amenitiesBefore: [
          {
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley FWD',
            centerOnly: true,
          },
        ],
      },
      {
        name: 'Economy',
        startRow: 8,
        endRow: 18,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'main_cabin',
        hasExitBefore: true,
      },
      {
        name: '',
        startRow: 19,
        endRow: 30,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'main_cabin',
        hasExitAfter: true,
        amenitiesAfter: [
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV L',
            rightSvg: 'assets/icons/toilet.svg',
            rightId: 'LAV R',
          },
        ],
      },
    ],
  },
  A321_200: {
    sections: [
      {
        name: 'First Class',
        startRow: 1,
        endRow: 5,
        leftCols: ['A', 'B'],
        rightCols: ['C', 'D'],
        areaType: 'first_class',
        amenitiesBefore: [
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV FWD',
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley FWD',
          },
        ],
      },
      {
        name: 'Comfort+',
        startRow: 10,
        endRow: 16,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'comfort',
        hasExitBefore: true,
      },
      {
        name: 'Main Cabin',
        startRow: 17,
        endRow: 37,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'main_cabin',
        hasExitAfter: true,
        amenitiesAfter: [
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV AFT L',
            rightSvg: 'assets/icons/toilet.svg',
            rightId: 'LAV AFT R',
          },
          {
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley AFT',
            centerOnly: true,
          },
        ],
      },
    ],
  },
  A319: {
    sections: [
      {
        name: 'First Class',
        startRow: 1,
        endRow: 3,
        leftCols: ['A', 'B'],
        rightCols: ['C', 'D'],
        areaType: 'first_class',
        amenitiesBefore: [
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV FWD',
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley FWD',
          },
        ],
      },
      {
        name: 'Main Cabin',
        startRow: 8,
        endRow: 20,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'main_cabin',
        hasExitBefore: true,
      },
      {
        name: '',
        startRow: 21,
        endRow: 26,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'main_cabin',
        hasExitAfter: true,
        amenitiesAfter: [
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV AFT L',
            rightSvg: 'assets/icons/toilet.svg',
            rightId: 'LAV AFT R',
          },
          {
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley AFT',
            centerOnly: true,
          },
        ],
      },
    ],
  },
  A220_300: {
    sections: [
      {
        name: 'First Class',
        startRow: 1,
        endRow: 4,
        leftCols: ['A', 'B'],
        rightCols: ['C', 'D'],
        areaType: 'first_class',
        amenitiesBefore: [
          {
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley FWD',
            centerOnly: true,
          },
        ],
      },
      {
        name: 'Comfort+',
        startRow: 8,
        endRow: 12,
        leftCols: ['A', 'B'],
        rightCols: ['C', 'D', 'E'],
        areaType: 'comfort',
        hasExitBefore: true,
      },
      {
        name: 'Main Cabin',
        startRow: 13,
        endRow: 28,
        leftCols: ['A', 'B'],
        rightCols: ['C', 'D', 'E'],
        areaType: 'main_cabin',
        hasExitAfter: true,
        amenitiesAfter: [
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV AFT',
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley AFT',
          },
        ],
      },
    ],
  },
  B737_900ER: {
    sections: [
      {
        name: 'First Class',
        startRow: 1,
        endRow: 4,
        leftCols: ['A', 'B'],
        rightCols: ['C', 'D'],
        areaType: 'first_class',
        amenitiesBefore: [
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV FWD',
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley FWD',
          },
        ],
        hasExitBefore: true,
      },
      {
        name: 'Comfort+',
        startRow: 7,
        endRow: 15,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'comfort',
        hasExitBefore: true,
      },
      {
        name: 'Main Cabin',
        startRow: 16,
        endRow: 39,
        leftCols: ['A', 'B', 'C'],
        rightCols: ['D', 'E', 'F'],
        areaType: 'main_cabin',
        hasExitAfter: true,
        amenitiesAfter: [
          {
            leftSvg: 'assets/icons/toilet.svg',
            leftId: 'LAV AFT L',
            rightSvg: 'assets/icons/toilet.svg',
            rightId: 'LAV AFT R',
          },
          {
            rightSvg: 'assets/icons/chiken.svg',
            rightId: 'Galley AFT',
            centerOnly: true,
          },
        ],
      },
    ],
  },
};
