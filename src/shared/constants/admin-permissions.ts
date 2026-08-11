export const ADMIN_PERMISSIONS = {
  COURSE: {
    CREATE: 'course.create',
    EDIT: 'course.edit',
    DELETE: 'course.delete',
    VIEW: 'course.view',
  },
  STUDENT: {
    VIEW: 'student.view',
    EDIT: 'student.edit',
    SUSPEND: 'student.suspend',
    DELETE: 'student.delete',
  },
  BATCH: {
    CREATE: 'batch.create',
    EDIT: 'batch.edit',
    DELETE: 'batch.delete',
    VIEW: 'batch.view',
  },
  PAYMENT: {
    VIEW: 'payment.view',
    REFUND: 'payment.refund',
    CREATE: 'payment.create',
  },
  TRAINER: {
    CREATE: 'trainer.create',
    EDIT: 'trainer.edit',
    DELETE: 'trainer.delete',
    VIEW: 'trainer.view',
  },
  ADMIN: {
    CREATE: 'admin.create',
    EDIT: 'admin.edit',
    DELETE: 'admin.delete',
    VIEW: 'admin.view',
  },
  REPORT: {
    VIEW: 'report.view',
    EXPORT: 'report.export',
  },
  SETTINGS: {
    MANAGE: 'settings.manage',
  },
} as const;