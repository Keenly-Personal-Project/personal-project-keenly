/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as loginVerificationCode } from './login-verification-code.tsx'
import { template as passwordResetCode } from './password-reset-code.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'login-verification-code': loginVerificationCode,
  'password-reset-code': passwordResetCode,
}
