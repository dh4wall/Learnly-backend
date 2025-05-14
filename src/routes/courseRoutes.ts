// // server/src/routes/courseRoutes.ts
// import express from 'express';
// import { PrismaClient, Teacher } from '@prisma/client';
// import { v2 as cloudinary } from 'cloudinary';
// import multer from 'multer';
// import passport from 'passport';
// import fs from 'fs';
// import path from 'path';
// import { Readable } from 'stream';

// // In-memory caches
// const courseCache = new Map<number, any[]>();
// const divisionCache = new Map<number, any[]>();
// const contentCache = new Map<number, any[]>();

// const router = express.Router();
// const prisma = new PrismaClient();

// // Set up multer with memory storage for streaming
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
// });

// // Ensure the 'uploads' directory exists for fallback
// const uploadDir = path.join(__dirname, 'Uploads');
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir);
// }

// // File validation function
// const validateFile = (file: Express.Multer.File): string => {
//   console.log('Validating file:', {
//     originalname: file.originalname,
//     mimetype: file.mimetype,
//     size: file.size,
//   });

//   let extension = file.originalname.split('.').pop()?.toLowerCase();
//   if (!extension && file.mimetype) {
//     const mimeToExt: { [key: string]: string } = {
//       'image/jpeg': 'jpg',
//       'image/png': 'png',
//       'image/gif': 'gif',
//       'image/webp': 'webp',
//       'video/mp4': 'mp4',
//       'video/x-matroska': 'mkv',
//       'video/webm': 'webm',
//       'video/x-msvideo': 'avi',
//       'application/pdf': 'pdf',
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
//       'text/plain': 'txt',
//     };
//     extension = mimeToExt[file.mimetype];
//   }

//   if (!extension) {
//     throw new Error('Unable to determine file extension');
//   }

//   const allowedExtensions = ['mp4', 'mkv', 'webm', 'avi', 'pdf', 'docx', 'txt', 'jpg', 'png', 'gif', 'webp'];
//   if (!allowedExtensions.includes(extension)) {
//     throw new Error(`Unsupported file type: ${extension}`);
//   }

//   return extension;
// };

// // Determine content type and category
// const getContentMetadata = (file: Express.Multer.File) => {
//   const extension = file.originalname.split('.').pop()?.toLowerCase() || file.mimetype.split('/')[1];
//   if (!extension) {
//     throw new Error('Unable to determine file extension for metadata');
//   }
//   if (['mp4', 'mkv', 'webm', 'avi'].includes(extension)) {
//     return { type: 'VIDEO' as const, category: 'LECTURES' as const };
//   } else if (extension === 'pdf') {
//     return { type: 'PDF' as const, category: 'NOTES' as const };
//   } else {
//     return { type: 'PDF' as const, category: 'RESOURCES' as const };
//   }
// };

// // Stream file to Cloudinary
// const uploadFile = async (file: Express.Multer.File, folder: string): Promise<string> => {
//   try {
//     console.log('Uploading to Cloudinary:', {
//       originalname: file.originalname,
//       mimetype: file.mimetype,
//     });
//     const stream = Readable.from(file.buffer);
//     const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
//       const uploadStream = cloudinary.uploader.upload_stream(
//         {
//           folder,
//           resource_type: file.mimetype.startsWith('video') ? 'video' : file.mimetype.startsWith('image') ? 'image' : 'raw',
//         },
//         (error, result) => {
//           if (error) reject(error);
//           else if (result) resolve(result);
//           else reject(new Error('No result from Cloudinary'));
//         }
//       );
//       stream.pipe(uploadStream);
//     });
//     return result.secure_url;
//   } catch (error) {
//     console.error('Cloudinary upload error:', error);
//     throw new Error('Error uploading file to Cloudinary');
//   }
// };

