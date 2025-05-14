// server/src/cronJob.ts
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import { courseCache, divisionCache, contentCache } from './routes/courseRoutes';

const prisma = new PrismaClient();

async function fetchAndCacheAllData() {
  console.log('Cron job started at:', new Date().toISOString());
  try {
    const teachers = await prisma.teacher.findMany({ select: { id: true } });
    console.log('Teachers found:', teachers.map(t => t.id));

    for (const teacher of teachers) {
      try {
        console.log(`Fetching data for teacher ${teacher.id}...`);
        const courses = await prisma.course.findMany({
          where: { teacherId: teacher.id },
          select: {
            id: true,
            name: true,
            thumbnailUrl: true,
            price: true,
          },
        });
        console.log(`Caching ${courses.length} courses for teacher ${teacher.id}:`, courses);
        courseCache.set(teacher.id, courses.map(course => ({
          id: course.id,
          name: course.name,
          thumbnailUrl: course.thumbnailUrl,
          price: course.price || 0,
        })));

        for (const course of courses) {
          const divisions = await prisma.division.findMany({
            where: { courseId: course.id },
            select: {
              id: true,
              title: true,
              order: true,
            },
            orderBy: { order: 'asc' },
          });
          console.log(`Caching ${divisions.length} divisions for course ${course.id}`);
          divisionCache.set(course.id, divisions);
        }

        const divisionIds = Array.from(divisionCache.keys()).flatMap(courseId =>
          (divisionCache.get(courseId) || []).map(div => div.id)
        );
        for (const divisionId of divisionIds) {
          const contents = await prisma.content.findMany({
            where: { divisionId },
            select: {
              id: true,
              title: true,
              type: true,
              category: true,
              fileUrl: true,
              duration: true,
            },
            orderBy: { createdAt: 'asc' },
          });
          console.log(`Caching ${contents.length} contents for division ${divisionId}`);
          contentCache.set(divisionId, contents);
        }
      } catch (error) {
        console.error(`Error processing teacher ${teacher.id}:`, error);
      }
    }

    const activeTeacherIds = new Set(teachers.map(t => t.id));
    for (const teacherId of courseCache.keys()) {
      if (!activeTeacherIds.has(teacherId)) {
        courseCache.delete(teacherId);
        console.log(`Cleared stale course cache for teacher ${teacherId}`);
      }
    }
    for (const courseId of divisionCache.keys()) {
      const course = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } });
      if (!course || !activeTeacherIds.has(course.teacherId)) {
        divisionCache.delete(courseId);
        console.log(`Cleared stale division cache for course ${courseId}`);
      }
    }
    for (const divisionId of contentCache.keys()) {
      const division = await prisma.division.findUnique({
        where: { id: divisionId },
        include: { course: { select: { teacherId: true } } },
      });
      if (!division || !activeTeacherIds.has(division.course.teacherId)) {
        contentCache.delete(divisionId);
        console.log(`Cleared stale content cache for division ${divisionId}`);
      }
    }

    console.log('Cache sizes:', {
      courses: courseCache.size,
      divisions: divisionCache.size,
      contents: contentCache.size,
    });
    console.log('Memory usage:', process.memoryUsage());
  } catch (error) {
    console.error('Cron job error:', error);
  }
}

cron.schedule('*/10 * * * *', fetchAndCacheAllData);

fetchAndCacheAllData();

export default cron;