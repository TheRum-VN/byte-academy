import { db } from './client.js';
import { lessons } from '@byte/shared';
try {
  for (const l of lessons)
    await db.lesson.upsert({
      where: { id: l.id },
      create: {
        id: l.id,
        module: l.module,
        title: l.title,
        definition: JSON.stringify(l),
        available: l.available,
      },
      update: {
        definition: JSON.stringify(l),
        available: l.available,
        title: l.title,
      },
    });
  console.log(
    `Seeded ${lessons.length} lesson definitions; ${lessons.filter((l) => l.available && !l.config.retired).length} playable lessons.`,
  );
} finally {
  await db.$disconnect();
}