// // Get All Courses for a Teacher (Protected)
// router.get(
//   '/courses',
//   passport.authenticate('teacher-jwt', { session: false }),
//   async (req, res) => {
//     try {
//       const user = req.user as Teacher | undefined;
//       if (!user?.id) {
//         console.log('User not authenticated:', req.user);
//         return res.status(401).json({ error: 'User not authenticated' });
//       }

//       const courses = await prisma.course.findMany({
//         where: { teacherId: user.id },
//         select: {
//           id: true,
//           name: true,
//           thumbnailUrl: true,
//           price: true,
//         },
//       });

//       console.log('Courses fetched:', courses);
//       res.status(200).json(courses);
//     } catch (error: any) {
//       console.error('Fetch courses error:', error);
//       res.status(500).json({ error: error.message || 'Error fetching courses' });
//     }
//   }
// );

// // Get Cached Courses (Protected)
// router.get(
//   '/courses/cached',
//   passport.authenticate('teacher-jwt', { session: false }),
//   async (req, res) => {
//     try {
//       const user = req.user as Teacher | undefined;
//       if (!user?.id) {
//         console.log('User not authenticated:', req.user);
//         return res.status(401).json({ error: 'User not authenticated' });
//       }

//       const courses = courseCache.get(user.id) || [];
//       console.log('Cache hit: courses for teacher', user.id, courses);
//       res.status(200).json(courses);
//     } catch (error: any) {
//       console.error('Fetch cached courses error:', error);
//       res.status(500).json({ error: error.message || 'Error fetching cached courses' });
//     }
//   }
// );

// // Create Course (Protected)
// router.post(
//   '/courses',
//   passport.authenticate('teacher-jwt', { session: false }),
//   upload.single('thumbnailFile'),
//   async (req, res) => {
//     try {
//       const user = req.user as Teacher | undefined;
//       if (!user?.id) {
//         console.log('User not authenticated:', req.user);
//         return res.status(401).json({ error: 'User not authenticated' });
//       }

//       const { name, price } = req.body;
//       const thumbnailFile = req.file;

//       if (!name || !price) {
//         return res.status(400).json({ error: 'Name and price are required' });
//       }

//       let thumbnailUrl: string | undefined;
//       if (thumbnailFile) {
//         const extension = validateFile(thumbnailFile);
//         console.log('Thumbnail file validated, extension:', extension);
//         thumbnailUrl = await uploadFile(thumbnailFile, 'course_thumbnails');
//       }

//       const course = await prisma.course.create({
//         data: {
//           name: name.toString(),
//           price: parseFloat(price.toString()) || 0,
//           thumbnailUrl,
//           teacher: { connect: { id: user.id } },
//         },
//       });

//       // Update cache
//       const courses = courseCache.get(user.id) || [];
//       courses.push({ id: course.id, name: course.name, thumbnailUrl: course.thumbnailUrl, price: course.price });
//       courseCache.set(user.id, courses);

//       console.log('Course created:', course);
//       res.status(200).json(course);
//     } catch (error: any) {
//       console.error('Course creation error:', error);
//       res.status(500).json({ error: error.message || 'Error creating course' });
//     }
//   }
// );

// // Create Division (Protected)
// router.post(
//   '/divisions',
//   passport.authenticate('teacher-jwt', { session: false }),
//   async (req, res) => {
//     try {
//       const user = req.user as Teacher | undefined;
//       if (!user?.id) {
//         console.log('User not authenticated:', req.user);
//         return res.status(401).json({ error: 'User not authenticated' });
//       }

//       const { courseId, title, order } = req.body;
//       if (!courseId || !title || order == null) {
//         return res.status(400).json({ error: 'Missing required fields' });
//       }

//       // Verify teacher owns the course
//       const course = await prisma.course.findUnique({
//         where: { id: parseInt(courseId) },
//         select: { teacherId: true },
//       });
//       if (!course || course.teacherId !== user.id) {
//         return res.status(403).json({ error: 'Unauthorized' });
//       }

