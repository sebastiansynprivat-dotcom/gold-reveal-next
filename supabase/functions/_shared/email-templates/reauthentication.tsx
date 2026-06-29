/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import {
  main,
  outerContainer,
  card,
  brandBar,
  brandText,
  h1,
  text,
  code,
  footer,
} from './_shared-styles.ts'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Bestätigungscode</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Section style={brandBar}>
          <Text style={brandText}>SHEX DASHBOARD</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Identität bestätigen</Heading>
          <Text style={text}>
            Verwende den folgenden Code, um deine Identität zu bestätigen:
          </Text>
          <Text style={code}>{token}</Text>
          <Hr style={{ borderColor: '#2A2410', margin: '16px 0' }} />
          <Text style={footer}>
            Der Code läuft in Kürze ab. Falls du diese Bestätigung nicht
            angefordert hast, ignoriere diese E-Mail.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
