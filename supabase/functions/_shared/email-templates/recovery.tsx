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
  footer,
} from './_shared-styles.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Passwort zurücksetzen für {siteName}</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Section style={brandBar}>
          <Text style={brandText}>SHEX DASHBOARD</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Passwort zurücksetzen</Heading>
          <Text style={text}>
            Wir haben eine Anfrage erhalten, dein Passwort zurückzusetzen.
            Klicke auf den Button unten, um ein neues Passwort zu wählen.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Neues Passwort wählen
          </Button>
          <Hr style={{ borderColor: '#2A2410', margin: '32px 0 16px' }} />
          <Text style={footer}>
            Du hast keine Zurücksetzung angefordert? Dann ignoriere diese E-Mail
            einfach – dein Passwort bleibt unverändert.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