//       // Check for existing division
//       const existingDivision = await prisma.division.findFirst({
//         where: {
//           courseId: parseInt(courseId),
//           title,
//           order: parseInt(order),
//         },
//       });
//       if (existingDivision) {
//         return res.status(409).json({ error: 'Division with same title and order already exists' });
//       }

//       const division = await prisma.division.create({
//         data: {
//           title,
//           order: parseInt(order),
//           course: { connect: { id: parseInt(courseId) } },
//         },
//       });

//       // Update cache
//       const divisions = divisionCache.get(parseInt(courseId)) || [];
//       divisions.push({ id: division.id, title: division.title, order: division.order });
//       divisionCache.set(parseInt(courseId), divisions);

//       console.log('Division created:', division);
//       res.status(200).json(division);
//     } catch (error: any) {
//       console.error('Division creation error:', error);
//       res.status(500).json({ error: error.message || 'Error creating division' });
//     }
//   }
// );

// // Get Divisions for a Course (Protected)
// router.get(
//   '/divisions',
//   passport.authenticate('teacher-jwt', { session: false }),
//   async (req, res) => {
//     try {
//       const user = req.user as Teacher | undefined;
//       if (!user?.id) {
//         console.log('User not authenticated:', req.user);
//         return res.status(401).json({ error: 'User not authenticated' });
//       }

//       const { courseId } = req.query;
//       if (!courseId) {
//         return res.status(400).json({ error: 'Course ID is required' });
//       }

//       // Verify teacher owns the course
//       const course = await prisma.course.findUnique({
//         where: { id: parseInt(courseId as string) },
//         select: { teacherId: true },
//       });
//       if (!course || course.teacherId !== user.id) {
//         return res.status(403).json({ error: 'Unauthorized' });
//       }

//       const divisions = await prisma.division.findMany({
//         where: { courseId: parseInt(courseId as string) },
//         orderBy: { order: 'asc' },
//       });

//       console.log('Divisions fetched:', divisions);
//       res.status(200).json(divisions);
//     } catch (error: any) {
//       console.error('Fetch divisions error:', error);
//       res.status(500).json({ error: error.message || 'Error fetching divisions' });
//     }
//   }
// );

// // Get Cached Divisions (Protected)
// router.get(
//   '/divisions/cached',
//   passport.authenticate('teacher-jwt', { session: false }),
//   async (req, res) => {
//     try {
//       const user = req.user as Teacher | undefined;
//       if (!user?.id) {
//         console.log('User not authenticated:', req.user);
//         return res.status(401).json({ error: 'User not authenticated' });
//       }

//       const { courseId } = req.query;
//       if (!courseId) {
//         return res.status(400).json({ error: 'Course ID is required' });
//       }

//       // Verify teacher owns the course
//       const course = await prisma.course.findUnique({
//         where: { id: parseInt(courseId as string) },
//         select: { teacherId: true },
//       });
//       if (!course || course.teacherId !== user.id) {
//         return res.status(403).json({ error: 'Unauthorized' });
//       }

//       const divisions = divisionCache.get(parseInt(courseId as string)) || [];
//       console.log('Cache hit: divisions for course', courseId, divisions);
//       res.status(200).json(divisions);
//     } catch (error: any) {
//       console.error('Fetch cached divisions error:', error);
//       res.status(500).json({ error: error.message || 'Error fetching cached divisions' });
//     }
//   }
// );

// // Create Content Batch (Protected)
// router.post(
//   '/content/batch',
//   passport.authenticate('teacher-jwt', { session: false }),
//   upload.array('files'),
//   async (req, res) => {
//     try {
//       const user = req.user as Teacher | undefined;
//       if (!user?.id) {
//         console.log('User not authenticated:', req.user);
//         return res.status(401).json({ error: 'User not authenticated' });
//       }

//       const { divisionId, titles, durations } = req.body;
//       const files = req.files as Express.Multer.File[];

//       if (!divisionId || !files || files.length === 0) {
//         return res.status(400).json({ error: 'Division ID and files are required' });
//       }

