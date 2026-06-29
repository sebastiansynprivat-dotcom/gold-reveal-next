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
} from './_shared-styles.ts'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>E-Mail-Änderung für {siteName} bestätigen</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Section style={brandBar}>
          <Text style={brandText}>SHEX DASHBOARD</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>E-Mail-Adresse ändern</Heading>
          <Text style={text}>
            Du möchtest deine E-Mail-Adresse für {siteName} ändern von{' '}
            <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link>{' '}
            auf{' '}
            <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
            Bitte bestätige die Änderung über den Button unten.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Änderung bestätigen
          </Button>
          <Hr style={{ borderColor: '#2A2410', margin: '32px 0 16px' }} />
          <Text style={footer}>
            Du hast diese Änderung nicht angefordert? Dann sichere bitte
            umgehend deinen Account.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
