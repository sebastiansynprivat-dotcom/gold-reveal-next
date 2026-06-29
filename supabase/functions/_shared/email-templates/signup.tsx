/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
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
  button,
  link,
  footer,
  footerLink,
} from './_shared-styles.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Bestätige deine E-Mail-Adresse für {siteName}</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Section style={brandBar}>
          <Text style={brandText}>SHEX DASHBOARD</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Willkommen an Bord</Heading>
          <Text style={text}>
            Schön, dass du dabei bist. Bitte bestätige kurz deine E-Mail-Adresse{' '}
            <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>,
            damit dein Zugang vollständig aktiviert wird.
          </Text>
          <Button style={button} href={confirmationUrl}>
            E-Mail bestätigen
          </Button>
          <Hr style={{ borderColor: '#2A2410', margin: '32px 0 16px' }} />
          <Text style={footer}>
            Du hast dich nicht registriert? Dann kannst du diese E-Mail einfach ignorieren.
            <br />
            <Link href={siteUrl} style={footerLink}>{siteName}</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
