import { db } from '../apps/server/src/database/client.js';
import { lessons } from '@byte/shared';
import { hash } from 'bcryptjs';
try {
  await db.teacher.create({
    data: {
      username: 'e2e-teacher',
      name: 'Giáo viên kiểm thử',
      passwordHash: await hash('e2e-only-passphrase', 4),
    },
  });
  for (const l of lessons)
    await db.lesson.create({
      data: {
        id: l.id,
        module: l.module,
        title: l.title,
        definition: JSON.stringify(l),
        available: l.available,
      },
    });
} finally {
  await db.$disconnect();
}