//       // Verify teacher owns the division's course
//       const division = await prisma.division.findUnique({
//         where: { id: parseInt(divisionId) },
//         include: { course: { select: { teacherId: true } } },
//       });
//       if (!division || division.course.teacherId !== user.id) {
//         return res.status(403).json({ error: 'Unauthorized' });
//       }

//       const contents = [];
//       for (let i = 0; i < files.length; i++) {
//         const file = files[i];
//         const extension = validateFile(file);
//         console.log('Content file validated, extension:', extension);

//         const title = Array.isArray(titles) ? titles[i] : titles || file.originalname;
//         const duration = Array.isArray(durations) ? parseInt(durations[i] || '0') : parseInt(durations || '0');
//         const { type, category } = getContentMetadata(file);
//         const fileUrl = await uploadFile(file, `course_content/${type.toLowerCase()}`);

//         const content = await prisma.content.create({
//           data: {
//             title,
//             type,
//             category,
//             fileUrl,
//             duration: duration || undefined,
//             division: { connect: { id: parseInt(divisionId) } },
//           },
//         });
//         contents.push(content);

//         // Update cache
//         const cachedContents = contentCache.get(parseInt(divisionId)) || [];
//         cachedContents.push({
//           id: content.id,
//           title: content.title,
//           type: content.type,
//           category: content.category,
//           fileUrl: content.fileUrl,
//           duration: content.duration,
//         });
//         contentCache.set(parseInt(divisionId), cachedContents);
//       }

//       console.log('Content batch created:', contents);
//       res.status(200).json(contents);
//     } catch (error: any) {
//       console.error('Content batch creation error:', error);
//       res.status(500).json({ error: error.message || 'Error creating content' });
//     }
//   }
// );

// // Get Contents for a Division (Protected)
// router.get(
//   '/content',
//   passport.authenticate('teacher-jwt', { session: false }),
//   async (req, res) => {
//     try {
//       const user = req.user as Teacher | undefined;
//       if (!user?.id) {
//         console.log('User not authenticated:', req.user);
//         return res.status(401).json({ error: 'User not authenticated' });
//       }

//       const { divisionId } = req.query;
//       if (!divisionId) {
//         return res.status(400).json({ error: 'Division ID is required' });
//       }

//       // Verify teacher owns the division's course
//       const division = await prisma.division.findUnique({
//         where: { id: parseInt(divisionId as string) },
//         include: { course: { select: { teacherId: true } } },
//       });
//       if (!division || division.course.teacherId !== user.id) {
//         return res.status(403).json({ error: 'Unauthorized' });
//       }

//       const contents = await prisma.content.findMany({
//         where: { divisionId: parseInt(divisionId as string) },
//         orderBy: { createdAt: 'asc' },
//       });

//       console.log('Contents fetched:', contents);
//       res.status(200).json(contents);
//     } catch (error: any) {
//       console.error('Fetch contents error:', error);
//       res.status(500).json({ error: error.message || 'Error fetching contents' });
//     }
//   }
// );

// // Get Cached Contents (Protected)
// router.get(
//   '/content/cached',
//   passport.authenticate('teacher-jwt', { session: false }),
//   async (req, res) => {
//     try {
//       const user = req.user as Teacher | undefined;
//       if (!user?.id) {
//         console.log('User not authenticated:', req.user);
//         return res.status(401).json({ error: 'User not authenticated' });
//       }

//       const { divisionId } = req.query;
//       if (!divisionId) {
//         return res.status(400).json({ error: 'Division ID is required' });
//       }

//       // Verify teacher owns the division's course
//       const division = await prisma.division.findUnique({
//         where: { id: parseInt(divisionId as string) },
//         include: { course: { select: { teacherId: true } } },
//       });
//       if (!division || division.course.teacherId !== user.id) {
//         return res.status(403).json({ error: 'Unauthorized' });
//       }

