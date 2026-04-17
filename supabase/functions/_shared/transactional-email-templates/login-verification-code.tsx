/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Keenly"

interface LoginCodeProps {
  code?: string
}

const LoginVerificationCodeEmail = ({ code = 'A4F2B1' }: LoginCodeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} login code: {code}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your login code</Heading>
        <Text style={text}>
          Use the code below to finish logging in to {SITE_NAME}. This code expires in 5 minutes.
        </Text>
        <Section style={codeBox}>
          <Text style={codeText}>{code}</Text>
        </Section>
        <Text style={muted}>
          If you didn't try to log in, you can safely ignore this email — your account is still secure.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: LoginVerificationCodeEmail,
  subject: 'Your Keenly login code',
  displayName: 'Login verification code',
  previewData: { code: 'A4F2B1' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '480px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.5', margin: '0 0 20px' }
const codeBox = {
  backgroundColor: '#f1f5f9',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}
const codeText = {
  fontSize: '32px',
  fontWeight: 'bold',
  letterSpacing: '0.4em',
  color: '#0d9488',
  fontFamily: 'Courier New, monospace',
  margin: 0,
}
const muted = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 24px' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: 0 }
