import { PrismaClient } from '../src/generated/prisma/client.js';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';

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

  const roleCodes = ['VP', 'GM', 'DM', 'SUP', 'ALL', 'EMPLOYEE', 'HR_ADMIN'] as const;
  const roles = await Promise.all(
    roleCodes.map((code) =>
      prisma.role.upsert({
        where: { code },
        update: { name: code.replace('_', ' ') },
        create: {
          code,
          name: code.replace('_', ' '),
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
  const moduleByCode = Object.fromEntries(modules.map((module) => [module.code, module]));

  const fullOpsRoles = ['VP', 'GM', 'DM', 'SUP', 'ALL'];
  for (const roleCode of fullOpsRoles) {
    for (const moduleCode of [
      'CABIN_QUALITY_AUDIT',
      'LAV_SAFETY_OBSERVATION',
      'CABIN_SECURITY_SEARCH_TRAINING',
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
      { code: 'JFK', airportCode: 'JFK', name: 'John F. Kennedy', timezone: 'America/New_York' },
      { code: 'LAX', airportCode: 'LAX', name: 'Los Angeles Intl', timezone: 'America/Los_Angeles' },
    ].map((station) =>
      prisma.station.upsert({
        where: { code: station.code },
        update: station,
        create: station,
      }),
    ),
  );
  const stationByCode = Object.fromEntries(stations.map((station) => [station.code, station]));

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

  const cleanTypes = ['CHARTER', 'DIVERSION', 'DSC_TURN', 'MSGT_TURN', 'RAD', 'RON'];
  for (const [index, code] of cleanTypes.entries()) {
    await prisma.cleanType.upsert({
      where: { code },
      update: { name: code, sortOrder: index + 1, isActive: true },
      create: { code, name: code, sortOrder: index + 1, isActive: true },
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
    'Used Chocks',
    'Safety Stop',
    'Used Guide Cone',
    'Face Mask',
    'Gloves',
    'Shoes',
    'Dump',
    'Flush',
    'Fill',
    '360 Walk Around',
    'Chock Removal Process',
  ];
  for (const [index, label] of lavChecklist.entries()) {
    const code = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    await prisma.lavSafetyChecklistItem.upsert({
      where: { code },
      update: { label, sortOrder: index + 1, isActive: true },
      create: { code, label, sortOrder: index + 1, isActive: true },
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

  // Optional chat sample.
  const sampleConversation = await prisma.chatConversation.upsert({
    where: { directPairKey: [userByUid['sup.user'].id, userByUid['employee.user'].id].sort().join(':') },
    update: {},
    create: {
      conversationType: 'DIRECT',
      directPairKey: [userByUid['sup.user'].id, userByUid['employee.user'].id].sort().join(':'),
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