//       const contents = contentCache.get(parseInt(divisionId as string)) || [];
//       console.log('Cache hit: contents for division', divisionId, contents);
//       res.status(200).json(contents);
//     } catch (error: any) {
//       console.error('Fetch cached contents error:', error);
//       res.status(500).json({ error: error.message || 'Error fetching cached contents' });
//     }
//   }
// );

// export default router;
// export { courseCache, divisionCache, contentCache }; // Export caches for cronJob.ts






// server/src/routes/courseRoutes.ts
import express from 'express';
import { PrismaClient, Teacher } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import passport from 'passport';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const courseCache = new Map<number, any[]>();
const divisionCache = new Map<number, any[]>();
const contentCache = new Map<number, any[]>();

const router = express.Router();
const prisma = new PrismaClient();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

const uploadDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const validateFile = (file: Express.Multer.File): string => {
  console.log('Validating file:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  let extension = file.originalname.split('.').pop()?.toLowerCase();
  if (!extension && file.mimetype) {
    const mimeToExt: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/x-matroska': 'mkv',
      'video/webm': 'webm',
      'video/x-msvideo': 'avi',
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt',
    };
    extension = mimeToExt[file.mimetype];
  }

  if (!extension) {
    throw new Error('Unable to determine file extension');
  }

  const allowedExtensions = ['mp4', 'mkv', 'webm', 'avi', 'pdf', 'docx', 'txt', 'jpg', 'png', 'gif', 'webp'];
  if (!allowedExtensions.includes(extension)) {
    throw new Error(`Unsupported file type: ${extension}`);
  }

  return extension;
};

const getContentMetadata = (file: Express.Multer.File) => {
  const extension = file.originalname.split('.').pop()?.toLowerCase() || file.mimetype.split('/')[1];
  if (!extension) {
    throw new Error('Unable to determine file extension for metadata');
  }
  if (['mp4', 'mkv', 'webm', 'avi'].includes(extension)) {
    return { type: 'VIDEO' as const, category: 'LECTURES' as const };
  } else if (extension === 'pdf') {
    return { type: 'PDF' as const, category: 'NOTES' as const };
  } else {
    return { type: 'PDF' as const, category: 'RESOURCES' as const };
  }
};

const uploadFile = async (file: Express.Multer.File, folder: string): Promise<string> => {
  try {
    console.log('Uploading to Cloudinary:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
    const stream = Readable.from(file.buffer);
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: file.mimetype.startsWith('video') ? 'video' : file.mimetype.startsWith('image') ? 'image' : 'raw',
        },
        (error, result) => {
          if (error) reject(error);
          else if (result) resolve(result);
          else reject(new Error('No result from Cloudinary'));
        }
      );
      stream.pipe(uploadStream);
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Error uploading file to Cloudinary');
  }
};

router.get(
  '/courses',
  passport.authenticate('teacher-jwt', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as Teacher | undefined;
      if (!user?.id) {
        console.log('User not authenticated:', req.user);
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const courses = await prisma.course.findMany({
        where: { teacherId: user.id },
        select: {
          id: true,
          name: true,
          thumbnailUrl: true,
          price: true,
        },
      });

      console.log(`Courses fetched for teacher ${user.id}:`, courses);
      res.status(200).json(courses);
    } catch (error: any) {
      console.error('Fetch courses error:', error);
      res.status(500).json({ error: error.message || 'Error fetching courses' });
    }
  }
);

router.get(
  '/courses/cached',
  passport.authenticate('teacher-jwt', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as Teacher | undefined;
      if (!user?.id) {
        console.log('User not authenticated:', req.user);
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const courses = courseCache.get(user.id) || [];
      console.log(`Cache hit: courses for teacher ${user.id}:`, courses);
      res.status(200).json(courses);
    } catch (error: any) {
      console.error('Fetch cached courses error:', error);
      res.status(500).json({ error: error.message || 'Error fetching cached courses' });
    }
  }
);

