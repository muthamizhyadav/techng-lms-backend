/**
 * Course curriculum helpers.
 *
 * Course modules/lessons are stored as embedded objects. The Course schema has
 * `_id: false`, which also disables generated `_id`s on those embedded objects,
 * so lessons loaded from older courses often have no identifier. The player and
 * the progress endpoints need a stable lesson key, so we derive one from the
 * module/lesson position when an explicit id is missing.
 *
 * The same helper is used when serving a course and when recording progress, so
 * both sides always agree on the key.
 */

const toPlainObject = (value: any): Record<string, any> => {
  if (!value) return {};
  return typeof value.toObject === 'function' ? value.toObject() : { ...value };
};

export const getModuleKey = (
  module: Record<string, any> | undefined,
  moduleIndex: number,
): string => {
  const plain = toPlainObject(module);
  const base =
    plain._id ?? plain.id ?? `module-${plain.order ?? moduleIndex + 1}`;
  return String(base);
};

export const getLessonKey = (
  module: Record<string, any> | undefined,
  lesson: Record<string, any> | undefined,
  moduleIndex: number,
  lessonIndex: number,
): string => {
  const plain = toPlainObject(lesson);
  const base =
    plain._id ??
    plain.id ??
    `${getModuleKey(module, moduleIndex)}-lesson-${plain.order ?? lessonIndex + 1}`;
  return String(base);
};

/**
 * Returns a copy of the curriculum where every module and lesson has an `_id`.
 * Existing ids are preserved; missing ones are derived deterministically.
 */
export const withCurriculumIds = (modules: any[] = []): any[] => {
  return (modules || []).map((module, moduleIndex) => {
    const moduleObj = toPlainObject(module);
    const moduleKey = getModuleKey(moduleObj, moduleIndex);

    const lessons = (moduleObj.lessons || []).map(
      (lesson: any, lessonIndex: number) => {
        const lessonObj = toPlainObject(lesson);
        return {
          ...lessonObj,
          _id: getLessonKey(moduleObj, lessonObj, moduleIndex, lessonIndex),
        };
      },
    );

    return {
      ...moduleObj,
      _id: moduleKey,
      lessons,
    };
  });
};
