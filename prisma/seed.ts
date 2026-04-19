import { Prisma, PrismaClient } from '../src/generated/prisma-client/client.js';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { DEFAULT_AIRCRAFT_SEAT_MAPS } from '../src/modules/master-data/aircraft-seat-map.defaults.js';
import { DynamicFormTemplateStatus } from '../src/generated/prisma-client/enums.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for seeding');
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
});

async function main() {
  const passwordHash = await argon2.hash('Password@123');

  const roleCodes = [
    'VP',
    'GM',
    'DM',
    'SUP',
    'ALL',
    'EMPLOYEE',
    'HR_ADMIN',
  ] as const;
  const roleNames: Record<(typeof roleCodes)[number], string> = {
    VP: 'Vice President',
    GM: 'General Manager',
    DM: 'Duty Manager',
    SUP: 'Supervisor',
    ALL: 'All',
    EMPLOYEE: 'Employee',
    HR_ADMIN: 'HR Admin',
  };
  const roles = await Promise.all(
    roleCodes.map((code) =>
      prisma.role.upsert({
        where: { code },
        update: { name: roleNames[code] },
        create: {
          code,
          name: roleNames[code],
        },
      }),
    ),
  );
  const roleByCode = Object.fromEntries(roles.map((role) => [role.code, role]));

  const modules = await Promise.all(
    [
      ['CABIN_QUALITY_AUDIT', 'Cabin Quality Audit'],
      ['LAV_SAFETY_OBSERVATION', 'LAV Safety Observation'],
      ['CABIN_SECURITY_SEARCH_TRAINING', 'Cabin Security Search Training'],
      ['HIDDEN_OBJECT_AUDIT', 'Hidden Object Audit'],
      ['END_OF_SHIFT_REPORT', 'End Of Shift Report'],
      ['EMPLOYEE_ONE_ON_ONE', 'Employee 1:1'],
      ['FEEDBACK', 'Feedback'],
      ['CHAT', 'Chat'],
      ['MASTER_DATA', 'Master Data'],
      ['FILES', 'Files'],
      ['STATIONS', 'Stations'],
    ].map(([code, name]) =>
      prisma.appModule.upsert({
        where: { code },
        update: { name },
        create: { code, name },
      }),
    ),
  );
  const moduleByCode = Object.fromEntries(
    modules.map((module) => [module.code, module]),
  );

  const fullOpsRoles = ['VP', 'GM', 'DM', 'SUP', 'ALL'];
  for (const roleCode of fullOpsRoles) {
    for (const moduleCode of [
      'CABIN_QUALITY_AUDIT',
      'LAV_SAFETY_OBSERVATION',
      'CABIN_SECURITY_SEARCH_TRAINING',
      'HIDDEN_OBJECT_AUDIT',
      'END_OF_SHIFT_REPORT',
    ]) {
      await prisma.roleModuleAccess.upsert({
        where: {
          roleId_moduleId: {
            roleId: roleByCode[roleCode].id,
            moduleId: moduleByCode[moduleCode].id,
          },
        },
        update: {
          canList: true,
          canView: true,
          canCreate: true,
        },
        create: {
          roleId: roleByCode[roleCode].id,
          moduleId: moduleByCode[moduleCode].id,
          canList: true,
          canView: true,
          canCreate: true,
        },
      });
    }

    await prisma.roleModuleAccess.upsert({
      where: {
        roleId_moduleId: {
          roleId: roleByCode[roleCode].id,
          moduleId: moduleByCode.EMPLOYEE_ONE_ON_ONE.id,
        },
      },
      update: {
        canCreate: true,
        canList: true,
        canView: true,
      },
      create: {
        roleId: roleByCode[roleCode].id,
        moduleId: moduleByCode.EMPLOYEE_ONE_ON_ONE.id,
        canCreate: true,
        canList: true,
        canView: true,
      },
    });
  }

  const feedbackListRoles = ['VP', 'GM', 'DM', 'SUP', 'ALL', 'HR_ADMIN'];
  for (const roleCode of feedbackListRoles) {
    await prisma.roleModuleAccess.upsert({
      where: {
        roleId_moduleId: {
          roleId: roleByCode[roleCode].id,
          moduleId: moduleByCode.FEEDBACK.id,
        },
      },
      update: {
        canList: true,
        canView: true,
        canCreate: true,
      },
      create: {
        roleId: roleByCode[roleCode].id,
        moduleId: moduleByCode.FEEDBACK.id,
        canList: true,
        canView: true,
        canCreate: true,
      },
    });
  }

  await prisma.roleModuleAccess.upsert({
    where: {
      roleId_moduleId: {
        roleId: roleByCode.EMPLOYEE.id,
        moduleId: moduleByCode.CHAT.id,
      },
    },
    update: { canList: true, canView: true, canCreate: true },
    create: {
      roleId: roleByCode.EMPLOYEE.id,
      moduleId: moduleByCode.CHAT.id,
      canList: true,
      canView: true,
      canCreate: true,
    },
  });

  for (const role of roles) {
    for (const moduleCode of ['CHAT', 'MASTER_DATA', 'FILES', 'STATIONS']) {
      await prisma.roleModuleAccess.upsert({
        where: {
          roleId_moduleId: {
            roleId: role.id,
            moduleId: moduleByCode[moduleCode].id,
          },
        },
        update: { canList: true, canView: true, canCreate: true },
        create: {
          roleId: role.id,
          moduleId: moduleByCode[moduleCode].id,
          canList: true,
          canView: true,
          canCreate: true,
        },
      });
    }
  }

  const stations = await Promise.all(
    [
      {
        code: 'JFK',
        airportCode: 'JFK',
        name: 'John F. Kennedy',
        timezone: 'America/New_York',
      },
      {
        code: 'LAX',
        airportCode: 'LAX',
        name: 'Los Angeles Intl',
        timezone: 'America/Los_Angeles',
      },
    ].map((station) =>
      prisma.station.upsert({
        where: { code: station.code },
        update: station,
        create: station,
      }),
    ),
  );
  const stationByCode = Object.fromEntries(
    stations.map((station) => [station.code, station]),
  );

  for (const station of stations) {
    for (const gateCode of ['A1', 'A2', 'B1']) {
      await prisma.gate.upsert({
        where: {
          stationId_gateCode: {
            stationId: station.id,
            gateCode,
          },
        },
        update: { name: `Gate ${gateCode}` },
        create: {
          stationId: station.id,
          gateCode,
          name: `Gate ${gateCode}`,
        },
      });
    }
  }

  const cleanTypes = [
    ['CHARTER', 'Charter'],
    ['DIVERSION', 'Diversion'],
    ['DSC_TURN', 'DSC Turn (Normal)'],
    ['MSGT_TURN', 'MSGT Turn (Quick)'],
    ['RAD', 'RAD - Remain All Day (4+ Hours)'],
    ['RON', 'RON - Remain Over Night'],
  ] as const;
  for (const [index, [code, name]] of cleanTypes.entries()) {
    await prisma.cleanType.upsert({
      where: { code },
      update: { name, sortOrder: index + 1, isActive: true },
      create: { code, name, sortOrder: index + 1, isActive: true },
    });
  }

  const aircraftTypes = [
    ['B757_300_75Y', 'Boeing 757-300 (75Y)'],
    ['B737_800', 'Boeing 737-800'],
    ['A320', 'Airbus A320'],
    ['A321_200', 'Airbus A321-200'],
    ['A319', 'Airbus A319'],
    ['A220_300', 'Airbus A220-300'],
    ['B737_900ER', 'Boeing 737-900ER'],
  ] as const;
  for (const [index, [code, name]] of aircraftTypes.entries()) {
    await prisma.aircraftType.upsert({
      where: { code },
      update: {
        name,
        sortOrder: index + 1,
        isActive: true,
        seatMapJson: DEFAULT_AIRCRAFT_SEAT_MAPS[
          code
        ] as unknown as Prisma.InputJsonValue,
      },
      create: {
        code,
        name,
        sortOrder: index + 1,
        isActive: true,
        seatMapJson: DEFAULT_AIRCRAFT_SEAT_MAPS[
          code
        ] as unknown as Prisma.InputJsonValue,
      },
    });
  }

  const allAircraftTypes = await prisma.aircraftType.findMany({
    select: { id: true, name: true },
  });
  const aircraftTypeIdByName = Object.fromEntries(
    allAircraftTypes.map((item) => [item.name, item.id]),
  );

  const fleetAircraft = [
    ['N751DN', 'Boeing 757-300 (75Y)', 'Delta Ship 751'],
    ['N802DN', 'Boeing 737-800', 'Delta Ship 802'],
    ['N320DL', 'Airbus A320', 'Delta Ship 320'],
    ['N321DL', 'Airbus A321-200', 'Delta Ship 321'],
    ['N319DL', 'Airbus A319', 'Delta Ship 319'],
    ['N223DU', 'Airbus A220-300', 'Delta Ship 223'],
    ['N939DN', 'Boeing 737-900ER', 'Delta Ship 939'],
  ] as const;

  for (const [shipNumber, aircraftTypeName, displayName] of fleetAircraft) {
    const aircraftTypeId = aircraftTypeIdByName[aircraftTypeName];
    if (!aircraftTypeId) {
      continue;
    }

    await prisma.fleetAircraft.upsert({
      where: { shipNumber },
      update: {
        aircraftTypeId,
        displayName,
        isActive: true,
      },
      create: {
        shipNumber,
        aircraftTypeId,
        displayName,
        isActive: true,
      },
    });
  }

  const cabinChecklist = [
    'First Class',
    'Front Galley',
    'Back Galley',
    'Front LAVs',
    'MID LAVs',
    'AFT LAVs',
    'Floor/Carpets',
    'Seat Back Trash',
    'Tray Tables',
    'IFE Screens',
    'Life vest seal',
  ];
  for (const [index, label] of cabinChecklist.entries()) {
    const code = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    await prisma.cabinQualityChecklistItem.upsert({
      where: { code },
      update: { label, sortOrder: index + 1, isActive: true },
      create: { code, label, sortOrder: index + 1, isActive: true },
    });
  }

  const lavChecklist = [
    {
      label: 'Used Chocks',
      description:
        'Confirm wheel chocks are positioned correctly before servicing begins.',
    },
    {
      label: 'Safety Stop',
      description:
        'Verify the lavatory truck safety stop is engaged and stable during servicing.',
    },
    {
      label: 'Used Guide Cone',
      description:
        'Check that a guide cone is placed correctly to secure the work area.',
    },
    {
      label: 'Face Mask',
      description:
        'Ensure the operator is wearing the required face mask or respiratory protection.',
    },
    {
      label: 'Gloves',
      description:
        'Ensure protective gloves are worn while performing the lavatory service task.',
    },
    {
      label: 'Shoes',
      description:
        'Confirm the operator is wearing appropriate closed-toe safety footwear.',
    },
    {
      label: 'Dump',
      description:
        'Verify the dump process is completed safely without leakage or contamination.',
    },
    {
      label: 'Flush',
      description:
        'Confirm the flush process is performed completely and according to procedure.',
    },
    {
      label: 'Fill',
      description:
        'Verify the lavatory system is refilled correctly and safely after service.',
    },
    {
      label: '360 Walk Around',
      description:
        'Confirm a full 360-degree walk-around inspection is completed before departure.',
    },
    {
      label: 'Chock Removal Process',
      description:
        'Verify chocks are removed only after servicing is complete and the area is safe.',
    },
  ];
  for (const [index, item] of lavChecklist.entries()) {
    const label = item.label;
    const code = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    await prisma.lavSafetyChecklistItem.upsert({
      where: { code },
      update: {
        label,
        description: item.description,
        sortOrder: index + 1,
        isActive: true,
      },
      create: {
        code,
        label,
        description: item.description,
        sortOrder: index + 1,
        isActive: true,
      },
    });
  }

  const securityAreas = [
    'First Class',
    'Front Galley',
    'Back Galley',
    'Front LAVs',
    'MID LAVs',
    'AFT LAVs',
    'Floor/Carpets',
    'Seat Back Trash',
    'Tray Tables',
    'IFE Screens',
    'Comfort',
  ];
  for (const [index, label] of securityAreas.entries()) {
    const code = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    await prisma.securitySearchArea.upsert({
      where: { code },
      update: { label, sortOrder: index + 1, isActive: true },
      create: { code, label, sortOrder: index + 1, isActive: true },
    });
  }

  const users = [
    {
      uid: 'vp.user',
      email: 'vp.user@example.com',
      firstName: 'Victor',
      lastName: 'Prime',
      roleCode: 'VP',
      stationCode: 'JFK',
      isDefault: true,
    },
    {
      uid: 'sup.user',
      email: 'sup.user@example.com',
      firstName: 'Sara',
      lastName: 'Supervisor',
      roleCode: 'SUP',
      stationCode: 'JFK',
      isDefault: true,
    },
    {
      uid: 'employee.user',
      email: 'employee.user@example.com',
      firstName: 'Eli',
      lastName: 'Employee',
      roleCode: 'EMPLOYEE',
      stationCode: 'JFK',
      isDefault: true,
    },
    {
      uid: 'hr.user',
      email: 'hr.user@example.com',
      firstName: 'Hana',
      lastName: 'HR',
      roleCode: 'HR_ADMIN',
      stationCode: 'JFK',
      isDefault: true,
    },
    {
      uid: 'gm.user',
      email: 'gm.user@example.com',
      firstName: 'Gina',
      lastName: 'Manager',
      roleCode: 'GM',
      stationCode: 'LAX',
      isDefault: true,
    },
  ];

  const userByUid: Record<string, { id: string }> = {};
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { uid: userData.uid },
      update: {
        email: userData.email.toLowerCase(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash,
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
      create: {
        uid: userData.uid.toLowerCase(),
        email: userData.email.toLowerCase(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash,
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
      select: { id: true },
    });
    userByUid[userData.uid] = user;

    await prisma.userStationAccess.upsert({
      where: {
        userId_stationId: {
          userId: user.id,
          stationId: stationByCode[userData.stationCode].id,
        },
      },
      update: {
        roleId: roleByCode[userData.roleCode].id,
        isDefault: userData.isDefault,
        isActive: true,
      },
      create: {
        userId: user.id,
        stationId: stationByCode[userData.stationCode].id,
        roleId: roleByCode[userData.roleCode].id,
        isDefault: userData.isDefault,
        isActive: true,
      },
    });
  }

  // Extra station access to test station switching.
  await prisma.userStationAccess.upsert({
    where: {
      userId_stationId: {
        userId: userByUid['sup.user'].id,
        stationId: stationByCode.LAX.id,
      },
    },
    update: {
      roleId: roleByCode.SUP.id,
      isDefault: false,
      isActive: true,
    },
    create: {
      userId: userByUid['sup.user'].id,
      stationId: stationByCode.LAX.id,
      roleId: roleByCode.SUP.id,
      isDefault: false,
      isActive: true,
    },
  });

  for (const station of stations) {
    for (const [index, shift] of ['MORNING', 'EVENING', 'NIGHT'].entries()) {
      const def = await prisma.shiftDefinition.upsert({
        where: {
          stationId_code: {
            stationId: station.id,
            code: shift,
          },
        },
        update: {
          name: shift,
          startsLocalMinutes: index * 480,
          endsLocalMinutes: (index + 1) * 480,
          isActive: true,
        },
        create: {
          stationId: station.id,
          code: shift,
          name: shift,
          startsLocalMinutes: index * 480,
          endsLocalMinutes: (index + 1) * 480,
          isActive: true,
        },
      });

      const businessDate = new Date();
      businessDate.setHours(0, 0, 0, 0);
      await prisma.shiftOccurrence.upsert({
        where: {
          stationId_shiftDefinitionId_businessDate: {
            stationId: station.id,
            shiftDefinitionId: def.id,
            businessDate,
          },
        },
        update: {
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        },
        create: {
          stationId: station.id,
          shiftDefinitionId: def.id,
          businessDate,
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        },
      });
    }
  }

  const dynamicFormSeeds = [
    {
      title: 'Cabin Quality Audit',
      description:
        'Inspect cabin presentation, overhead bins, seat areas, and final operational remarks.',
      category: 'Cabin Quality',
      formType: 'SURVEY',
      status: DynamicFormTemplateStatus.PUBLISHED,
      stationCode: 'JFK',
      createdByUid: 'sup.user',
      questions: [
        {
          id: 'cq_gate',
          type: 'short-answer',
          title: 'Gate / location',
          description: 'Where is this inspection taking place?',
          required: true,
          options: [],
        },
        {
          id: 'cq_ship',
          type: 'short-answer',
          title: 'Ship / tail number',
          description: 'Example: N751DN',
          required: true,
          options: [],
        },
        {
          id: 'cq_front_galley',
          type: 'multiple-choice',
          title: 'Front galley overall state',
          description: 'Choose the current presentation status.',
          required: true,
          options: ['Pass', 'Fail', 'Needs Review'],
        },
        {
          id: 'cq_areas',
          type: 'checkboxes',
          title: 'Areas checked',
          description: 'Select all inspected areas.',
          required: true,
          options: [
            'Overhead bins',
            'Seat pockets',
            'Tray tables',
            'IFE screens',
          ],
        },
        {
          id: 'cq_notes',
          type: 'paragraph',
          title: 'Inspector notes',
          description: 'Add any comments or findings.',
          required: false,
          options: [],
        },
      ],
      submissions: [
        {
          submittedByUid: 'employee.user',
          answers: {
            cq_gate: 'JFK A1',
            cq_ship: 'N751DN',
            cq_front_galley: 'Pass',
            cq_areas: ['Overhead bins', 'Tray tables', 'IFE screens'],
            cq_notes: 'Cabin looked ready for boarding. One seat pocket needed a quick wipe.',
          },
        },
      ],
    },
    {
      title: 'LAV Safety Observation',
      description:
        'Verify lavatory safety equipment, servicing posture, and maintenance notes.',
      category: 'Safety',
      formType: 'SURVEY',
      status: DynamicFormTemplateStatus.PUBLISHED,
      stationCode: 'JFK',
      createdByUid: 'sup.user',
      questions: [
        {
          id: 'ls_position',
          type: 'dropdown',
          title: 'Lavatory position',
          description: 'Select the position being inspected.',
          required: true,
          options: ['Forward', 'Mid', 'Aft'],
        },
        {
          id: 'ls_equipment',
          type: 'multiple-choice',
          title: 'Safety equipment present',
          description: 'Confirm detectors, placards, and extinguisher.',
          required: true,
          options: ['Pass', 'Fail'],
        },
        {
          id: 'ls_readiness',
          type: 'rating',
          title: 'Overall readiness score',
          description: 'Rate the lavatory condition from 1 to 5.',
          required: false,
          options: [],
        },
        {
          id: 'ls_notes',
          type: 'paragraph',
          title: 'Maintenance notes',
          description: 'Capture any issue details for follow-up.',
          required: false,
          options: [],
        },
      ],
      submissions: [
        {
          submittedByUid: 'employee.user',
          answers: {
            ls_position: 'Aft',
            ls_equipment: 'Pass',
            ls_readiness: 4,
            ls_notes: 'Placards and detector checked. Minor cosmetic wear on panel edge.',
          },
        },
      ],
    },
    {
      title: 'Cabin Security Search Training',
      description:
        'Run a training search, capture tested areas, and submit the debrief summary.',
      category: 'Security',
      formType: 'SURVEY',
      status: DynamicFormTemplateStatus.DRAFT,
      stationCode: 'LAX',
      createdByUid: 'gm.user',
      questions: [
        {
          id: 'cs_ship',
          type: 'short-answer',
          title: 'Ship / tail number',
          description: 'Enter the assigned aircraft.',
          required: true,
          options: [],
        },
        {
          id: 'cs_hidden_count',
          type: 'short-answer',
          title: 'Number of hidden items',
          description: 'Keep this hidden from the team until the end.',
          required: true,
          options: [],
        },
        {
          id: 'cs_areas',
          type: 'checkboxes',
          title: 'Areas tested today',
          description: 'Choose all tested locations.',
          required: true,
          options: [
            'Galley carts',
            'Life vests under seats',
            'Overhead bins',
            'Lavatory waste flaps',
            'Flight deck access',
          ],
        },
        {
          id: 'cs_debrief',
          type: 'paragraph',
          title: 'Training debrief',
          description: 'Summarize misses and coaching notes.',
          required: true,
          options: [],
        },
      ],
      submissions: [],
    },
  ] as const;

  for (const formSeed of dynamicFormSeeds) {
    const station = stationByCode[formSeed.stationCode];
    const creator = userByUid[formSeed.createdByUid];
    if (!station || !creator) {
      continue;
    }

    const existingTemplate = await prisma.dynamicFormTemplate.findFirst({
      where: {
        stationId: station.id,
        title: formSeed.title,
      },
      select: {
        id: true,
        publishedAt: true,
      },
    });

    const template = existingTemplate
      ? await prisma.dynamicFormTemplate.update({
          where: { id: existingTemplate.id },
          data: {
            title: formSeed.title,
            description: formSeed.description,
            category: formSeed.category,
            formType: formSeed.formType,
            status: formSeed.status,
            questionCount: formSeed.questions.length,
            estimatedMinutes: Math.max(1, Math.ceil(formSeed.questions.length / 3)),
            schemaJson: formSeed.questions as unknown as Prisma.InputJsonValue,
            createdByUserId: creator.id,
            updatedByUserId: creator.id,
            publishedAt:
              formSeed.status === DynamicFormTemplateStatus.PUBLISHED
                ? existingTemplate.publishedAt ?? new Date()
                : null,
            archivedAt: null,
          },
          select: {
            id: true,
          },
        })
      : await prisma.dynamicFormTemplate.create({
          data: {
            stationId: station.id,
            title: formSeed.title,
            description: formSeed.description,
            category: formSeed.category,
            formType: formSeed.formType,
            status: formSeed.status,
            version: 1,
            questionCount: formSeed.questions.length,
            estimatedMinutes: Math.max(1, Math.ceil(formSeed.questions.length / 3)),
            schemaJson: formSeed.questions as unknown as Prisma.InputJsonValue,
            createdByUserId: creator.id,
            updatedByUserId: creator.id,
            publishedAt:
              formSeed.status === DynamicFormTemplateStatus.PUBLISHED
                ? new Date()
                : null,
          },
          select: {
            id: true,
          },
        });

    const existingSubmissionCount = await prisma.dynamicFormSubmission.count({
      where: {
        templateId: template.id,
      },
    });

    if (existingSubmissionCount > 0) {
      continue;
    }

    for (const submissionSeed of formSeed.submissions) {
      const submitter = userByUid[submissionSeed.submittedByUid];
      if (!submitter) {
        continue;
      }

      const submitterProfile = await prisma.user.findUnique({
        where: { id: submitter.id },
        select: {
          firstName: true,
          lastName: true,
        },
      });

      const submitterAccess = await prisma.userStationAccess.findUnique({
        where: {
          userId_stationId: {
            userId: submitter.id,
            stationId: station.id,
          },
        },
        include: {
          role: true,
        },
      });

      if (!submitterProfile || !submitterAccess) {
        continue;
      }

      await prisma.dynamicFormSubmission.create({
        data: {
          templateId: template.id,
          stationId: station.id,
          submittedByUserId: submitter.id,
          submittedByName:
            `${submitterProfile.firstName} ${submitterProfile.lastName}`.trim(),
          submittedByRole: submitterAccess.role.name,
          answersJson: submissionSeed.answers as unknown as Prisma.InputJsonValue,
          metadataJson: {
            source: 'seed',
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  // Optional chat sample.
  const sampleConversation = await prisma.chatConversation.upsert({
    where: {
      directPairKey: [userByUid['sup.user'].id, userByUid['employee.user'].id]
        .sort()
        .join(':'),
    },
    update: {},
    create: {
      conversationType: 'DIRECT',
      directPairKey: [userByUid['sup.user'].id, userByUid['employee.user'].id]
        .sort()
        .join(':'),
      createdByUserId: userByUid['sup.user'].id,
      participants: {
        create: [
          { userId: userByUid['sup.user'].id, memberRole: 'OWNER' },
          { userId: userByUid['employee.user'].id, memberRole: 'MEMBER' },
        ],
      },
    },
  });

  if (!sampleConversation.lastMessageId) {
    const message = await prisma.chatMessage.create({
      data: {
        conversationId: sampleConversation.id,
        senderUserId: userByUid['sup.user'].id,
        messageType: 'TEXT',
        encryptedPayload: 'seed-message',
        previewText: 'Welcome to chat',
      },
    });
    await prisma.chatConversation.update({
      where: { id: sampleConversation.id },
      data: {
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