router.post(
  '/courses',
  passport.authenticate('teacher-jwt', { session: false }),
  upload.single('thumbnailFile'),
  async (req, res) => {
    try {
      const user = req.user as Teacher | undefined;
      if (!user?.id) {
        console.log('User not authenticated:', req.user);
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { name, price } = req.body;
      const thumbnailFile = req.file;

      if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required' });
      }

      let thumbnailUrl: string | undefined;
      if (thumbnailFile) {
        const extension = validateFile(thumbnailFile);
        console.log('Thumbnail file validated, extension:', extension);
        thumbnailUrl = await uploadFile(thumbnailFile, 'course_thumbnails');
      }

      const course = await prisma.course.create({
        data: {
          name: name.toString(),
          price: parseFloat(price.toString()) || 0,
          thumbnailUrl,
          teacher: { connect: { id: user.id } },
        },
      });

      const courses = courseCache.get(user.id) || [];
      courses.push({ id: course.id, name: course.name, thumbnailUrl: course.thumbnailUrl, price: course.price });
      courseCache.set(user.id, courses);

      console.log('Course created:', course);
      res.status(200).json(course);
    } catch (error: any) {
      console.error('Course creation error:', error);
      res.status(500).json({ error: error.message || 'Error creating course' });
    }
  }
);

router.post(
  '/divisions',
  passport.authenticate('teacher-jwt', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as Teacher | undefined;
      if (!user?.id) {
        console.log('User not authenticated:', req.user);
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { courseId, title, order } = req.body;
      if (!courseId || !title || order == null) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const course = await prisma.course.findUnique({
        where: { id: parseInt(courseId) },
        select: { teacherId: true },
      });
      if (!course || course.teacherId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const existingDivision = await prisma.division.findFirst({
        where: {
          courseId: parseInt(courseId),
          title,
          order: parseInt(order),
        },
      });
      if (existingDivision) {
        return res.status(409).json({ error: 'Division with same title and order already exists' });
      }

      const division = await prisma.division.create({
        data: {
          title,
          order: parseInt(order),
          course: { connect: { id: parseInt(courseId) } },
        },
      });

      const divisions = divisionCache.get(parseInt(courseId)) || [];
      divisions.push({ id: division.id, title: division.title, order: division.order });
      divisionCache.set(parseInt(courseId), divisions);

      console.log('Division created:', division);
      res.status(200).json(division);
    } catch (error: any) {
      console.error('Division creation error:', error);
      res.status(500).json({ error: error.message || 'Error creating division' });
    }
  }
);

router.get(
  '/divisions',
  passport.authenticate('teacher-jwt', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as Teacher | undefined;
      if (!user?.id) {
        console.log('User not authenticated:', req.user);
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { courseId } = req.query;
      if (!courseId) {
        return res.status(400).json({ error: 'Course ID is required' });
      }

      const course = await prisma.course.findUnique({
        where: { id: parseInt(courseId as string) },
        select: { teacherId: true },
      });
      if (!course || course.teacherId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const divisions = await prisma.division.findMany({
        where: { courseId: parseInt(courseId as string) },
        orderBy: { order: 'asc' },
      });

      console.log('Divisions fetched:', divisions);
      res.status(200).json(divisions);
    } catch (error: any) {
      console.error('Fetch divisions error:', error);
      res.status(500).json({ error: error.message || 'Error fetching divisions' });
    }
  }
);

router.get(
  '/divisions/cached',
  passport.authenticate('teacher-jwt', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as Teacher | undefined;
      if (!user?.id) {
        console.log('User not authenticated:', req.user);
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { courseId } = req.query;
      if (!courseId) {
        return res.status(400).json({ error: 'Course ID is required' });
      }

      const course = await prisma.course.findUnique({
        where: { id: parseInt(courseId as string) },
        select: { teacherId: true },
      });
      if (!course || course.teacherId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const divisions = divisionCache.get(parseInt(courseId as string)) || [];
      console.log('Cache hit: divisions for course', courseId, divisions);
      res.status(200).json(divisions);
    } catch (error: any) {
      console.error('Fetch cached divisions error:', error);
      res.status(500).json({ error: error.message || 'Error fetching cached divisions' });
    }
  }
);

router.post(
  '/content/batch',
  passport.authenticate('teacher-jwt', { session: false }),
  upload.array('files'),
  async (req, res) => {
    try {
      const user = req.user as Teacher | undefined;
      if (!user?.id) {
        console.log('User not authenticated:', req.user);
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { divisionId, titles, durations } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!divisionId || !files || files.length === 0) {
        return res.status(400).json({ error: 'Division ID and files are required' });
      }

      const division = await prisma.division.findUnique({
        where: { id: parseInt(divisionId) },
        include: { course: { select: { teacherId: true } } },
      });
      if (!division || division.course.teacherId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const contents = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const extension = validateFile(file);
        console.log('Content file validated, extension:', extension);

        const title = Array.isArray(titles) ? titles[i] : titles || file.originalname;
        const duration = Array.isArray(durations) ? parseInt(durations[i] || '0') : parseInt(durations || '0');
        const { type, category } = getContentMetadata(file);
        const fileUrl = await uploadFile(file, `course_content/${type.toLowerCase()}`);

        const content = await prisma.content.create({
          data: {
            title,
            type,
            category,
            fileUrl,
            duration: duration || undefined,
            division: { connect: { id: parseInt(divisionId) } },
          },
        });
        contents.push(content);

        const cachedContents = contentCache.get(parseInt(divisionId)) || [];
        cachedContents.push({
          id: content.id,
          title: content.title,
          type: content.type,
          category: content.category,
          fileUrl: content.fileUrl,
          duration: content.duration,
        });
        contentCache.set(parseInt(divisionId), cachedContents);
      }

      console.log('Content batch created:', contents);
      res.status(200).json(contents);
    } catch (error: any) {
      console.error('Content batch creation error:', error);
      res.status(500).json({ error: error.message || 'Error creating content' });
    }
  }
);

router.get(
  '/content',
  passport.authenticate('teacher-jwt', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as Teacher | undefined;
      if (!user?.id) {
        console.log('User not authenticated:', req.user);
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { divisionId } = req.query;
      if (!divisionId) {
        return res.status(400).json({ error: 'Division ID is required' });
      }

      const division = await prisma.division.findUnique({
        where: { id: parseInt(divisionId as string) },
        include: { course: { select: { teacherId: true } } },
      });
      if (!division || division.course.teacherId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const contents = await prisma.content.findMany({
        where: { divisionId: parseInt(divisionId as string) },
        orderBy: { createdAt: 'asc' },
      });

      console.log('Contents fetched:', contents);
      res.status(200).json(contents);
    } catch (error: any) {
      console.error('Fetch contents error:', error);
      res.status(500).json({ error: error.message || 'Error fetching contents' });
    }
  }
);

router.get(
  '/content/cached',
  passport.authenticate('teacher-jwt', { session: false }),
  async (req, res) => {
    try {
      const user = req.user as Teacher | undefined;
      if (!user?.id) {
        console.log('User not authenticated:', req.user);
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { divisionId } = req.query;
      if (!divisionId) {
        return res.status(400).json({ error: 'Division ID is required' });
      }

      const division = await prisma.division.findUnique({
        where: { id: parseInt(divisionId as string) },
        include: { course: { select: { teacherId: true } } },
      });
      if (!division || division.course.teacherId !== user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const contents = contentCache.get(parseInt(divisionId as string)) || [];
      console.log('Cache hit: contents for division', divisionId, contents);
      res.status(200).json(contents);
    } catch (error: any) {
      console.error('Fetch cached contents error:', error);
      res.status(500).json({ error: error.message || 'Error fetching cached contents' });
    }
  }
);

export default router;
export { courseCache, divisionCache, contentCache };